// npm install express cors sqlite3 crypto
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');

const app = express();
const db = new sqlite3.Database('./votes.db');

app.use(cors());
app.use(express.json());

// ==================
// KONFIGURATION
// ==================
const OPTIONS_COUNT = 20;

// ==================
// DATENBANK
// ==================
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS votes (
      personHash TEXT PRIMARY KEY,
      fingerprint TEXT,
      ipHash TEXT,
      userAgent TEXT,
      language TEXT,
      timezone TEXT,
      votedAt INTEGER
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS stats (
      option INTEGER PRIMARY KEY,
      votes INTEGER
    )
  `);

  for (let i = 1; i <= OPTIONS_COUNT; i++) {
    db.run(
      'INSERT OR IGNORE INTO stats(option, votes) VALUES (?, 0)',
      i
    );
  }
});

// ==================
// HELFER
// ==================
function sha256(data) {
  return crypto.createHash('sha256').update(data).digest('hex');
}

function getIp(req) {
  return (
    req.headers['x-forwarded-for']?.split(',')[0] ||
    req.socket.remoteAddress ||
    ''
  );
}

// ==================
// VOTE ENDPOINT
// ==================
app.post('/vote', (req, res) => {
  const { fingerprint, picks, lang, tz } = req.body;

  if (!fingerprint || !Array.isArray(picks)) {
    return res.json({ ok: false, error: 'Invalid request' });
  }

  // Picks validieren
  const cleanPicks = [...new Set(picks)].filter(
    p => Number.isInteger(p) && p >= 1 && p <= OPTIONS_COUNT
  );

  if (cleanPicks.length === 0 || cleanPicks.length > 3) {
    return res.json({ ok: false, error: 'Invalid picks' });
  }

  const ipHash = sha256(getIp(req));
  const ua = req.headers['user-agent'] || '';

  // STARKER PERSONEN-HASH
  const personHash = sha256(
    fingerprint +
    ipHash +
    ua +
    (lang || '') +
    (tz || '')
  );

  const votedAt = Date.now();

  db.get(
    'SELECT personHash FROM votes WHERE personHash = ?',
    personHash,
    (err, row) => {
      if (row) {
        return res.json({ ok: false, reason: 'duplicate' });
      }

      db.run(
        `
        INSERT INTO votes
        (personHash, fingerprint, ipHash, userAgent, language, timezone, votedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
        personHash,
        fingerprint,
        ipHash,
        ua,
        lang || '',
        tz || '',
        votedAt,
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

// ==================
// STATS ENDPOINT
// ==================
app.get('/stats', (req, res) => {
  sendStats(res, true);
});

function sendStats(res, ok) {
  db.all(
    'SELECT option, votes FROM stats ORDER BY option ASC',
    (err, rows) => {
      const stats = rows.map(r => r.votes);
      res.json({ ok, stats });
    }
  );
}

// ==================
app.listen(5050, () => {
  console.log('🔒 Secure Vote Server running on http://localhost:5050');
});
