import { get, namespace, set } from './storage.js';

const CARDS_KEY = namespace('srs', 1, 'cards');
const DAILY_KEY = namespace('srs', 1, 'daily');
const MIN_EASE = 1.3;
const DEFAULT_EASE = 2.5;
const DAY = 24 * 60 * 60 * 1000;
const TEN_MINUTES = 10 * 60 * 1000;
const GRADE_INDEX = ['again', 'hard', 'good', 'easy'];

export const GRADE = Object.freeze({
  AGAIN: 'again',
  HARD: 'hard',
  GOOD: 'good',
  EASY: 'easy'
});

function clampEase(value) {
  return Math.max(MIN_EASE, Number.isFinite(value) ? value : DEFAULT_EASE);
}

function normalizeGrade(grade) {
  if (typeof grade === 'number') {
    return GRADE_INDEX[grade - 1] || GRADE.GOOD;
  }
  const normalized = String(grade || '').toLowerCase();
  if (GRADE_INDEX.includes(normalized)) {
    return normalized;
  }
  return GRADE.GOOD;
}

function todayKey(now = Date.now()) {
  return new Date(now).toLocaleDateString('en-CA');
}

function defaultCardState(id, now = Date.now()) {
  return {
    id,
    intervalDays: 0,
    ease: DEFAULT_EASE,
    dueAt: now,
    reps: 0,
    lapses: 0,
    lastReviewedAt: null,
    createdAt: now
  };
}

function loadCardState() {
  return get(CARDS_KEY, {});
}

function saveCardState(state) {
  set(CARDS_KEY, state);
  return state;
}

function loadDailyState() {
  return get(DAILY_KEY, {});
}

function saveDailyState(state) {
  set(DAILY_KEY, state);
  return state;
}

function isNewCard(progress) {
  return !progress || progress.reps === 0;
}

function makeNextCard(current, grade, now = Date.now()) {
  const normalizedGrade = normalizeGrade(grade);
  const isNew = isNewCard(current);
  let intervalDays = current.intervalDays;
  let ease = clampEase(current.ease);
  let dueAt = now;
  let lapses = current.lapses;
  const reps = current.reps + 1;

  if (isNew) {
    if (normalizedGrade === GRADE.AGAIN) {
      dueAt = now + TEN_MINUTES;
      intervalDays = 0;
    } else if (normalizedGrade === GRADE.HARD) {
      dueAt = now + DAY;
      intervalDays = 1;
      ease = clampEase(ease * 0.9);
    } else if (normalizedGrade === GRADE.EASY) {
      dueAt = now + 4 * DAY;
      intervalDays = 4;
      ease = clampEase(ease * 1.05);
    } else {
      dueAt = now + 2 * DAY;
      intervalDays = 2;
    }
  } else if (normalizedGrade === GRADE.AGAIN) {
    dueAt = now + TEN_MINUTES;
    intervalDays = 0;
    lapses += 1;
    ease = clampEase(ease * 0.8);
  } else if (normalizedGrade === GRADE.HARD) {
    intervalDays = Math.max(1, Math.round(Math.max(1, intervalDays) * 1.2));
    dueAt = now + intervalDays * DAY;
    ease = clampEase(ease * 0.85);
  } else if (normalizedGrade === GRADE.EASY) {
    intervalDays = Math.max(1, Math.round(Math.max(1, intervalDays) * ease * 1.3));
    dueAt = now + intervalDays * DAY;
    ease = clampEase(ease * 1.05);
  } else {
    intervalDays = Math.max(1, Math.round(Math.max(1, intervalDays) * ease));
    dueAt = now + intervalDays * DAY;
  }

  return {
    ...current,
    intervalDays,
    ease,
    dueAt,
    reps,
    lapses,
    lastReviewedAt: now
  };
}

function newCardAllowance(dailyState, now = Date.now(), limit = 10) {
  const key = todayKey(now);
  const today = dailyState[key] || { newSeen: 0 };
  return Math.max(0, limit - (today.newSeen || 0));
}

function recordNewCardSeen(dailyState, now = Date.now()) {
  const key = todayKey(now);
  const today = dailyState[key] || { newSeen: 0 };
  return {
    ...dailyState,
    [key]: {
      ...today,
      newSeen: (today.newSeen || 0) + 1
    }
  };
}

export function createCardState(id, now = Date.now()) {
  return defaultCardState(id, now);
}

export function loadProgress() {
  return loadCardState();
}

export function loadDailyProgress() {
  return loadDailyState();
}

export function saveProgress(progress) {
  return saveCardState(progress);
}

export function saveDailyProgress(daily) {
  return saveDailyState(daily);
}

export function getNewCardAllowanceForToday({ now = Date.now(), limit = 10 } = {}) {
  return newCardAllowance(loadDailyState(), now, limit);
}

export function getDueQueue(cards, { now = Date.now(), newLimit = 10, progress = loadCardState(), daily = loadDailyState() } = {}) {
  const dueReview = [];
  const freshCards = [];
  const allowance = newCardAllowance(daily, now, newLimit);
  const maxFresh = Math.min(newLimit, allowance);

  for (const card of cards || []) {
    const cardProgress = progress[card.id];
    if (!cardProgress) {
      freshCards.push({
        card,
        progress: defaultCardState(card.id, now),
        kind: 'new'
      });
      continue;
    }

    if (cardProgress.dueAt <= now) {
      dueReview.push({
        card,
        progress: cardProgress,
        kind: 'review'
      });
    }
  }

  dueReview.sort((a, b) => a.progress.dueAt - b.progress.dueAt);

  return [
    ...dueReview,
    ...freshCards.slice(0, maxFresh)
  ];
}

export function recordReview(cardId, grade, { now = Date.now(), progress = loadCardState(), daily = loadDailyState() } = {}) {
  const current = progress[cardId] || defaultCardState(cardId, now);
  const nextCard = makeNextCard(current, grade, now);
  const nextProgress = {
    ...progress,
    [cardId]: nextCard
  };

  let nextDaily = daily;
  if (isNewCard(current)) {
    nextDaily = recordNewCardSeen(daily, now);
  }

  saveCardState(nextProgress);
  saveDailyState(nextDaily);

  return {
    card: nextCard,
    progress: nextProgress,
    daily: nextDaily
  };
}

export function resetProgress() {
  saveCardState({});
  saveDailyState({});
}
