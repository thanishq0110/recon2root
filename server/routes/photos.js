const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('../db/database');
const { requireAuth } = require('../middleware/auth');
const { uploadPhoto } = require('../middleware/upload');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

router.get('/', (_req, res) => {
  const category = _req.query.category;
  const photos = category && category !== 'all'
    ? db.prepare('SELECT * FROM photos WHERE category = ? ORDER BY uploaded_at DESC').all(category)
    : db.prepare('SELECT * FROM photos ORDER BY uploaded_at DESC').all();
  res.json({ photos });
});

router.post('/upload', requireAuth, uploadPhoto.array('photos', 50), (req, res) => {
  if (!req.files || req.files.length === 0) {
    return res.status(400).json({ error: 'No files uploaded' });
  }

  const category = req.body.category?.trim() || 'general';
  const insert = db.prepare(
    'INSERT INTO photos (id, filename, original_name, category) VALUES (?, ?, ?, ?)'
  );

  const insertMany = db.transaction((files) => {
    for (const file of files) {
      insert.run(uuidv4(), file.filename, file.originalname, category);
    }
  });

  insertMany(req.files);
  res.json({ success: true, count: req.files.length });
});

router.delete('/:id', requireAuth, (req, res) => {
  const photo = db.prepare('SELECT * FROM photos WHERE id = ?').get(req.params.id);
  if (!photo) return res.status(404).json({ error: 'Photo not found' });

  const filePath = path.join(__dirname, '../../uploads/photos', photo.filename);
  if (fs.existsSync(filePath)) fs.unlinkSync(filePath);

  db.prepare('DELETE FROM photos WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
