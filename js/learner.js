import { get, namespace, set } from './storage.js';
import { loadDailyProgress, loadProgress, recordReview } from './srs.js';

const PROFILE_KEY = namespace('learner', 1);
const LEGACY_KEYS = Object.freeze({
  srsCards: namespace('srs', 1, 'cards'),
  srsDaily: namespace('srs', 1, 'daily'),
  grammarScores: namespace('grammar', 1, 'scores'),
  readingRead: namespace('reading', 1, 'read'),
  situationsDone: namespace('situations', 1, 'done')
});

const SUBLEVELS = ['B1.1', 'B1.2', 'B2.1', 'B2.2'];
const PROFILE_VERSION = 1;
const MAX_ENCOUNTERS = 60;
const DAY_MS = 24 * 60 * 60 * 1000;

function todayKey(now = Date.now()) {
  return new Date(now).toLocaleDateString('en-CA');
}

function defaultProfile() {
  return {
    version: PROFILE_VERSION,
    migratedAt: null,
    vocab: {},
    grammar: {},
    reading: {},
    situations: {},
    daily: {},
    streak: {
      current: 0,
      longest: 0,
      lastDay: null
    },
    level: Object.fromEntries(SUBLEVELS.map((sublevel) => [sublevel, 0]))
  };
}

function isPlainObject(value) {
  return value != null && typeof value === 'object' && !Array.isArray(value);
}

function mergePlain(base, patch) {
  const next = { ...base };
  for (const [key, value] of Object.entries(patch || {})) {
    if (isPlainObject(value) && isPlainObject(next[key])) {
      next[key] = mergePlain(next[key], value);
    } else if (Array.isArray(value)) {
      next[key] = [...value];
    } else {
      next[key] = value;
    }
  }
  return next;
}

function daysBetween(previousDay, nextDay) {
  const previous = new Date(`${previousDay}T00:00:00`);
  const next = new Date(`${nextDay}T00:00:00`);
  return Math.round((next.getTime() - previous.getTime()) / DAY_MS);
}

function normalizeType(type) {
  if (type === 'situation') {
    return 'situations';
  }
  return type;
}

function entryWithEncounter(entry, signal, now) {
  const encounters = Array.isArray(entry?.encounters) ? entry.encounters : [];
  const encounter = {
    kind: signal?.kind || 'interaction',
    at: now,
    ...signal
  };

  return {
    ...(entry || {}),
    encounters: [...encounters.slice(-MAX_ENCOUNTERS + 1), encounter]
  };
}

function masteryFromScore(correct = 0, total = 0) {
  if (!total) {
    return 0;
  }
  return Math.max(0, Math.min(1, correct / total));
}

function migrateLegacy(profile, now) {
  if (profile.migratedAt) {
    return profile;
  }

  const next = mergePlain(defaultProfile(), profile);
  const migratedAt = now;
  const srsCards = get(LEGACY_KEYS.srsCards, {});
  const srsDaily = get(LEGACY_KEYS.srsDaily, {});
  const grammarScores = get(LEGACY_KEYS.grammarScores, {});
  const readingRead = get(LEGACY_KEYS.readingRead, []);
  const situationsDone = get(LEGACY_KEYS.situationsDone, []);

  for (const [id, cardState] of Object.entries(srsCards || {})) {
    next.vocab[id] = {
      ...(next.vocab[id] || {}),
      ...cardState,
      encounters: next.vocab[id]?.encounters || []
    };
  }

  for (const [day, daily] of Object.entries(srsDaily || {})) {
    next.daily[day] = {
      ...(next.daily[day] || {}),
      ...daily,
      modes: Array.isArray(next.daily[day]?.modes) ? next.daily[day].modes : ['flashcards']
    };
  }

  for (const [id, score] of Object.entries(grammarScores || {})) {
    const correct = Number(score?.correct || 0);
    const total = Number(score?.total || 0);
    next.grammar[id] = {
      ...(next.grammar[id] || {}),
      correct,
      total,
      questions: next.grammar[id]?.questions || {},
      mastery: masteryFromScore(correct, total)
    };
  }

  for (const id of Array.isArray(readingRead) ? readingRead : []) {
    next.reading[id] = {
      ...(next.reading[id] || {}),
      readAt: next.reading[id]?.readAt || migratedAt,
      tokenClicks: next.reading[id]?.tokenClicks || []
    };
  }

  for (const id of Array.isArray(situationsDone) ? situationsDone : []) {
    next.situations[id] = {
      ...(next.situations[id] || {}),
      doneAt: next.situations[id]?.doneAt || migratedAt,
      shadowedLines: next.situations[id]?.shadowedLines || []
    };
  }

  next.migratedAt = migratedAt;
  return next;
}

