const express = require('express');
const router = express.Router();
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const db = require('../db/database');
const { requireAuth: auth } = require('../middleware/auth');
const { uploadPhoto } = require('../middleware/upload');

// GET /api/organizers — public
router.get('/', (req, res) => {
  const rows = db.prepare('SELECT * FROM organizers ORDER BY sort_order ASC').all();
  res.json(rows);
});

// POST /api/organizers — admin: create
router.post('/', auth, uploadPhoto.single('photo'), (req, res) => {
  const { name, title, description, is_faculty, linkedin, github, twitter, instagram, facebook } = req.body;
  if (!name || !title) return res.status(400).json({ error: 'Name and title are required' });

  const id = uuidv4();
  const photo = req.file ? req.file.filename : null;
  const maxOrder = db.prepare('SELECT MAX(sort_order) as m FROM organizers').get();
  const sort_order = (maxOrder?.m ?? 0) + 1;

  db.prepare(
    'INSERT INTO organizers (id, name, title, description, photo, is_faculty, sort_order, linkedin, github, twitter, instagram, facebook) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(id, name, title, description || '', photo, is_faculty === 'true' ? 1 : 0, sort_order, linkedin || null, github || null, twitter || null, instagram || null, facebook || null);

  res.json({ id, name, title, description, photo, is_faculty, sort_order, linkedin, github, twitter, instagram, facebook });
});

// POST /api/organizers/reorder — admin
router.post('/reorder', auth, (req, res) => {
  const { mapping } = req.body; // [{ id: '...', sort_order: 1 }, ...]
  if (!Array.isArray(mapping)) return res.status(400).json({ error: 'Invalid mapping' });

  const updateStmt = db.prepare('UPDATE organizers SET sort_order = ? WHERE id = ?');
  const transaction = db.transaction((items) => {
    for (const item of items) {
      updateStmt.run(item.sort_order, item.id);
    }
  });

  try {
    transaction(mapping);
    res.json({ success: true });
  } catch (error) {
    console.error('Reorder failed:', error);
    res.status(500).json({ error: 'Reorder failed' });
  }
});

// PUT /api/organizers/:id — admin: update
router.put('/:id', auth, uploadPhoto.single('photo'), (req, res) => {
  const { id } = req.params;
  const { name, title, description, is_faculty, sort_order, linkedin, github, twitter, instagram, facebook } = req.body;

  const existing = db.prepare('SELECT * FROM organizers WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Organizer not found' });

  let photo = existing.photo;
  if (req.file) {
    if (existing.photo) {
      const oldPath = path.join(__dirname, '../../uploads/photos', existing.photo);
      if (fs.existsSync(oldPath)) fs.unlinkSync(oldPath);
    }
    photo = req.file.filename;
  }

  db.prepare(
    'UPDATE organizers SET name=?, title=?, description=?, photo=?, is_faculty=?, sort_order=?, linkedin=?, github=?, twitter=?, instagram=?, facebook=? WHERE id=?'
  ).run(
    name ?? existing.name,
    title ?? existing.title,
    description ?? existing.description,
    photo,
    is_faculty !== undefined ? (is_faculty === 'true' ? 1 : 0) : existing.is_faculty,
    sort_order ?? existing.sort_order,
    linkedin !== undefined ? linkedin || null : existing.linkedin,
    github !== undefined ? github || null : existing.github,
    twitter !== undefined ? twitter || null : existing.twitter,
    instagram !== undefined ? instagram || null : existing.instagram,
    facebook !== undefined ? facebook || null : existing.facebook,
    id
  );

  res.json({ success: true });
});

// DELETE /api/organizers/:id — admin
router.delete('/:id', auth, (req, res) => {
  const { id } = req.params;
  const existing = db.prepare('SELECT * FROM organizers WHERE id = ?').get(id);
  if (!existing) return res.status(404).json({ error: 'Organizer not found' });

  if (existing.photo) {
    const photoPath = path.join(__dirname, '../../uploads/photos', existing.photo);
    if (fs.existsSync(photoPath)) fs.unlinkSync(photoPath);
  }

  db.prepare('DELETE FROM organizers WHERE id = ?').run(id);
  res.json({ success: true });
});

module.exports = router;
