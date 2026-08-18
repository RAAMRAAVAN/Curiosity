const fs = require('fs');
const path = require('path');

const files = [
  './app/api/assessments/[assessmentId]/pending-students/route.js',
  './app/api/assessments/[assessmentId]/appeared-students/route.js',
  './app/api/assessments/results/route.js',
  './lib/adminRbac.js'
];

let allValid = true;

files.forEach(file => {
  try {
    const content = fs.readFileSync(path.join(process.cwd(), file), 'utf8');
    // Try to parse JSX/JS - this is a basic syntax check
    new Function(content);
    // console.log('✓', file);
  } catch (err) {
    // console.log('✗', file);
    // console.log('  Error:', err.message);
    allValid = false;
  }
});

if (allValid) {
  // console.log('\n✓ All files have valid syntax');
  process.exit(0);
} else {
  // console.log('\n✗ Some files have syntax errors');
  process.exit(1);
}
