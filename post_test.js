const http = require('http');
const data = JSON.stringify({
  date: new Date(Date.now() + 24*60*60*1000).toISOString().slice(0,10),
  organizer: 'Test User',
  contact: 'test@example.com',
  kids: 8,
  package: 'starter',
  timeslot: { from: '10:00', to: '12:00' }
});

const options = {
  hostname: 'localhost',
  port: 4000,
  path: '/bookings',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(data)
  }
};

const req = http.request(options, res => {
  console.log(`statusCode: ${res.statusCode}`);
  res.on('data', d => process.stdout.write(d));
});

req.on('error', error => console.error(error));
req.write(data);
req.end();