function updateStreak(profile, now = Date.now()) {
  const day = todayKey(now);
  const streak = profile.streak || defaultProfile().streak;
  if (streak.lastDay === day) {
    return profile;
  }

  const adjacent = streak.lastDay && daysBetween(streak.lastDay, day) === 1;
  const current = adjacent ? Number(streak.current || 0) + 1 : 1;
  return {
    ...profile,
    streak: {
      current,
      longest: Math.max(Number(streak.longest || 0), current),
      lastDay: day
    }
  };
}

function updateDaily(profile, mode, now = Date.now()) {
  const day = todayKey(now);
  const today = profile.daily[day] || {};
  const modes = new Set(Array.isArray(today.modes) ? today.modes : []);
  if (mode) {
    modes.add(mode);
  }

  return {
    ...profile,
    daily: {
      ...profile.daily,
      [day]: {
        ...today,
        modes: [...modes],
        activityCount: Number(today.activityCount || 0) + (mode ? 1 : 0)
      }
    }
  };
}

function ensureProfile({ touch = true, mode = null, now = Date.now() } = {}) {
  let profile = mergePlain(defaultProfile(), get(PROFILE_KEY, defaultProfile()));
  profile = migrateLegacy(profile, now);
  if (touch) {
    profile = updateDaily(updateStreak(profile, now), mode, now);
  }
  set(PROFILE_KEY, profile);
  return profile;
}

function saveProfile(profile) {
  const normalized = mergePlain(defaultProfile(), profile);
  set(PROFILE_KEY, normalized);
  return normalized;
}

export function getProfile() {
  return ensureProfile({ touch: false });
}

export function setProfile(partial) {
  const profile = ensureProfile({ touch: false });
  return saveProfile(mergePlain(profile, partial));
}

export function touchDaily(mode, { now = Date.now() } = {}) {
  return saveProfile(updateDaily(updateStreak(ensureProfile({ touch: false, now }), now), mode, now));
}

export function recordEncounter(type, id, signal = {}) {
  const normalizedType = normalizeType(type);
  if (!id || !['vocab', 'grammar', 'reading', 'situations'].includes(normalizedType)) {
    return getProfile();
  }

  const now = signal.at || Date.now();
  let profile = ensureProfile({ touch: false, now });
  const mode = signal.mode || normalizedType;
  profile = updateDaily(updateStreak(profile, now), mode, now);
  const day = todayKey(now);
  if (normalizedType === 'vocab' && signal.kind === 'flashcard') {
    profile.daily[day] = {
      ...(profile.daily[day] || {}),
      cardsReviewed: Number(profile.daily[day]?.cardsReviewed || 0) + 1
    };
  }

  if (normalizedType === 'vocab') {
    const current = profile.vocab[id] || {};
    profile.vocab[id] = entryWithEncounter(
      {
        ...current,
        ...(signal.srsState || {}),
        level: signal.level || current.level,
        sublevel: signal.sublevel || current.sublevel
      },
      signal,
      now
    );
  }

  if (normalizedType === 'grammar') {
    const current = profile.grammar[id] || { questions: {}, correct: 0, total: 0, mastery: 0 };
    let next = {
      ...current,
      level: signal.level || current.level,
      sublevel: signal.sublevel || current.sublevel
    };

    if (signal.kind === 'grammar-answer' && signal.questionId) {
      const question = current.questions?.[signal.questionId] || { correct: 0, total: 0 };
      const questionNext = {
        ...question,
        correct: Number(question.correct || 0) + (signal.correct ? 1 : 0),
        total: Number(question.total || 0) + 1,
        lastWrongAt: signal.correct ? question.lastWrongAt || null : now
      };
      const correct = Number(current.correct || 0) + (signal.correct ? 1 : 0);
      const total = Number(current.total || 0) + 1;
      next = {
        ...next,
        correct,
        total,
        mastery: masteryFromScore(correct, total),
        questions: {
          ...(current.questions || {}),
          [signal.questionId]: questionNext
        }
      };
    }

    profile.grammar[id] = entryWithEncounter(next, signal, now);
  }

  if (normalizedType === 'reading') {
    const current = profile.reading[id] || { tokenClicks: [] };
    const tokenClicks = Array.isArray(current.tokenClicks) ? current.tokenClicks : [];
    const clicked = signal.token ? [...new Set([...tokenClicks, signal.token])] : tokenClicks;
    profile.reading[id] = entryWithEncounter(
      {
        ...current,
        level: signal.level || current.level,
        sublevel: signal.sublevel || current.sublevel,
        readAt: signal.kind === 'reading-read' || signal.kind === 'reading-open' ? now : current.readAt,
        tokenClicks: clicked,
        addedVocab: signal.addedVocab || current.addedVocab || []
      },
      signal,
      now
    );
  }

  if (normalizedType === 'situations') {
    const current = profile.situations[id] || { shadowedLines: [] };
    const shadowedLines = Array.isArray(current.shadowedLines) ? current.shadowedLines : [];
    const line = signal.shadowedLine;
    profile.situations[id] = entryWithEncounter(
      {
        ...current,
        level: signal.level || current.level,
        sublevel: signal.sublevel || current.sublevel,
        doneAt: signal.kind === 'situation-done' || signal.kind === 'situation-open' ? now : current.doneAt,
        shadowedLines: line ? [...new Set([...shadowedLines, line])] : shadowedLines,
        addedVocab: signal.addedVocab || current.addedVocab || []
      },
      signal,
      now
    );
  }

  return saveProfile(profile);
}

