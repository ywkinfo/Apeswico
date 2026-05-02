#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '..');
const strict = process.argv.includes('--strict');
const minimums = parseMinimums(process.argv.slice(2));
const files = [
  'data/vocabulary.json',
  'data/grammar.json',
  'data/reading.json',
  'data/situations.json'
];
const sublevels = new Set(['B1.1', 'B1.2', 'B2.1', 'B2.2']);

const errors = [];
const notes = [];
const counts = {};
const datasets = {};
const contentTokenPattern = /[\p{L}\p{N}]/u;

function parseMinimums(args) {
  return args.reduce((result, arg) => {
    if (!arg.startsWith('--min-')) {
      return result;
    }

    const [flag, rawValue] = arg.slice(6).split('=');
    const value = Number(rawValue);
    if (flag && Number.isFinite(value) && value >= 0) {
      result[flag] = value;
    }
    return result;
  }, {});
}

function fail(file, message) {
  errors.push(`${file}: ${message}`);
}

function note(message) {
  notes.push(message);
}

function assertEnvelope(file, data) {
  if (data.version !== 1) fail(file, 'version must be 1');
  if (!Array.isArray(data.items)) fail(file, 'items must be an array');
}

function assertCommon(file, item) {
  if (!item.id) fail(file, 'missing id');
  if (!['B1', 'B2'].includes(item.level)) fail(file, `bad level: ${item.level}`);
  if (!sublevels.has(item.sublevel)) fail(file, `bad sublevel: ${item.sublevel}`);
}

function assertText(file, id, value, field) {
  if (typeof value !== 'string' || value.trim() === '') {
    fail(file, `${id}: missing ${field}`);
  }
}

function assertOptionalIdArray(file, itemId, value, field) {
  if (value == null) {
    return [];
  }
  if (!Array.isArray(value)) {
    fail(file, `${itemId}: ${field} must be an array`);
    return [];
  }
  for (const [index, id] of value.entries()) {
    if (typeof id !== 'string' || id.trim() === '') {
      fail(file, `${itemId}.${field}[${index}]: reference id must be a non-empty string`);
    }
  }
  return value;
}

function validateVocabulary(file, items) {
  const ids = new Set();
  for (const item of items) {
    assertCommon(file, item);
    if (ids.has(item.id)) fail(file, `duplicate id: ${item.id}`);
    ids.add(item.id);
    for (const field of ['es', 'ko', 'pos', 'example_es', 'example_ko']) {
      if (!item[field]) fail(file, `${item.id}: missing ${field}`);
    }
  }
}

function validateGrammar(file, items) {
  const ids = new Set();
  for (const item of items) {
    assertCommon(file, item);
    if (ids.has(item.id)) fail(file, `duplicate id: ${item.id}`);
    ids.add(item.id);
    assertText(file, item.id, item.title, 'title');
    assertText(file, item.id, item.explanation_ko, 'explanation_ko');
    assertOptionalIdArray(file, item.id, item.examples_in, 'examples_in');
    if (!Array.isArray(item.questions) || item.questions.length === 0) {
      fail(file, `${item.id}: questions required`);
      continue;
    }
    const questionIds = new Set();
    for (const question of item.questions) {
      if (!question.id) fail(file, `${item.id}: question missing id`);
      if (questionIds.has(question.id)) fail(file, `${item.id}: duplicate question id ${question.id}`);
      questionIds.add(question.id);
      assertText(file, question.id || item.id, question.stem, 'stem');
      assertText(file, question.id || item.id, question.stem_ko, 'stem_ko');
      assertText(file, question.id || item.id, question.explanation_ko, 'explanation_ko');
      if (!['fill', 'choice'].includes(question.type)) fail(file, `${question.id}: bad type`);
      if (question.type === 'fill' && !Array.isArray(question.accepted_answers)) {
        fail(file, `${question.id}: accepted_answers required`);
      }
      if (question.type === 'choice') {
        if (!Array.isArray(question.choices)) fail(file, `${question.id}: choices required`);
        if (
          typeof question.answer_index !== 'number' ||
          question.answer_index < 0 ||
          question.answer_index >= question.choices.length
        ) {
          fail(file, `${question.id}: answer_index out of range`);
        }
      }
    }
  }
}

function validateReading(file, items) {
  const ids = new Set();
  for (const item of items) {
    assertCommon(file, item);
    if (ids.has(item.id)) fail(file, `duplicate id: ${item.id}`);
    ids.add(item.id);
    assertText(file, item.id, item.title, 'title');
    assertOptionalIdArray(file, item.id, item.grammar_features, 'grammar_features');
    if (!Array.isArray(item.tokens)) fail(file, `${item.id}: tokens required`);
    if (Array.isArray(item.tokens)) {
      for (const [index, token] of item.tokens.entries()) {
        if (typeof token?.es !== 'string' || token.es === '') {
          fail(file, `${item.id}.tokens[${index}]: missing es`);
        }
        if (contentTokenPattern.test(token?.es ?? '') && !token.ko) {
          fail(file, `${item.id}.tokens[${index}]: content token missing ko`);
        }
      }
    }
    assertText(file, item.id, item.translation_ko, 'translation_ko');
  }
}

