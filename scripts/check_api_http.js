const http = require('http');
const fs = require('fs');
const endpoints = [
  '/api/test',
  '/api/classes',
  '/api/subjects',
  '/api/classes-with-subjects',
  '/api/teacher/assessments',
  '/api/chapter-content/list',
  '/api/chapter-content/video',
  '/api/upload'
];
const host = 'localhost';
const port = 3000;
const out = [];

function get(path) {
  return new Promise((resolve) => {
    const options = { host, port, path, method: 'GET' };
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (c) => (body += c.toString()));
      res.on('end', () => resolve({ path, status: res.statusCode, body: body.slice(0, 2000) }));
    });
    req.on('error', (e) => resolve({ path, error: String(e) }));
    req.end();
  });
}

(async function() {
  for (const p of endpoints) {
    const r = await get(p);
    out.push(r);
  }
  fs.writeFileSync('scripts/check_api_http_results.json', JSON.stringify(out, null, 2));
  // console.log('WROTE scripts/check_api_http_results.json');
})();
