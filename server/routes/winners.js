const express = require('express');
const db = require('../db/database');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/', (_req, res) => {
  const winners = db.prepare('SELECT * FROM winners ORDER BY rank ASC').all();
  res.json({ winners });
});

router.put('/', requireAuth, (req, res) => {
  const { winners } = req.body;

  if (!Array.isArray(winners) || winners.length === 0) {
    return res.status(400).json({ error: 'Winners array is required' });
  }

  const upsert = db.prepare(`
    INSERT INTO winners (rank, team_name, members, score, updated_at)
    VALUES (@rank, @team_name, @members, @score, CURRENT_TIMESTAMP)
    ON CONFLICT(rank) DO UPDATE SET
      team_name = excluded.team_name,
      members = excluded.members,
      score = excluded.score,
      updated_at = CURRENT_TIMESTAMP
  `);

  const upsertMany = db.transaction((items) => {
    for (const w of items) {
      if (![1, 2, 3].includes(w.rank)) continue;
      upsert.run({
        rank: w.rank,
        team_name: w.team_name?.trim() || '',
        members: w.members?.trim() || '',
        score: w.score?.trim() || '',
      });
    }
  });

  upsertMany(winners);
  res.json({ success: true });
});

module.exports = router;
