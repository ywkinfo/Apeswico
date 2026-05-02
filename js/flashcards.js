import { loadVocabulary } from './data.js';
import {
  GRADE,
  getDueQueue,
  loadDailyProgress,
  loadProgress,
  recordReview
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

async function init() {
  root.innerHTML = `
    <section class="card">
      <span class="chip">불러오는 중</span>
      <h2>어휘 데이터를 준비하고 있습니다</h2>
      <p class="lede">잠시만 기다리면 현재 학습 큐가 렌더링됩니다.</p>
    </section>
  `;

  const payload = await loadVocabulary();
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

  const state = {
    queue: getDueQueue(deck, {
      progress: loadProgress(),
      daily: loadDailyProgress(),
      newLimit: 10
    }),
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

    recordReview(item.card.id, grade);
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
    const sideLabel = state.revealed ? '뒷면' : '앞면';
    const body = state.revealed
      ? `
        <div class="stack">
          <p class="lede"><strong>뜻</strong> ${escapeHtml(card.ko)}</p>
          <p class="lede"><strong>예문</strong> ${escapeHtml(card.example_es)} / ${escapeHtml(card.example_ko)}</p>
          <p class="lede"><strong>메모</strong> ${escapeHtml(card.pos)} · ${escapeHtml(card.level)} ${escapeHtml(card.sublevel)}</p>
        </div>
      `
      : `
        <div class="placeholder" style="min-height: 180px;">
          <div>
            <p class="eyebrow">스페인어</p>
            <h2 style="margin: 0;">${escapeHtml(card.es)}</h2>
          </div>
        </div>
      `;

    root.innerHTML = `
      <div class="stack">
        ${renderQueueSummary()}
        <section class="card" aria-live="polite">
          <span class="chip">${escapeHtml(item.kind === 'new' ? '신규' : '복습')} · ${sideLabel}</span>
          <h2 style="margin-bottom: 8px;">${escapeHtml(card.es)}</h2>
          <p class="lede">${escapeHtml(card.pos)} · ${escapeHtml(card.level)} ${escapeHtml(card.sublevel)}</p>
          ${body}
          <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:18px;">
            <button type="button" class="link" id="toggle-flashcard">${state.revealed ? '앞면 보기' : '뒷면 보기'}</button>
            <button type="button" class="link" data-grade="${GRADE.AGAIN}" style="background:#b94a3a;">Again</button>
            <button type="button" class="link" data-grade="${GRADE.HARD}" style="background:#8f5c2e;">Hard</button>
            <button type="button" class="link" data-grade="${GRADE.GOOD}" style="background:#4f7f4d;">Good</button>
            <button type="button" class="link" data-grade="${GRADE.EASY}" style="background:#315f88;">Easy</button>
          </div>
          <p class="lede" style="margin-top: 12px;">단축키: Space 뒤집기, 1 Again, 2 Hard, 3 Good, 4 Easy</p>
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
