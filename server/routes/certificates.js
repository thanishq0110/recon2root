const express = require('express');
const path = require('path');
const fs = require('fs');
const db = require('../db/database');
const { requireAuth } = require('../middleware/auth');
const { uploadCertificate, uploadCsv } = require('../middleware/upload');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

router.get('/search', (req, res) => {
  const { name } = req.query;
  if (!name || name.trim().length < 2) {
    return res.status(400).json({ error: 'Please enter at least 2 characters to search' });
  }

  const query = `%${name.trim().toLowerCase()}%`;
  const results = db.prepare(
    'SELECT id, participant_name FROM certificates WHERE participant_name_lower LIKE ? LIMIT 20'
  ).all(query);

  res.json({ results });
});

router.get('/:id/download', (req, res) => {
  const cert = db.prepare('SELECT * FROM certificates WHERE id = ?').get(req.params.id);
  if (!cert) return res.status(404).json({ error: 'Certificate not found' });

  const filePath = path.join(__dirname, '../../uploads/certificates', cert.filename);
  if (!fs.existsSync(filePath)) {
    return res.status(404).json({ error: 'Certificate file not found on server' });
  }

  db.prepare('UPDATE certificates SET downloaded_count = downloaded_count + 1 WHERE id = ?').run(cert.id);

  const downloadName = `Recon2Root_Certificate_${cert.participant_name.replace(/\s+/g, '_')}.pdf`;
  res.download(filePath, downloadName);
});

// Bulk upload: multipart form with CSV file + multiple PDFs
// CSV format: name,filename (filename must match uploaded PDF filename)
router.post('/bulk-upload', requireAuth, uploadCertificate.array('pdfs', 100), (req, res) => {
  if (!req.body.csv) {
    return res.status(400).json({ error: 'CSV data is required in the "csv" field' });
  }

  const lines = req.body.csv.split('\n').map((l) => l.trim()).filter(Boolean);
  const fileMap = {};
  for (const file of req.files || []) {
    fileMap[file.originalname.toLowerCase()] = file.filename;
  }

  const insert = db.prepare(`
    INSERT OR REPLACE INTO certificates (id, participant_name, participant_name_lower, filename)
    VALUES (?, ?, ?, ?)
  `);

  const insertMany = db.transaction((rows) => {
    let count = 0;
    for (const line of rows) {
      const [name, origFilename] = line.split(',').map((s) => s.trim());
      if (!name || !origFilename) continue;
      const storedFilename = fileMap[origFilename.toLowerCase()];
      if (!storedFilename) continue;
      insert.run(uuidv4(), name, name.toLowerCase(), storedFilename);
      count++;
    }
    return count;
  });

  const count = insertMany(lines);
  res.json({ success: true, imported: count });
});

// Single certificate upload
router.post('/upload', requireAuth, uploadCertificate.single('pdf'), (req, res) => {
  const { participant_name } = req.body;
  if (!participant_name?.trim()) {
    return res.status(400).json({ error: 'Participant name is required' });
  }
  if (!req.file) {
    return res.status(400).json({ error: 'PDF file is required' });
  }

  db.prepare(`
    INSERT OR REPLACE INTO certificates (id, participant_name, participant_name_lower, filename)
    VALUES (?, ?, ?, ?)
  `).run(uuidv4(), participant_name.trim(), participant_name.trim().toLowerCase(), req.file.filename);

  res.json({ success: true });
});

router.get('/stats', requireAuth, (_req, res) => {
  const total = db.prepare('SELECT COUNT(*) as count FROM certificates').get();
  const downloads = db.prepare('SELECT SUM(downloaded_count) as total FROM certificates').get();
  res.json({ total: total.count, totalDownloads: downloads.total || 0 });
});

module.exports = router;
