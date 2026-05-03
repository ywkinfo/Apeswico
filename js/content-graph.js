import { loadAll } from './data.js';

const TYPES = ['vocab', 'grammar', 'reading', 'situations'];
const CONTENT_WORD = /[\p{L}\p{N}]/u;
const TOKEN_PATTERN = /[\p{L}\p{M}\p{N}]+/gu;
const STOPWORDS = new Set([
  'a',
  'al',
  'de',
  'del',
  'el',
  'la',
  'los',
  'las',
  'un',
  'una',
  'unos',
  'unas',
  'y',
  'o',
  'que',
  'en',
  'con',
  'mi',
  'me',
  'se',
  'le',
  'lo',
  'por',
  'para',
  'es',
  'son',
  'está',
  'esta',
  'este',
  'sí',
  'si',
  'no'
]);

let graphPromise = null;

export function normalizeText(value) {
  return String(value ?? '')
    .normalize('NFD')
    .replace(/\p{M}/gu, '')
    .toLowerCase()
    .trim();
}

function tokensFrom(value) {
  return normalizeText(value).match(TOKEN_PATTERN) || [];
}

function visibleTokens(tokens = []) {
  return tokens.filter((token) => CONTENT_WORD.test(token?.es || '') && token.ko != null);
}

function nodeKey(type, id) {
  return `${type}:${id}`;
}

function normalizeNodeType(type) {
  return type === 'situation' ? 'situations' : type;
}

function makeGraphShell() {
  return {
    nodes: Object.fromEntries(TYPES.map((type) => [type, new Map()])),
    edges: [],
    adjacency: new Map(),
    matchers: []
  };
}

function addNode(graph, type, item) {
  graph.nodes[type].set(item.id, item);
  const key = nodeKey(type, item.id);
  if (!graph.adjacency.has(key)) {
    graph.adjacency.set(key, []);
  }
}

function addEdge(graph, from, to, kind, source = 'auto') {
  const a = { type: normalizeNodeType(from.type), id: from.id };
  const b = { type: normalizeNodeType(to.type), id: to.id };
  if (!a.id || !b.id || a.type === b.type && a.id === b.id) {
    return;
  }

  const ordered = [nodeKey(a.type, a.id), nodeKey(b.type, b.id)].sort();
  const duplicateKey = `${ordered[0]}|${ordered[1]}|${kind}`;
  if (graph.edges.some((edge) => edge.key === duplicateKey)) {
    return;
  }

  const edge = {
    key: duplicateKey,
    from: a,
    to: b,
    kind,
    source
  };
  graph.edges.push(edge);

  for (const [self, other] of [
    [a, b],
    [b, a]
  ]) {
    const key = nodeKey(self.type, self.id);
    if (!graph.adjacency.has(key)) {
      graph.adjacency.set(key, []);
    }
    graph.adjacency.get(key).push({
      ...edge,
      self,
      related: other
    });
  }
}

function referenceTypeFromId(id) {
  if (/^r\d+$/i.test(id)) return 'reading';
  if (/^s\d+$/i.test(id)) return 'situations';
  if (/^g\d+$/i.test(id)) return 'grammar';
  if (/^v\d+$/i.test(id)) return 'vocab';
  return null;
}

function addReferenceEdges(graph, fromType, fromId, ids, kind, source = 'manual') {
  if (!Array.isArray(ids)) {
    return;
  }

  for (const id of ids) {
    const toType = referenceTypeFromId(id);
    if (toType && graph.nodes[toType].has(id)) {
      addEdge(graph, { type: fromType, id: fromId }, { type: toType, id }, kind, source);
    }
  }
}

function verbStem(value) {
  const normalized = normalizeText(value).replace(/se$/, '');
  if (/(ar|er|ir)$/.test(normalized) && normalized.length > 4) {
    return normalized.slice(0, -2);
  }
  return '';
}

function makeVocabMatchers(items) {
  return items.map((item) => {
    const term = normalizeText(item.es);
    const phrase = term.includes(' ') ? term : '';
    const words = tokensFrom(item.es).filter((token) => token.length > 2 && !STOPWORDS.has(token));
    const exampleTokens = String(item.pos || '').startsWith('verbo')
      ? tokensFrom(item.example_es).filter((token) => token.length > 4 && !STOPWORDS.has(token))
      : [];
    const stem = verbStem(item.es);
    return {
      item,
      term,
      phrase,
      words,
      exampleTokens,
      stem
    };
  });
}

