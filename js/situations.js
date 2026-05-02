import { loadSituations } from './data.js';
import { get, namespace, set } from './storage.js';

const root = document.getElementById('situations-app');
const doneKey = namespace('situations', 1, 'done');

if (root) {
  init().catch((error) => {
    root.innerHTML = `
      <section class="card">
        <span class="chip">오류</span>
        <h2>상황극을 불러오지 못했습니다</h2>
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

async function init() {
  root.innerHTML = `
    <section class="card">
      <span class="chip">불러오는 중</span>
      <h2>상황극 데이터를 준비하고 있습니다</h2>
      <p class="lede">잠시만 기다리면 대화와 핵심 표현이 표시됩니다.</p>
    </section>
  `;

  const payload = await loadSituations();
  const items = Array.isArray(payload?.items) ? payload.items : [];

  if (!items.length) {
    root.innerHTML = `
      <section class="card">
        <span class="chip">비어 있음</span>
        <h2>상황극 데이터가 아직 없습니다</h2>
        <p class="lede">다음 단계에서 <code>data/situations.json</code>을 채우면 대화형 셸이 살아납니다.</p>
      </section>
    `;
    return;
  }

  const state = {
    selectedIndex: 0,
    showKorean: true,
    doneIds: new Set(get(doneKey, []))
  };

  function persistDoneState() {
    set(doneKey, [...state.doneIds]);
  }

  function markDone(itemId) {
    if (!state.doneIds.has(itemId)) {
      state.doneIds.add(itemId);
      persistDoneState();
    }
  }

  function selectItem(index) {
    state.selectedIndex = index;
    markDone(items[index].id);
    render();
  }

  markDone(items[state.selectedIndex].id);

  function renderSidebar() {
    return items
      .map((item, index) => {
        const active = index === state.selectedIndex ? 'aria-current="page"' : '';
        const done = state.doneIds.has(item.id) ? '✓' : '·';
        return `
          <button type="button" class="topic-button" data-situation-index="${index}" ${active}>
            <strong>${done} ${escapeHtml(item.title)}</strong>
            <span>${escapeHtml(item.level)} ${escapeHtml(item.sublevel)}</span>
          </button>
        `;
      })
      .join('');
  }

  function renderDialogue(item) {
    return item.dialogue
      .map((turn) => `
        <article class="card" style="background: rgba(138, 79, 29, 0.06);">
          <span class="chip">${escapeHtml(turn.speaker)}</span>
          <p class="lede" style="font-size:1.05rem;">${escapeHtml(turn.es)}</p>
          ${state.showKorean ? `<p class="lede">${escapeHtml(turn.ko)}</p>` : ''}
        </article>
      `)
      .join('');
  }

  function renderKeyPhrases(item) {
    if (!Array.isArray(item.key_phrases) || !item.key_phrases.length) {
      return '';
    }
    return `
      <section class="card">
        <span class="chip">핵심 표현</span>
        <div style="display:grid;gap:10px;margin-top:12px;">
          ${item.key_phrases
            .map(
              (phrase) => `
                <div class="card" style="background: rgba(138, 79, 29, 0.06);">
                  <strong>${escapeHtml(phrase.es)}</strong>
                  <p class="lede">${escapeHtml(phrase.ko)}</p>
                  <p class="lede">${escapeHtml(phrase.note_ko || '')}</p>
                </div>
              `
            )
            .join('')}
        </div>
      </section>
    `;
  }

  function renderShadowing(item) {
    if (!Array.isArray(item.shadowing) || !item.shadowing.length) {
      return '';
    }
    return `
      <section class="card">
        <span class="chip">새도잉</span>
        <div style="display:grid;gap:10px;margin-top:12px;">
          ${item.shadowing
            .map(
              (line) => {
                const entry = typeof line === 'string' ? { es: line, ko: '' } : line;
                return `
                <div class="card" style="background: rgba(72, 140, 90, 0.08);">
                  <p class="lede" style="font-size:1.08rem;margin-bottom:0;">${escapeHtml(entry.es)}</p>
                  ${state.showKorean && entry.ko ? `<p class="lede">${escapeHtml(entry.ko)}</p>` : ''}
                </div>
              `;
              }
            )
            .join('')}
        </div>
      </section>
    `;
  }

  function render() {
    const item = items[state.selectedIndex];
    const doneCount = state.doneIds.size;

    root.innerHTML = `
      <div style="display:grid;grid-template-columns:minmax(240px,280px) 1fr;gap:16px;align-items:start;">
        <aside class="card" style="display:grid;gap:12px;">
          <span class="chip">상황</span>
          <h2 style="margin-bottom:0;">장면 목록</h2>
          <div style="display:grid;gap:10px;">${renderSidebar()}</div>
          <p class="lede">완료 ${doneCount} / ${items.length}</p>
        </aside>
        <section class="stack">
          <section class="card">
            <span class="chip">${escapeHtml(item.level)} · ${escapeHtml(item.sublevel)}</span>
            <h2 style="margin-bottom:8px;">${escapeHtml(item.title)}</h2>
            <p class="lede">${escapeHtml(item.scene_ko)}</p>
            <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:14px;">
              <button type="button" class="link" id="situation-toggle">${state.showKorean ? '한국어 숨기기' : '한국어 보기'}</button>
              <button type="button" class="link" id="situation-mark">완료로 표시</button>
            </div>
          </section>

          <section class="card">
            <span class="chip">대화</span>
            <div style="display:grid;gap:12px;margin-top:12px;">
              ${renderDialogue(item)}
            </div>
          </section>

          ${renderKeyPhrases(item)}
          ${renderShadowing(item)}
        </section>
      </div>
    `;

    root.querySelectorAll('[data-situation-index]').forEach((button) => {
      button.addEventListener('click', () => {
        selectItem(Number(button.dataset.situationIndex));
      });
    });

    document.getElementById('situation-toggle')?.addEventListener('click', () => {
      state.showKorean = !state.showKorean;
      render();
    });

    document.getElementById('situation-mark')?.addEventListener('click', () => {
      markDone(item.id);
      render();
    });
  }

  render();
}
