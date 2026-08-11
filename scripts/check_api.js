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

const base = 'http://localhost:3000';
const outPath = './scripts/check_api_results.jsonl';

async function check() {
  const results = [];
  for (const path of endpoints) {
    const url = base + path;
    try {
      const res = await fetch(url, { method: 'GET' });
      const text = await res.text();
      const obj = { path, status: res.status, ok: res.ok, body: text.slice(0, 2000) };
      results.push(obj);
    } catch (err) {
      results.push({ path, error: String(err) });
    }
  }
  fs.writeFileSync(outPath, results.map(r => JSON.stringify(r)).join('\n'));
  console.log('WROTE', outPath);
}

check().catch(e => { console.error(e); process.exit(1); });