function tokenMatches(matcher, contentTokens, normalizedText) {
  if (matcher.phrase && normalizedText.includes(matcher.phrase)) {
    return true;
  }

  for (const word of matcher.words) {
    if (contentTokens.includes(word)) {
      return true;
    }
    if (word.length > 4 && contentTokens.some((token) => token === `${word}s` || token === `${word}es`)) {
      return true;
    }
  }

  if (matcher.stem && contentTokens.some((token) => token.startsWith(matcher.stem) && token.length <= matcher.stem.length + 5)) {
    return true;
  }

  return matcher.exampleTokens.some((token) => contentTokens.includes(token));
}

function tokenMatchScore(matcher, contentTokens, normalizedText) {
  if (normalizedText === matcher.term) {
    return 100;
  }

  if (matcher.phrase && normalizedText.includes(matcher.phrase)) {
    return 90;
  }

  if (matcher.words.some((word) => normalizedText === word)) {
    return 80;
  }

  if (matcher.words.some((word) => contentTokens.includes(word))) {
    return 70;
  }

  if (
    matcher.words.some(
      (word) => word.length > 4 && contentTokens.some((token) => token === `${word}s` || token === `${word}es`)
    )
  ) {
    return 60;
  }

  if (matcher.stem && contentTokens.some((token) => token.startsWith(matcher.stem) && token.length <= matcher.stem.length + 5)) {
    return 50;
  }

  if (matcher.exampleTokens.some((token) => contentTokens.includes(token))) {
    return 10;
  }

  return 0;
}

function readingText(item) {
  return (item.tokens || []).map((token) => token.es).join('');
}

function situationText(item) {
  return [
    item.scene_ko,
    ...(item.dialogue || []).flatMap((turn) => [turn.es, turn.ko]),
    ...(item.key_phrases || []).flatMap((phrase) => [phrase.es, phrase.ko, phrase.note_ko]),
    ...(item.shadowing || []).flatMap((line) => (typeof line === 'string' ? [line] : [line.es, line.ko]))
  ].join(' ');
}

function addAutomaticVocabEdges(graph, contentType, items, textForItem) {
  for (const item of items) {
    const text = textForItem(item);
    const normalized = normalizeText(text);
    const contentTokens = tokensFrom(text).filter((token) => !STOPWORDS.has(token));
    for (const matcher of graph.matchers) {
      if (tokenMatches(matcher, contentTokens, normalized)) {
        addEdge(
          graph,
          { type: contentType, id: item.id },
          { type: 'vocab', id: matcher.item.id },
          'lemma',
          'auto'
        );
      }
    }
  }
}

function addLevelEdges(graph, itemsByType) {
  const ordered = ['B1.1', 'B1.2', 'B2.1', 'B2.2'];
  for (const type of TYPES) {
    const bySublevel = new Map();
    for (const item of itemsByType[type] || []) {
      if (!bySublevel.has(item.sublevel)) {
        bySublevel.set(item.sublevel, []);
      }
      bySublevel.get(item.sublevel).push(item);
    }
    for (let index = 1; index < ordered.length; index += 1) {
      const previous = bySublevel.get(ordered[index - 1]) || [];
      const current = bySublevel.get(ordered[index]) || [];
      for (const item of current) {
        for (const prereq of previous.slice(0, 3)) {
          addEdge(graph, { type, id: item.id }, { type, id: prereq.id }, 'level-prereq', 'auto');
        }
      }
    }
  }
}

export function buildGraphFromContent(content) {
  const itemsByType = {
    vocab: content.vocabulary?.items || [],
    grammar: content.grammar?.items || [],
    reading: content.reading?.items || [],
    situations: content.situations?.items || []
  };
  const graph = makeGraphShell();

  for (const [type, items] of Object.entries(itemsByType)) {
    for (const item of items) {
      addNode(graph, type, item);
    }
  }

  graph.matchers = makeVocabMatchers(itemsByType.vocab);

  for (const item of itemsByType.grammar) {
    addReferenceEdges(graph, 'grammar', item.id, item.examples_in, 'examples-in');
  }

  for (const item of itemsByType.reading) {
    addReferenceEdges(graph, 'reading', item.id, item.grammar_features, 'grammar-feature');
  }

  for (const item of itemsByType.situations) {
    addReferenceEdges(graph, 'situations', item.id, item.grammar_focus, 'grammar-focus');
    addReferenceEdges(graph, 'situations', item.id, item.vocab_focus, 'vocab-focus');
  }

  addAutomaticVocabEdges(graph, 'reading', itemsByType.reading, readingText);
  addAutomaticVocabEdges(graph, 'situations', itemsByType.situations, situationText);
  addLevelEdges(graph, itemsByType);

  return graph;
}