function validateSituations(file, items) {
  const ids = new Set();
  for (const item of items) {
    assertCommon(file, item);
    if (ids.has(item.id)) fail(file, `duplicate id: ${item.id}`);
    ids.add(item.id);
    assertText(file, item.id, item.title, 'title');
    assertText(file, item.id, item.scene_ko, 'scene_ko');
    assertOptionalIdArray(file, item.id, item.grammar_focus, 'grammar_focus');
    assertOptionalIdArray(file, item.id, item.vocab_focus, 'vocab_focus');
    if (!Array.isArray(item.dialogue) || item.dialogue.length === 0) {
      fail(file, `${item.id}: dialogue required`);
    } else {
      for (const [index, turn] of item.dialogue.entries()) {
        const label = `${item.id}.dialogue[${index}]`;
        assertText(file, label, turn?.speaker, 'speaker');
        assertText(file, label, turn?.es, 'es');
        assertText(file, label, turn?.ko, 'ko');
      }
    }
    if (Array.isArray(item.key_phrases)) {
      for (const [index, phrase] of item.key_phrases.entries()) {
        const label = `${item.id}.key_phrases[${index}]`;
        assertText(file, label, phrase?.es, 'es');
        assertText(file, label, phrase?.ko, 'ko');
        assertText(file, label, phrase?.note_ko, 'note_ko');
      }
    }
    if (Array.isArray(item.shadowing)) {
      for (const [index, line] of item.shadowing.entries()) {
        const label = `${item.id}.shadowing[${index}]`;
        if (typeof line === 'string') {
          fail(file, `${label}: shadowing must include es and ko`);
        } else {
          assertText(file, label, line?.es, 'es');
          assertText(file, label, line?.ko, 'ko');
        }
      }
    }
  }
}

const validators = {
  'vocabulary.json': validateVocabulary,
  'grammar.json': validateGrammar,
  'reading.json': validateReading,
  'situations.json': validateSituations
};

function idsFor(name) {
  return new Set((datasets[name]?.items || []).map((item) => item.id));
}

function validateIdReference(file, sourceId, field, targetId, allowed) {
  const matchingSet = allowed.find((entry) => entry.pattern.test(targetId));
  if (!matchingSet) {
    fail(file, `${sourceId}.${field}: unsupported reference id ${targetId}`);
    return;
  }
  if (!matchingSet.ids.has(targetId)) {
    fail(file, `${sourceId}.${field}: unknown reference id ${targetId}`);
  }
}

function validateCrossReferences() {
  const vocabIds = idsFor('vocabulary');
  const grammarIds = idsFor('grammar');
  const readingIds = idsFor('reading');
  const situationIds = idsFor('situations');

  for (const item of datasets.grammar?.items || []) {
    for (const id of assertOptionalIdArray('data/grammar.json', item.id, item.examples_in, 'examples_in')) {
      validateIdReference('data/grammar.json', item.id, 'examples_in', id, [
        { pattern: /^r\d+$/i, ids: readingIds },
        { pattern: /^s\d+$/i, ids: situationIds }
      ]);
    }
  }

  for (const item of datasets.reading?.items || []) {
    for (const id of assertOptionalIdArray('data/reading.json', item.id, item.grammar_features, 'grammar_features')) {
      validateIdReference('data/reading.json', item.id, 'grammar_features', id, [
        { pattern: /^g\d+$/i, ids: grammarIds }
      ]);
    }
  }

  for (const item of datasets.situations?.items || []) {
    for (const id of assertOptionalIdArray('data/situations.json', item.id, item.grammar_focus, 'grammar_focus')) {
      validateIdReference('data/situations.json', item.id, 'grammar_focus', id, [
        { pattern: /^g\d+$/i, ids: grammarIds }
      ]);
    }
    for (const id of assertOptionalIdArray('data/situations.json', item.id, item.vocab_focus, 'vocab_focus')) {
      validateIdReference('data/situations.json', item.id, 'vocab_focus', id, [
        { pattern: /^v\d+$/i, ids: vocabIds }
      ]);
    }
  }
}

for (const relativePath of files) {
  const absolutePath = path.join(repoRoot, relativePath);
  if (!fs.existsSync(absolutePath)) {
    if (strict) {
      fail(relativePath, 'file missing');
    } else {
      note(`skipped ${relativePath} (not created yet)`);
    }
    continue;
  }

  let data;
  try {
    data = JSON.parse(fs.readFileSync(absolutePath, 'utf8'));
  } catch (error) {
    fail(relativePath, `JSON parse error: ${error.message}`);
    continue;
  }

  assertEnvelope(relativePath, data);
  if (Array.isArray(data.items)) {
    counts[path.basename(relativePath, '.json')] = data.items.length;
    datasets[path.basename(relativePath, '.json')] = data;
    const validator = validators[path.basename(relativePath)];
    if (validator) {
      validator(relativePath, data.items);
    }
  }
}

validateCrossReferences();

for (const [name, minimum] of Object.entries(minimums)) {
  const actual = counts[name] ?? 0;
  if (actual < minimum) {
    fail(name, `expected at least ${minimum} item(s), found ${actual}`);
  }
}

if (errors.length > 0) {
  console.error(`✗ ${errors.length} validation error(s)`);
  for (const error of errors) {
    console.error(`- ${error}`);
  }
  process.exit(1);
}

for (const entry of notes) {
  console.log(entry);
}

console.log('✓ data validation passed');
