const express = require('express');
const db = require('../db/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', (_req, res) => {
  const rows = db.prepare('SELECT key, value FROM content').all();
  const content = Object.fromEntries(rows.map((r) => [r.key, r.value]));
  res.json({ content });
});

router.put('/', requireAuth, (req, res) => {
  const { updates } = req.body;
  if (!updates || typeof updates !== 'object') {
    return res.status(400).json({ error: 'Updates object is required' });
  }

  const upsert = db.prepare(`
    INSERT INTO content (key, value, updated_at)
    VALUES (?, ?, CURRENT_TIMESTAMP)
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP
  `);

  const upsertMany = db.transaction((entries) => {
    for (const [key, value] of entries) {
      if (typeof value === 'string') upsert.run(key, value);
    }
  });

  upsertMany(Object.entries(updates));
  res.json({ success: true });
});

module.exports = router;
