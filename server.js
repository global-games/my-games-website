// npm install express cors sqlite3 crypto
const express = require("express");
const cors = require("cors");
const sqlite3 = require("sqlite3").verbose();
const crypto = require("crypto");

const app = express();
const db = new sqlite3.Database("./votes.db");

app.use(cors());
app.use(express.json());

/* =========================
   DB SETUP
========================= */
db.run(`
CREATE TABLE IF NOT EXISTS votes (
  voter_hash TEXT PRIMARY KEY,
  created_at INTEGER
)`);

db.run(`
CREATE TABLE IF NOT EXISTS stats (
  option INTEGER PRIMARY KEY,
  votes INTEGER
)`);

for (let i = 1; i <= 20; i++) {
  db.run(
    "INSERT OR IGNORE INTO stats(option,votes) VALUES (?,0)",
    i
  );
}

/* =========================
   HELPERS
========================= */
function getSubnet(ip) {
  if (!ip) return "0.0.0";
  if (ip.includes(":")) return ip.split(":").slice(0, 3).join(":");
  return ip.split(".").slice(0, 3).join(".");
}

function hashVoter({ fingerprint, ip, ua, lang, tz }) {
  const raw = [
    fingerprint,
    getSubnet(ip),
    ua.slice(0, 80),
    lang,
    tz
  ].join("|");

  return crypto
    .createHash("sha256")
    .update(raw)
    .digest("hex");
}

function getStats(res) {
  db.all(
    "SELECT option, votes FROM stats ORDER BY option",
    (err, rows) => {
      const stats = rows.map(r => r.votes);
      res.json({ ok: true, stats });
    }
  );
}

/* =========================
   VOTE ENDPOINT
========================= */
app.post("/vote", (req, res) => {
  const ip =
    req.headers["x-forwarded-for"]?.split(",")[0] ||
    req.socket.remoteAddress;

  const voterHash = hashVoter({
    fingerprint: req.body.fingerprint,
    ip,
    ua: req.headers["user-agent"] || "",
    lang: req.body.lang || "",
    tz: req.body.tz || ""
  });

  db.get(
    "SELECT voter_hash FROM votes WHERE voter_hash=?",
    voterHash,
    (err, row) => {
      if (row) return getStats(res);

      const picks = req.body.picks;
      if (!Array.isArray(picks) || picks.length < 1 || picks.length > 3) {
        return res.json({ ok: false });
      }

      db.run(
        "INSERT INTO votes(voter_hash, created_at) VALUES (?,?)",
        voterHash,
        Date.now()
      );

      picks.forEach(p =>
        db.run("UPDATE stats SET votes=votes+1 WHERE option=?", p)
      );

      getStats(res);
    }
  );
});

/* =========================
   STATS
========================= */
app.get("/stats", (req, res) => {
  getStats(res);
});

app.listen(5050, () =>
  console.log("✅ Vote server running on http://localhost:5050")
);
