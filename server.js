// npm install express cors sqlite3
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();

const app = express();
const db = new sqlite3.Database('./votes.db');

app.use(cors());
app.use(express.json());

// --- DB INIT ---
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS votes (
      fingerprint TEXT PRIMARY KEY,
      picks TEXT
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS stats (
      option INTEGER PRIMARY KEY,
      votes INTEGER
    )
  `);

  for (let i = 1; i <= 20; i++) {
    db.run(
      'INSERT OR IGNORE INTO stats(option, votes) VALUES (?, 0)',
      i
    );
  }
});

// --- VOTE ---
app.post('/vote', (req, res) => {
  const { fingerprint, picks } = req.body;

  // Validierung
  if (
    !fingerprint ||
    !Array.isArray(picks) ||
    picks.length < 1 ||
    picks.length > 3
  ) {
    return res.json({ ok: false, error: 'Invalid data' });
  }

  // Nur 1–20, keine Duplikate
  const cleanPicks = [...new Set(picks)].filter(
    p => Number.isInteger(p) && p >= 1 && p <= 20
  );

  if (cleanPicks.length === 0) {
    return res.json({ ok: false, error: 'Invalid picks' });
  }

  db.get(
    'SELECT fingerprint FROM votes WHERE fingerprint = ?',
    fingerprint,
    (err, row) => {
      if (row) {
        return sendStats(res, false);
      }

      db.run(
        'INSERT INTO votes(fingerprint, picks) VALUES (?, ?)',
        fingerprint,
        JSON.stringify(cleanPicks),
        () => {
          cleanPicks.forEach(opt => {
            db.run(
              'UPDATE stats SET votes = votes + 1 WHERE option = ?',
              opt
            );
          });

          sendStats(res, true);
        }
      );
    }
  );
});

// --- STATS ---
app.get('/stats', (req, res) => {
  sendStats(res, true);
});

// --- HELPER ---
function sendStats(res, ok) {
  db.all(
    'SELECT option, votes FROM stats ORDER BY option ASC',
    (err, rows) => {
      const stats = rows.map(r => r.votes);
      res.json({ ok, stats });
    }
  );
}

app.listen(5050, () =>
  console.log('✅ Vote server running on http://localhost:5050')
);