export function recordVocabReview(cardId, grade, options = {}) {
  const { signal = {}, ...reviewOptions } = options;
  const result = recordReview(cardId, grade, reviewOptions);
  recordEncounter('vocab', cardId, {
    ...signal,
    kind: 'flashcard',
    grade,
    srsState: result.card,
    mode: 'flashcards'
  });
  return result;
}

export function getStruggling({ type, topN = 5 } = {}) {
  const profile = getProfile();
  const normalizedType = normalizeType(type);

  if (normalizedType === 'vocab' || !normalizedType) {
    const vocab = Object.entries(profile.vocab)
      .map(([id, entry]) => ({
        id,
        type: 'vocab',
        entry,
        score: Number(entry.lapses || 0)
      }))
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score || Number(a.entry.dueAt || 0) - Number(b.entry.dueAt || 0));
    if (normalizedType === 'vocab') {
      return vocab.slice(0, topN);
    }
  }

  const grammar = Object.entries(profile.grammar)
    .map(([id, entry]) => ({
      id,
      type: 'grammar',
      entry,
      score: 1 - Number(entry.mastery || 0)
    }))
    .filter((item) => Number(item.entry.total || 0) > 0 && Number(item.entry.mastery || 0) < 0.5)
    .sort((a, b) => b.score - a.score || Number(b.entry.total || 0) - Number(a.entry.total || 0));

  if (normalizedType === 'grammar') {
    return grammar.slice(0, topN);
  }

  return [...grammar, ...getStruggling({ type: 'vocab', topN })].slice(0, topN);
}

export function getMasteryByLevel(content = null) {
  const profile = getProfile();
  if (!content) {
    return { ...profile.level };
  }

  const buckets = Object.fromEntries(SUBLEVELS.map((sublevel) => [sublevel, []]));
  const add = (sublevel, value) => {
    if (buckets[sublevel]) {
      buckets[sublevel].push(Math.max(0, Math.min(1, value)));
    }
  };

  for (const item of content.vocabulary?.items || []) {
    const state = profile.vocab[item.id] || loadProgress()[item.id];
    const reps = Number(state?.reps || 0);
    const lapses = Number(state?.lapses || 0);
    add(item.sublevel, reps ? Math.max(0, Math.min(1, reps / 4 - lapses * 0.08)) : 0);
  }

  for (const item of content.grammar?.items || []) {
    add(item.sublevel, Number(profile.grammar[item.id]?.mastery || 0));
  }

  for (const item of content.reading?.items || []) {
    add(item.sublevel, profile.reading[item.id]?.readAt ? 1 : 0);
  }

  for (const item of content.situations?.items || []) {
    add(item.sublevel, profile.situations[item.id]?.doneAt ? 1 : 0);
  }

  const mastery = {};
  for (const [sublevel, values] of Object.entries(buckets)) {
    mastery[sublevel] = values.length
      ? values.reduce((sum, value) => sum + value, 0) / values.length
      : 0;
  }

  setProfile({ level: mastery });
  return mastery;
}

export function getTodayActivity({ now = Date.now() } = {}) {
  const profile = getProfile();
  return profile.daily[todayKey(now)] || { modes: [], newSeen: 0, activityCount: 0 };
}

export function getSrsSnapshot() {
  return {
    progress: loadProgress(),
    daily: loadDailyProgress()
  };
}
