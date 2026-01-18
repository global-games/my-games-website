// npm install express cors sqlite3 crypto
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const crypto = require('crypto');

const app = express();
const db = new sqlite3.Database('./votes.db');

app.use(cors());
app.use(express.json());

// --- CONFIG ---
const VOTE_COOLDOWN_MS = 1000 * 60 * 60 * 24; // 24h

// --- DB ---
db.serialize(() => {
  db.run(`
    CREATE TABLE IF NOT EXISTS votes (
      personHash TEXT PRIMARY KEY,
      fingerprint TEXT,
      ipHash TEXT,
      userAgent TEXT,
      votedAt INTEGER
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS stats (
      option INTEGER PRIMARY KEY,
      votes INTEGER
    )
  `);

  for (let i = 1; i <= 20; i++) {
    db.run('INSERT OR IGNORE INTO stats(option,votes) VALUES (?,0)', i);
  }
});

// --- HELPERS ---
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

// --- VOTE ---
app.post('/vote', (req, res) => {
  const { fingerprint, picks, tz, lang } = req.body;

  if (!fingerprint || !Array.isArray(picks)) {
    return res.json({ ok: false });
  }

  const cleanPicks = [...new Set(picks)].filter(
    p => Number.isInteger(p) && p >= 1 && p <= 20
  );
  if (!cleanPicks.length || cleanPicks.length > 3) {
    return res.json({ ok: false });
  }

  const ipHash = sha256(getIp(req));
  const ua = req.headers['user-agent'] || '';

  const personHash = sha256(
    fingerprint + ipHash + ua + (lang || '') + (tz || '')
  );

  const now = Date.now();

  db.get(
    'SELECT votedAt FROM votes WHERE personHash = ?',
    personHash,
    (err, row) => {
      if (row) {
        return res.json({ ok: false, reason: 'duplicate' });
      }

      db.run(
        `
        INSERT INTO votes(personHash,fingerprint,ipHash,userAgent,votedAt)
        VALUES (?,?,?,?,?)
        `,
        personHash,
        fingerprint,
        ipHash,
        ua,
        now,
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
app.get('/stats', (_, res) => sendStats(res, true));

function sendStats(res, ok) {
  db.all(
    'SELECT option,votes FROM stats ORDER BY option ASC',
    (err, rows) => {
      res.json({ ok, stats: rows.map(r => r.votes) });
    }
  );
}

app.listen(5050, () =>
  console.log('🔒 Secure vote server running on :5050')
);
