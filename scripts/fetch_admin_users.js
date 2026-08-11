const http = require('http');
const fs = require('fs');
const options = { host: 'localhost', port: 3000, path: '/api/admin/users', method: 'GET' };
const req = http.request(options, (res) => {
  let body = '';
  res.on('data', (c) => body += c.toString());
  res.on('end', () => {
    fs.writeFileSync('scripts/admin_users.json', body);
    console.log('WROTE scripts/admin_users.json');
  });
});
req.on('error', (e) => { console.error(e); process.exit(1); });
req.end();
