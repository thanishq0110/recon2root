const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('../db/database');
const { requireAuth } = require('../middleware/auth');
const { uploadVideo } = require('../middleware/upload');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

router.get('/', (_req, res) => {
  const videos = db.prepare('SELECT * FROM videos ORDER BY uploaded_at DESC').all();
  res.json({ videos });
});

router.post('/upload', requireAuth, uploadVideo.single('video'), (req, res) => {
  const { title, type, youtube_url } = req.body;

  if (!title?.trim()) {
    return res.status(400).json({ error: 'Video title is required' });
  }

  if (type === 'youtube') {
    if (!youtube_url?.trim()) {
      return res.status(400).json({ error: 'YouTube URL is required' });
    }
    const id = uuidv4();
    db.prepare('INSERT INTO videos (id, title, type, source) VALUES (?, ?, ?, ?)').run(
      id, title.trim(), 'youtube', youtube_url.trim()
    );
    return res.json({ success: true, id });
  }

  if (!req.file) {
    return res.status(400).json({ error: 'Video file is required' });
  }

  const id = uuidv4();
  db.prepare('INSERT INTO videos (id, title, type, source) VALUES (?, ?, ?, ?)').run(
    id, title.trim(), 'upload', req.file.filename
  );
  res.json({ success: true, id });
});

router.delete('/:id', requireAuth, (req, res) => {
  const video = db.prepare('SELECT * FROM videos WHERE id = ?').get(req.params.id);
  if (!video) return res.status(404).json({ error: 'Video not found' });

  if (video.type === 'upload') {
    const filePath = path.join(__dirname, '../../uploads/videos', video.source);
    if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
  }

  db.prepare('DELETE FROM videos WHERE id = ?').run(req.params.id);
  res.json({ success: true });
});

module.exports = router;