export async function getGraph() {
  if (!graphPromise) {
    graphPromise = loadAll().then(buildGraphFromContent);
  }
  return graphPromise;
}

export function getRelated({ type, id }, graph) {
  const normalizedType = normalizeNodeType(type);
  const related = {
    vocab: [],
    grammar: [],
    reading: [],
    situations: []
  };
  const seen = new Set();
  const edges = graph?.adjacency?.get(nodeKey(normalizedType, id)) || [];

  for (const edge of edges) {
    const relatedType = edge.related.type;
    const relatedId = edge.related.id;
    const key = nodeKey(relatedType, relatedId);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    const item = graph.nodes[relatedType]?.get(relatedId);
    if (item) {
      related[relatedType].push({
        type: relatedType,
        id: relatedId,
        kind: edge.kind,
        source: edge.source,
        item
      });
    }
  }

  return related;
}

export function findVocabMatches(text, graph, { limit = 6 } = {}) {
  const normalized = normalizeText(text);
  const contentTokens = tokensFrom(text).filter((token) => !STOPWORDS.has(token));
  const matches = [];
  for (const matcher of graph?.matchers || []) {
    if (tokenMatches(matcher, contentTokens, normalized)) {
      matches.push({
        item: matcher.item,
        score: tokenMatchScore(matcher, contentTokens, normalized)
      });
    }
  }
  return matches
    .sort((a, b) => b.score - a.score || a.item.id.localeCompare(b.item.id))
    .slice(0, limit)
    .map((entry) => entry.item);
}

function itemSearchText(type, item) {
  if (type === 'vocab') {
    return [item.id, item.es, item.ko, item.pos, item.example_es, item.example_ko, ...(item.tags || [])].join(' ');
  }
  if (type === 'grammar') {
    return [
      item.id,
      item.title,
      item.explanation_ko,
      ...(item.questions || []).flatMap((question) => [question.stem, question.stem_ko, question.explanation_ko])
    ].join(' ');
  }
  if (type === 'reading') {
    return [item.id, item.title, item.translation_ko, ...(item.tokens || []).flatMap((token) => [token.es, token.ko])].join(' ');
  }
  return [
    item.id,
    item.title,
    item.scene_ko,
    ...(item.dialogue || []).flatMap((turn) => [turn.es, turn.ko]),
    ...(item.key_phrases || []).flatMap((phrase) => [phrase.es, phrase.ko, phrase.note_ko])
  ].join(' ');
}

function resultHref(type, id) {
  if (type === 'vocab') return `flashcards.html#card=${encodeURIComponent(id)}`;
  if (type === 'grammar') return `grammar.html#topic=${encodeURIComponent(id)}`;
  if (type === 'reading') return `reading.html#passage=${encodeURIComponent(id)}`;
  return `situations.html#situation=${encodeURIComponent(id)}`;
}

function titleFor(type, item) {
  return type === 'vocab' ? item.es : item.title;
}

function subtitleFor(type, item) {
  if (type === 'vocab') return `${item.ko} · ${item.level} ${item.sublevel}`;
  if (type === 'grammar') return `${item.level} ${item.sublevel}`;
  if (type === 'reading') return item.translation_ko;
  return item.scene_ko;
}

export function searchGraph(query, graph, { limit = 24 } = {}) {
  const normalizedQuery = normalizeText(query);
  if (!normalizedQuery) {
    return [];
  }

  const results = [];
  for (const type of TYPES) {
    for (const item of graph.nodes[type].values()) {
      const haystack = normalizeText(itemSearchText(type, item));
      if (!haystack.includes(normalizedQuery)) {
        continue;
      }
      const title = normalizeText(titleFor(type, item));
      const score = title.startsWith(normalizedQuery) ? 3 : title.includes(normalizedQuery) ? 2 : 1;
      results.push({
        type,
        id: item.id,
        title: titleFor(type, item),
        subtitle: subtitleFor(type, item),
        href: resultHref(type, item.id),
        score,
        item
      });
    }
  }

  return results.sort((a, b) => b.score - a.score || a.type.localeCompare(b.type)).slice(0, limit);
}

export async function searchAll(query, options) {
  return searchGraph(query, await getGraph(), options);
}
