import { loadSituations } from './data.js';
import { findVocabMatches, getGraph, getRelated } from './content-graph.js';
import { getProfile, recordEncounter, touchDaily } from './learner.js';
import { createCardState, loadProgress, saveProgress } from './srs.js';
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

function hashParam(name) {
  return new URLSearchParams(location.hash.replace(/^#/, '')).get(name);
}

async function init() {
  root.innerHTML = `
    <section class="card">
      <span class="chip">불러오는 중</span>
      <h2>상황극 데이터를 준비하고 있습니다</h2>
      <p class="lede">잠시만 기다리면 대화와 핵심 표현이 표시됩니다.</p>
    </section>
  `;

  touchDaily('situations');
  const [payload, graph] = await Promise.all([loadSituations(), getGraph()]);
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

  const profile = getProfile();
  const hashSituation = hashParam('situation');
  const initialIndex = Math.max(0, items.findIndex((item) => item.id === hashSituation));
  const state = {
    selectedIndex: initialIndex,
    showKorean: true,
    doneIds: new Set([
      ...get(doneKey, []),
      ...Object.entries(profile.situations || {})
        .filter(([, entry]) => entry.doneAt)
        .map(([id]) => id)
    ])
  };

  function persistDoneState() {
    set(doneKey, [...state.doneIds]);
  }

  function markDone(itemId) {
    if (!state.doneIds.has(itemId)) {
      state.doneIds.add(itemId);
      persistDoneState();
    }
    const item = items.find((entry) => entry.id === itemId);
    if (item) {
      recordEncounter('situations', item.id, {
        kind: 'situation-done',
        level: item.level,
        sublevel: item.sublevel,
        mode: 'situations'
      });
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
        <article class="card tinted-card--orange-soft">
          <span class="chip">${escapeHtml(turn.speaker)}</span>
          <p class="lede dialogue-line">${escapeHtml(turn.es)}</p>
          ${state.showKorean ? `<p class="lede">${escapeHtml(turn.ko)}</p>` : ''}
        </article>
      `)
      .join('');
  }

  function renderKeyPhrases(item) {
    if (!Array.isArray(item.key_phrases) || !item.key_phrases.length) {
      return '';
    }
    const progress = loadProgress();
    return `
      <section class="card">
        <span class="chip">핵심 표현</span>
        <div class="content-list">
          ${item.key_phrases
            .map((phrase) => {
              const matches = findVocabMatches(phrase.es, graph, { limit: 2 });
              const badge = matches[0]
                ? progress[matches[0].id]
                  ? '내 덱에 있음'
                  : '새 단어'
                : '연결 어휘 없음';
              return `
                <div class="card tinted-card--orange-soft">
                  <span class="status-badge">${escapeHtml(badge)}</span>
                  <strong>${escapeHtml(phrase.es)}</strong>
                  <p class="lede">${escapeHtml(phrase.ko)}</p>
                  <p class="lede">${escapeHtml(phrase.note_ko || '')}</p>
                  ${matches.length ? `
                    <div class="chip-row">
                      ${matches.map((match) => `<a class="chip" href="flashcards.html#card=${encodeURIComponent(match.id)}">${escapeHtml(match.es)}</a>`).join('')}
                    </div>
                  ` : ''}
                </div>
              `;
            })
            .join('')}
        </div>
      </section>
    `;
  }

  function renderFocus(item) {
    const related = getRelated({ type: 'situations', id: item.id }, graph);
    const grammar = related.grammar.filter((entry) => entry.kind !== 'level-prereq');
    const vocab = related.vocab.filter((entry) => entry.kind !== 'level-prereq');
    if (!grammar.length && !vocab.length) {
      return '';
    }

    return `
      <section class="card">
        <span class="chip">연결 학습</span>
        ${grammar.length ? `
          <h2 class="heading--compact">이 상황의 문법 포인트</h2>
          <div class="chip-row">
            ${grammar.map((entry) => `<a class="chip" href="grammar.html#topic=${encodeURIComponent(entry.id)}">${escapeHtml(entry.item.title)}</a>`).join('')}
          </div>
        ` : ''}
        ${vocab.length ? `
          <h2 class="heading--compact">관련 어휘</h2>
          <div class="chip-row">
            ${vocab.slice(0, 10).map((entry) => `<a class="chip" href="flashcards.html#card=${encodeURIComponent(entry.id)}">${escapeHtml(entry.item.es)}</a>`).join('')}
          </div>
        ` : ''}
        <div class="action-row">
          <button type="button" class="link link--secondary" id="situation-add-vocab">관련 어휘 SRS에 추가</button>
        </div>
      </section>
    `;
  }

  function addSituationVocab(item) {
    const related = getRelated({ type: 'situations', id: item.id }, graph).vocab.filter((entry) => entry.kind !== 'level-prereq');
    const progress = loadProgress();
    const now = Date.now();
    const added = [];
    for (const entry of related) {
      if (!progress[entry.id]) {
        progress[entry.id] = createCardState(entry.id, now);
        added.push(entry.id);
      }
      recordEncounter('vocab', entry.id, {
        kind: 'situation-add',
        from: item.id,
        level: entry.item.level,
        sublevel: entry.item.sublevel,
        mode: 'situations'
      });
    }
    saveProgress(progress);
    recordEncounter('situations', item.id, {
      kind: 'situation-add-vocab',
      addedVocab: added,
      level: item.level,
      sublevel: item.sublevel,
      mode: 'situations'
    });
    render();
  }

  function renderShadowing(item) {
    if (!Array.isArray(item.shadowing) || !item.shadowing.length) {
      return '';
    }
    return `
      <section class="card">
        <span class="chip">새도잉</span>
        <div class="content-list">
          ${item.shadowing
            .map(
              (line) => {
                const entry = typeof line === 'string' ? { es: line, ko: '' } : line;
                return `
                <div class="card tinted-card--green">
                  <p class="lede shadowing-line">${escapeHtml(entry.es)}</p>
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
      <div class="split-layout">
        <aside class="card split-layout__sidebar">
          <span class="chip">상황</span>
          <h2 class="heading--flush">장면 목록</h2>
          <div class="split-layout__sidebar-list">${renderSidebar()}</div>
          <p class="lede">완료 ${doneCount} / ${items.length}</p>
        </aside>
        <section class="stack">
          <section class="card">
            <span class="chip">${escapeHtml(item.level)} · ${escapeHtml(item.sublevel)}</span>
            <h2 class="heading--compact">${escapeHtml(item.title)}</h2>
            <p class="lede">${escapeHtml(item.scene_ko)}</p>
            <div class="action-row">
              <button type="button" class="link" id="situation-toggle">${state.showKorean ? '한국어 숨기기' : '한국어 보기'}</button>
              <button type="button" class="link" id="situation-mark">완료로 표시</button>
            </div>
          </section>

          <section class="card">
            <span class="chip">대화</span>
            <div class="content-list content-list--roomy">
              ${renderDialogue(item)}
            </div>
          </section>

          ${renderKeyPhrases(item)}
          ${renderFocus(item)}
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

    document.getElementById('situation-add-vocab')?.addEventListener('click', () => {
      addSituationVocab(item);
    });
  }

  render();
}
