// Simple bookings server for BrightBash
// Usage: node server.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const DATA_FILE = path.join(__dirname, 'bookings.json');
function loadData(){
  try{ if(!fs.existsSync(DATA_FILE)) fs.writeFileSync(DATA_FILE, JSON.stringify({}));
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    return JSON.parse(raw||'{}');
  }catch(e){console.error('load error',e);return{}}}
function saveData(obj){ try{ fs.writeFileSync(DATA_FILE, JSON.stringify(obj, null, 2)); return true;}catch(e){console.error('save error',e);return false} }

const app = express();
app.use(cors());
app.use(express.json());

// lightweight public ping for clients to detect server availability
app.get('/ping', (req,res)=>{ res.json({ok:true,now:Date.now()}); });

// simple admin protection: set ADMIN_PROTECT=1 and ADMIN_PASS env var
function checkAdmin(req,res,next){
  if(!process.env.ADMIN_PROTECT) return next();
  const auth = req.get('Authorization') || '';
  const token = auth.replace(/^Bearer\s+/i,'');
  if(token && process.env.ADMIN_PASS && token === process.env.ADMIN_PASS) return next();
  return res.status(401).json({error:'unauthorized'});
}

// email helper (nodemailer)
let transporter = null;
if(process.env.SMTP_HOST){
  const nodemailer = require('nodemailer');
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT ? Number(process.env.SMTP_PORT) : 587,
    secure: process.env.SMTP_SECURE === '1',
    auth: process.env.SMTP_USER ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS } : undefined
  });
}

app.get('/bookings', (req,res)=>{
  // admin-protected list
  checkAdmin(req,res,()=>{ const data = loadData(); res.json(data); });
});

app.get('/bookings/:date', (req,res)=>{
  checkAdmin(req,res,()=>{ const data = loadData(); res.json(data[req.params.date] || []); });
});

app.post('/bookings', (req,res)=>{
  console.log('POST /bookings called with body:', req.body);
  const data = loadData();
  const b = req.body;
  if(!b || !b.date || !b.timeslot || !b.timeslot.from || !b.timeslot.to) return res.status(400).json({error:'missing fields (date/timeslot)'});
  const date = b.date;
  if(!data[date]) data[date]=[];
  // simple overlap check
  function toMinutes(t){ const [hh,mm]=t.split(':').map(Number); return hh*60+mm }
  const overlap = data[date].some(existing=> Math.max(toMinutes(existing.timeslot.from), toMinutes(b.timeslot.from)) < Math.min(toMinutes(existing.timeslot.to), toMinutes(b.timeslot.to)) );
  if(overlap) return res.status(409).json({error:'timeslot conflict'});
  const entry = { organizer: b.organizer||'', contact:b.contact||'', kids:b.kids||'', package:b.package||'', timeslot:b.timeslot, created:Date.now() };
  data[date].push(entry);
  saveData(data);
  // send notification email if configured
  if(transporter && process.env.EMAIL_TO){
    const subject = `New booking: ${date} ${entry.timeslot.from}-${entry.timeslot.to}`;
    const text = `Organizer: ${entry.organizer}\nContact: ${entry.contact}\nPackage: ${entry.package}\nKids: ${entry.kids}\nDate: ${date} ${entry.timeslot.from}-${entry.timeslot.to}`;
    transporter.sendMail({from: process.env.EMAIL_FROM || process.env.SMTP_USER, to: process.env.EMAIL_TO, subject, text}).catch(err=>console.error('mail error',err));
  }
  res.status(201).json({ok:true,entry,all:data});
});

// DELETE booking by date and timeslot
app.delete('/bookings', (req,res)=>{
  checkAdmin(req,res,()=>{
    const {date,from,to} = req.body;
    if(!date || !from || !to) return res.status(400).json({error:'missing date/from/to'});
    const data = loadData();
    if(!data[date]) return res.status(404).json({error:'no bookings for date'});
    const before = data[date].length;
    data[date] = data[date].filter(b=> !(b.timeslot.from===from && b.timeslot.to===to) );
    const after = data[date].length;
    saveData(data);
    if(after===before) return res.status(404).json({error:'booking not found'});
    return res.json({ok:true,all:data});
  });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, ()=>console.log(`BrightBash bookings server running on http://localhost:${PORT}`));
