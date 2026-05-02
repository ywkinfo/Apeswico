#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildGraphFromContent, findVocabMatches, getRelated } from '../js/content-graph.js';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');

function readJson(relativePath) {
  return JSON.parse(fs.readFileSync(path.join(repoRoot, relativePath), 'utf8'));
}

const content = {
  vocabulary: readJson('data/vocabulary.json'),
  grammar: readJson('data/grammar.json'),
  reading: readJson('data/reading.json'),
  situations: readJson('data/situations.json')
};

const graph = buildGraphFromContent(content);
const r005 = getRelated({ type: 'reading', id: 'r005' }, graph);
const s010 = getRelated({ type: 'situations', id: 's010' }, graph);

assert.ok(r005.vocab.some((entry) => entry.id === 'v002'), 'r005 should auto-link barrio to v002');
assert.ok(r005.grammar.some((entry) => entry.id === 'g003'), 'r005 should link to g003 por/para');
assert.ok(s010.vocab.some((entry) => entry.id === 'v030'), 's010 should manually link retrasarse');
assert.ok(findVocabMatches('mi barrio', graph).some((entry) => entry.id === 'v002'), 'token matcher should find barrio');

console.log('✓ content graph tests passed');
