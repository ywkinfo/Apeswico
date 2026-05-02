import { loadVocabulary } from './data.js';
import { getGraph, getRelated } from './content-graph.js';
import { recordVocabReview, touchDaily } from './learner.js';
import {
  GRADE,
  createCardState,
  getDueQueue,
  loadDailyProgress,
  loadProgress
} from './srs.js';

const root = document.getElementById('flashcards-app');

if (root) {
  init().catch((error) => {
    root.innerHTML = `
      <section class="card">
        <span class="chip">오류</span>
        <h2>플래시카드를 불러오지 못했습니다</h2>
        <p>${escapeHtml(error.message)}</p>
      </section>
    `;
  });
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => {
    const map = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    };
    return map[character] || character;
  });
}

function isShortcutTarget(target) {
  const element = target instanceof Element ? target : null;
  if (!element) {
    return false;
  }
  const tag = element.tagName.toLowerCase();
  return ['input', 'textarea', 'select', 'button'].includes(tag) || element.isContentEditable;
}

function createButton(label, className, onClick) {
  const button = document.createElement('button');
  button.type = 'button';
  button.textContent = label;
  if (className) {
    button.className = className;
  }
  button.addEventListener('click', onClick);
  return button;
}

function hashParam(name) {
  return new URLSearchParams(location.hash.replace(/^#/, '')).get(name);
}

function readingExcerpt(item) {
  const text = (item.tokens || []).map((token) => token.es).join('');
  return text.split(/(?<=[.!?])\s+/u)[0] || text;
}

function situationExcerpt(item) {
  const turn = (item.dialogue || [])[0];
  return turn ? `${turn.es} / ${turn.ko}` : item.scene_ko;
}

function relatedHref(type, id) {
  if (type === 'reading') {
    return `reading.html#passage=${encodeURIComponent(id)}`;
  }
  if (type === 'situations') {
    return `situations.html#situation=${encodeURIComponent(id)}`;
  }
  if (type === 'grammar') {
    return `grammar.html#topic=${encodeURIComponent(id)}`;
  }
  return `flashcards.html#card=${encodeURIComponent(id)}`;
}

async function init() {
  root.innerHTML = `
    <section class="card">
      <span class="chip">불러오는 중</span>
      <h2>어휘 데이터를 준비하고 있습니다</h2>
      <p class="lede">잠시만 기다리면 현재 학습 큐가 렌더링됩니다.</p>
    </section>
  `;

  touchDaily('flashcards');
  const [payload, graph] = await Promise.all([loadVocabulary(), getGraph()]);
  const deck = Array.isArray(payload?.items) ? payload.items : [];

  if (!deck.length) {
    root.innerHTML = `
      <section class="card">
        <span class="chip">비어 있음</span>
        <h2>어휘 데이터가 아직 없습니다</h2>
        <p class="lede">다음 단계에서 <code>data/vocabulary.json</code>을 채우면 여기에 카드가 나타납니다.</p>
      </section>
    `;
    return;
  }

  const progress = loadProgress();
  const linkedCardId = hashParam('card');
  const linkedCard = linkedCardId ? deck.find((card) => card.id === linkedCardId) : null;
  const queue = getDueQueue(deck, {
    progress,
    daily: loadDailyProgress(),
    newLimit: 10
  });
  if (linkedCard && !queue.some((item) => item.card.id === linkedCard.id)) {
    queue.unshift({
      card: linkedCard,
      progress: progress[linkedCard.id] || createCardState(linkedCard.id),
      kind: 'linked'
    });
  }

  const state = {
    queue,
    index: 0,
    revealed: false,
    reviewed: 0,
    counts: {
      again: 0,
      hard: 0,
      good: 0,
      easy: 0
    }
  };

  document.addEventListener('keydown', (event) => {
    if (isShortcutTarget(event.target)) {
      return;
    }
    if (event.key === ' ') {
      event.preventDefault();
      state.revealed = !state.revealed;
      render();
    }
    if (event.key === '1') {
      gradeCard(GRADE.AGAIN);
    }
    if (event.key === '2') {
      gradeCard(GRADE.HARD);
    }
    if (event.key === '3') {
      gradeCard(GRADE.GOOD);
    }
    if (event.key === '4') {
      gradeCard(GRADE.EASY);
    }
  });

  function currentItem() {
    return state.queue[state.index] || null;
  }

  function renderQueueSummary() {
    const dueCount = state.queue.length;
    const reviewed = state.reviewed;
    return `
      <div class="card">
        <span class="chip">진도</span>
        <h2>오늘의 학습 큐</h2>
        <p class="lede">현재 ${dueCount}장, 이번 세션 ${reviewed}장을 처리했습니다.</p>
      </div>
    `;
  }

  function renderDone() {
    root.innerHTML = `
      <div class="stack">
        ${renderQueueSummary()}
        <section class="card">
          <span class="chip">완료</span>
          <h2>오늘 학습 완료</h2>
          <p class="lede">플래시카드 큐를 모두 처리했습니다. 다음에 다시 열면 새로 계산된 큐가 표시됩니다.</p>
          <p class="lede">Again: ${state.counts.again} · Hard: ${state.counts.hard} · Good: ${state.counts.good} · Easy: ${state.counts.easy}</p>
          <button type="button" class="link" id="reload-flashcards">다시 불러오기</button>
        </section>
      </div>
    `;

    const reload = document.getElementById('reload-flashcards');
    reload?.addEventListener('click', () => {
      location.reload();
    });
  }

  function gradeCard(grade) {
    const item = currentItem();
    if (!item) {
      return;
    }

    recordVocabReview(item.card.id, grade, {
      signal: {
        level: item.card.level,
        sublevel: item.card.sublevel
      }
    });
    state.reviewed += 1;
    state.counts[grade] += 1;
    state.index += 1;
    state.revealed = false;
    render();
  }

  function renderCard() {
    const item = currentItem();
    if (!item) {
      renderDone();
      return;
    }

    const card = item.card;
    const related = getRelated({ type: 'vocab', id: card.id }, graph);
    const contexts = [
      ...related.reading.slice(0, 2),
      ...related.situations.slice(0, 2)
    ];
    const sideLabel = state.revealed ? '뒷면' : '앞면';
    const body = state.revealed
      ? `
        <div class="stack">
          <p class="lede"><strong>뜻</strong> ${escapeHtml(card.ko)}</p>
          <div class="flashcard-example">
            <span class="flashcard-example__label">예문</span>
            <p class="flashcard-example__es">${escapeHtml(card.example_es)}</p>
            <p class="flashcard-example__ko">${escapeHtml(card.example_ko)}</p>
          </div>
          <p class="lede"><strong>메모</strong> ${escapeHtml(card.pos)} · ${escapeHtml(card.level)} ${escapeHtml(card.sublevel)}</p>
          ${contexts.length ? `
            <section class="context-panel">
              <span class="chip">맥락에서 보기</span>
              <div class="related-grid">
                ${contexts
                  .map((entry) => `
                    <a class="related-card" href="${relatedHref(entry.type, entry.id)}">
                      <strong>${escapeHtml(entry.item.title)}</strong>
                      <span>${escapeHtml(entry.type === 'reading' ? readingExcerpt(entry.item) : situationExcerpt(entry.item))}</span>
                    </a>
                  `)
                  .join('')}
              </div>
            </section>
          ` : ''}
        </div>
      `
      : `
        <div class="placeholder placeholder--compact">
          <div>
            <p class="eyebrow">스페인어</p>
            <h2 class="heading--plain">${escapeHtml(card.es)}</h2>
          </div>
        </div>
      `;

    root.innerHTML = `
      <div class="stack">
        ${renderQueueSummary()}
        <section class="card" aria-live="polite">
          <span class="chip">${escapeHtml(item.kind === 'new' ? '신규' : '복습')} · ${sideLabel}</span>
          <h2 class="heading--compact">${escapeHtml(card.es)}</h2>
          <p class="lede">${escapeHtml(card.pos)} · ${escapeHtml(card.level)} ${escapeHtml(card.sublevel)}</p>
          ${body}
          <div class="grade-row">
            <button type="button" class="link" id="toggle-flashcard">${state.revealed ? '앞면 보기' : '뒷면 보기'}</button>
            <button type="button" class="link grade-btn--again" data-grade="${GRADE.AGAIN}">Again</button>
            <button type="button" class="link grade-btn--hard" data-grade="${GRADE.HARD}">Hard</button>
            <button type="button" class="link grade-btn--good" data-grade="${GRADE.GOOD}">Good</button>
            <button type="button" class="link grade-btn--easy" data-grade="${GRADE.EASY}">Easy</button>
          </div>
          <p class="lede shortcut-hint">단축키: Space 뒤집기, 1 Again, 2 Hard, 3 Good, 4 Easy</p>
        </section>
      </div>
    `;

    document.getElementById('toggle-flashcard')?.addEventListener('click', () => {
      state.revealed = !state.revealed;
      renderCard();
    });

    root.querySelectorAll('[data-grade]').forEach((button) => {
      button.addEventListener('click', () => {
        gradeCard(button.dataset.grade);
      });
    });
  }

  function render() {
    renderCard();
  }

  render();
}
