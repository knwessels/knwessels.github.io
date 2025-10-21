// test_post.js - sends a POST to local bookings server and prints result
const fetch = require('node-fetch');
(async ()=>{
  try{
    const res = await fetch('http://localhost:4000/bookings', {
      method: 'POST', headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ date:'2025-10-22', organizer:'Node Test', contact:'node@test', kids:6, package:'starter', timeslot:{from:'08:00',to:'10:00'} })
    });
    const txt = await res.text();
    console.log('STATUS', res.status);
    console.log(txt);
  }catch(e){ console.error('err',e); process.exit(1); }
})();
