#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..', '..');
const manifestPath = path.join(scriptDir, 'manifest.json');
const requiredPaths = [
  'AGENTS.md',
  'README.md',
  '.nojekyll',
  '.gitignore',
  'scripts/content-prompts.md',
  'scripts/validate-data.mjs',
  'scripts/harness/run.mjs',
  'scripts/harness/verify.mjs',
  'scripts/harness/recover.mjs'
];
const dataFiles = [
  'data/vocabulary.json',
  'data/grammar.json',
  'data/reading.json',
  'data/situations.json'
];
const shellPages = [
  {
    file: 'index.html',
    mountId: 'home-shell',
    scriptSrc: null
  },
  {
    file: 'flashcards.html',
    mountId: 'flashcards-app',
    scriptSrc: 'js/flashcards.js'
  },
  {
    file: 'grammar.html',
    mountId: 'grammar-app',
    scriptSrc: 'js/grammar.js'
  },
  {
    file: 'reading.html',
    mountId: 'reading-app',
    scriptSrc: 'js/reading.js'
  },
  {
    file: 'situations.html',
    mountId: 'situations-app',
    scriptSrc: 'js/situations.js'
  }
];
const shellLinks = shellPages.map((entry) => entry.file);

function readJson(filePath) {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

function fail(message) {
  throw new Error(message);
}

function validateManifest() {
  const manifest = readJson(manifestPath);
  if (manifest.version !== 1) fail('manifest version must be 1');
  if (!Array.isArray(manifest.tasks) || manifest.tasks.length === 0) {
    fail('manifest tasks must be a non-empty array');
  }

  const ids = new Set();
  for (const task of manifest.tasks) {
    if (!task.id) fail('task missing id');
    if (ids.has(task.id)) fail(`duplicate task id: ${task.id}`);
    ids.add(task.id);
  }

  for (const task of manifest.tasks) {
    for (const dependency of task.dependsOn || []) {
      if (!ids.has(dependency)) {
        fail(`unknown dependency: ${dependency}`);
      }
    }
  }
}

function validateRequiredFiles() {
  for (const relativePath of requiredPaths) {
    const absolutePath = path.join(repoRoot, relativePath);
    if (!fs.existsSync(absolutePath)) {
      fail(`missing required file: ${relativePath}`);
    }
  }
}

function validateNoJekyll() {
  const filePath = path.join(repoRoot, '.nojekyll');
  const content = fs.readFileSync(filePath, 'utf8');
  if (content.trim().length !== 0) {
    fail('.nojekyll should stay empty');
  }
}

function validateShellPages() {
  const anyShellExists = shellPages.some((entry) => fs.existsSync(path.join(repoRoot, entry.file)));
  if (!anyShellExists) {
    return;
  }

  for (const entry of shellPages) {
    const filePath = path.join(repoRoot, entry.file);
    if (!fs.existsSync(filePath)) {
      fail(`missing shell page: ${entry.file}`);
      continue;
    }

    const content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes('<!doctype html>')) fail(`${entry.file}: missing doctype`);
    if (!content.includes('<nav')) fail(`${entry.file}: missing navigation`);
    if (!content.includes('href="css/style.css"')) {
      fail(`${entry.file}: missing shared stylesheet link`);
    }
    if (!content.includes(`id="${entry.mountId}"`)) {
      fail(`${entry.file}: missing mount point ${entry.mountId}`);
    }
    if (entry.scriptSrc && !content.includes(`src="${entry.scriptSrc}"`)) {
      fail(`${entry.file}: missing script tag for ${entry.scriptSrc}`);
    }
    if (!content.includes('aria-current="page"')) {
      fail(`${entry.file}: missing active nav state`);
    }

    for (const link of shellLinks) {
      if (!content.includes(`href="${link}"`)) {
        fail(`${entry.file}: missing nav link ${link}`);
      }
    }

    if (content.includes('href="/') || content.includes('src="/') || content.includes('url(/')) {
      fail(`${entry.file}: contains absolute asset reference`);
    }
  }
}

function runDataValidator() {
  const missingData = dataFiles.filter((relativePath) => !fs.existsSync(path.join(repoRoot, relativePath)));
  const strict = missingData.length === 0;
  const args = ['scripts/validate-data.mjs'];
  if (strict) {
    args.push('--strict');
  }
  const result = spawnSync('node', args, {
    cwd: repoRoot,
    encoding: 'utf8'
  });

  if (result.error) {
    fail(result.error.message);
  }
  if (result.status !== 0) {
    process.stdout.write(result.stdout || '');
    process.stderr.write(result.stderr || '');
    fail(`data validator failed with exit code ${result.status}`);
  }
}

try {
  validateManifest();
  validateRequiredFiles();
  validateNoJekyll();
  validateShellPages();
  runDataValidator();
  console.log('✓ harness verification passed');
} catch (error) {
  console.error(`✗ ${error.message}`);
  process.exitCode = 1;
}
