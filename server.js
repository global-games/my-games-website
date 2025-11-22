// Install with: npm install express cors sqlite3
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const app = express();
const db = new sqlite3.Database('./votes.db');

// Setup
app.use(cors());
app.use(express.json());

// DB init
db.run('CREATE TABLE IF NOT EXISTS votes (ip TEXT, picks TEXT)');
db.run('CREATE TABLE IF NOT EXISTS stats (option INTEGER, votes INTEGER)');
for(let i=1;i<=20;i++) db.run('INSERT OR IGNORE INTO stats(option,votes) VALUES (?,0)',i);

// Vote endpoint (POST: {picks:[1,2,3]}, returns allow/deny + stats)
app.post('/vote', (req,res)=>{
  const ip=req.headers['x-forwarded-for']?.split(',')[0] || req.socket.remoteAddress;
  db.get('SELECT * FROM votes WHERE ip=?',ip, (err,row)=>{
    if(row) return res.json({ok:false,stats:getStatsSync()});
    const picks=req.body.picks;
    if(!Array.isArray(picks)||picks.length<1||picks.length>3) return res.json({ok:false});
    db.run('INSERT INTO votes(ip,picks) VALUES (?,?)', ip, JSON.stringify(picks));
    picks.forEach(option=>{
      db.run('UPDATE stats SET votes=votes+1 WHERE option=?',option);
    });
    res.json({ok:true,stats:getStatsSync()});
  });
});

// Get stats endpoint
app.get('/stats', (req,res)=>{
  res.json({ok:true,stats:getStatsSync()});
});

// Helper
function getStatsSync(){
  const ret=[];
  db.each('SELECT option,votes FROM stats ORDER BY option ASC', (err,row)=>{
    ret[row.option-1]=row.votes;
  }, ()=>{});
  return ret;
}

app.listen(5050, ()=>console.log('Server running on :5050'));
