#!/usr/bin/env node
import process from 'node:process';

const input = process.argv.slice(2).join(' ').toLowerCase();

const recoveries = [
  {
    match: ['json', 'parse', 'syntax'],
    title: 'JSON parse failure',
    steps: [
      'Inspect the failing file under data/ or scripts/harness/manifest.json.',
      'Fix the syntax error and rerun node scripts/harness/verify.mjs.',
      'If the issue is in sample content, rerun node scripts/validate-data.mjs.'
    ]
  },
  {
    match: ['absolute path', '/css/', '/js/'],
    title: 'Absolute asset path',
    steps: [
      'Replace absolute asset references with relative paths.',
      'Keep GitHub Pages project-site compatibility in mind.',
      'Rerun node scripts/harness/verify.mjs.'
    ]
  },
  {
    match: ['file://', 'fetch', 'cors'],
    title: 'Local file loading issue',
    steps: [
      'Run the app through a local HTTP server instead of file://.',
      'Use python3 -m http.server 8000 from the repo root.',
      'Open http://localhost:8000 in the browser.'
    ]
  },
  {
    match: ['localstorage', 'storage'],
    title: 'Storage issue',
    steps: [
      'Route reads and writes through js/storage.js.',
      'Wrap localStorage access in try/catch and provide an in-memory fallback.',
      'Re-test the affected flow in a private window if needed.'
    ]
  },
  {
    match: ['missing file', 'not found'],
    title: 'Missing scaffold file',
    steps: [
      'Create the missing file in the path requested by the manifest.',
      'Update the manifest only if the project scope changed.',
      'Rerun node scripts/harness/verify.mjs.'
    ]
  }
];

const hit = recoveries.find((entry) => entry.match.some((token) => input.includes(token)));

if (!hit) {
  console.log('No specific recovery rule matched.');
  console.log('Suggested next step: run node scripts/harness/verify.mjs and inspect the first failure.');
  process.exit(0);
}

console.log(hit.title);
for (const step of hit.steps) {
  console.log(`- ${step}`);
}
