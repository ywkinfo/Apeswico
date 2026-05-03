#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildGraphFromContent, findVocabMatches, getRelated, searchGraph } from '../js/content-graph.js';

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
const r007 = getRelated({ type: 'reading', id: 'r007' }, graph);
const s010 = getRelated({ type: 'situations', id: 's010' }, graph);
const s011 = getRelated({ type: 'situations', id: 's011' }, graph);
const suenoSearchIds = searchGraph('sueño', graph).map((entry) => entry.id);

assert.ok(r005.vocab.some((entry) => entry.id === 'v002'), 'r005 should auto-link barrio to v002');
assert.ok(r005.grammar.some((entry) => entry.id === 'g003'), 'r005 should link to g003 por/para');
assert.ok(s010.vocab.some((entry) => entry.id === 'v030'), 's010 should manually link retrasarse');
assert.ok(findVocabMatches('mi barrio', graph).some((entry) => entry.id === 'v002'), 'token matcher should find barrio');
assert.ok(r007.grammar.some((entry) => entry.id === 'g004'), 'r007 should link to subjuntivo');
assert.ok(r007.grammar.some((entry) => entry.id === 'g006'), 'r007 should link to imperativo');
assert.ok(r007.vocab.some((entry) => entry.id === 'v183'), 'r007 should auto-link sueño');
assert.ok(s011.grammar.some((entry) => entry.id === 'g006'), 's011 should link to imperativo');
assert.ok(s011.vocab.some((entry) => entry.id === 'v188'), 's011 should manually link recepcionista');
assert.ok(s011.vocab.some((entry) => entry.id === 'v183'), 's011 should auto-link sueño');
assert.ok(findVocabMatches('sueño', graph).some((entry) => entry.id === 'v183'), 'token matcher should find sueño');
assert.ok(suenoSearchIds.includes('v183'), 'search should find sueño vocabulary');
assert.ok(suenoSearchIds.includes('r007'), 'search should find Pedro reading');
assert.ok(suenoSearchIds.includes('s011'), 'search should find hotel situation');

console.log('✓ content graph tests passed');
