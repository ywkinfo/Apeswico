import { loadReading } from './data.js';
import { get, namespace, set } from './storage.js';

const root = document.getElementById('reading-app');
const readKey = namespace('reading', 1, 'read');

if (root) {
  init().catch((error) => {
    root.innerHTML = `
      <section class="card">
        <span class="chip">오류</span>
        <h2>독해를 불러오지 못했습니다</h2>
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
      <h2>독해 지문을 준비하고 있습니다</h2>
      <p class="lede">잠시만 기다리면 토큰과 번역이 표시됩니다.</p>
    </section>
  `;

  const payload = await loadReading();
  const items = Array.isArray(payload?.items) ? payload.items : [];

  if (!items.length) {
    root.innerHTML = `
      <section class="card">
        <span class="chip">비어 있음</span>
        <h2>독해 데이터가 아직 없습니다</h2>
        <p class="lede">다음 단계에서 <code>data/reading.json</code>을 채우면 토큰 클릭 번역이 살아납니다.</p>
      </section>
    `;
    return;
  }

  const state = {
    selectedIndex: 0,
    activeToken: null,
    showFullTranslation: false,
    readIds: new Set(get(readKey, []))
  };

  function persistReadState() {
    set(readKey, [...state.readIds]);
  }

  function markRead(itemId) {
    if (!state.readIds.has(itemId)) {
      state.readIds.add(itemId);
      persistReadState();
    }
  }

  function selectItem(index) {
    state.selectedIndex = index;
    state.activeToken = null;
    markRead(items[index].id);
    render();
  }

  markRead(items[state.selectedIndex].id);

  function renderSidebar() {
    return items
      .map((item, index) => {
        const active = index === state.selectedIndex ? 'aria-current="page"' : '';
        const done = state.readIds.has(item.id) ? '✓' : '·';
        return `
          <button type="button" class="topic-button" data-reading-index="${index}" ${active}>
            <strong>${done} ${escapeHtml(item.title)}</strong>
            <span>${escapeHtml(item.level)} ${escapeHtml(item.sublevel)}</span>
          </button>
        `;
      })
      .join('');
  }

  function tokenButton(token, index) {
    const button = document.createElement('button');
    button.type = 'button';
    button.textContent = token.es;
    button.style.border = 'none';
    button.style.background = 'rgba(138, 79, 29, 0.12)';
    button.style.color = 'var(--accent-strong)';
    button.style.borderRadius = '999px';
    button.style.padding = '0.12rem 0.5rem';
    button.style.margin = '0 2px';
    button.style.cursor = 'pointer';
    button.style.font = 'inherit';
    button.style.boxShadow = 'inset 0 0 0 1px rgba(138, 79, 29, 0.12)';
    button.addEventListener('click', () => {
      state.activeToken = { ...token, index };
      render();
    });
    return button;
  }

  function renderTokens(item, container) {
    container.innerHTML = '';
    const fragment = document.createDocumentFragment();

    item.tokens.forEach((token, index) => {
      if (token.ko == null) {
        fragment.append(document.createTextNode(token.es));
        return;
      }
      fragment.append(tokenButton(token, index));
    });

    container.append(fragment);
  }

  function renderTranslationPanel(item) {
    if (!state.activeToken) {
      return `
        <section class="card" style="background: rgba(138, 79, 29, 0.08);">
          <span class="chip">토큰</span>
          <p class="lede">스페인어 토큰을 클릭하면 한국어 뜻이 이곳에 표시됩니다.</p>
        </section>
      `;
    }

    return `
      <section class="card" style="background: rgba(138, 79, 29, 0.08);">
        <span class="chip">토큰 번역</span>
        <h2>${escapeHtml(state.activeToken.es)}</h2>
        <p class="lede">${escapeHtml(state.activeToken.ko)}</p>
      </section>
    `;
  }

  function render() {
    const item = items[state.selectedIndex];
    const readCount = state.readIds.size;

    root.innerHTML = `
      <div style="display:grid;grid-template-columns:minmax(240px,280px) 1fr;gap:16px;align-items:start;">
        <aside class="card" style="display:grid;gap:12px;">
          <span class="chip">지문</span>
          <h2 style="margin-bottom:0;">읽기 목록</h2>
          <div style="display:grid;gap:10px;">${renderSidebar()}</div>
          <p class="lede">읽음 ${readCount} / ${items.length}</p>
        </aside>
        <section class="stack">
          <section class="card">
            <span class="chip">${escapeHtml(item.level)} · ${escapeHtml(item.sublevel)}</span>
            <h2 style="margin-bottom:8px;">${escapeHtml(item.title)}</h2>
            <p class="lede">${escapeHtml(item.translation_ko)}</p>
            <div style="display:flex;flex-wrap:wrap;gap:10px;margin-top:14px;">
              <button type="button" class="link" id="reading-toggle">${state.showFullTranslation ? '전체 번역 숨기기' : '전체 번역 보기'}</button>
              <button type="button" class="link" id="reading-mark">읽음으로 표시</button>
            </div>
          </section>

          <section class="card" aria-live="polite">
            <h2>본문</h2>
            <p id="reading-text" class="lede" style="line-height:2.05;font-size:1.08rem;"></p>
          </section>

          ${state.showFullTranslation ? `
            <section class="card" style="background: rgba(72, 140, 90, 0.08);">
              <span class="chip">전체 번역</span>
              <p class="lede">${escapeHtml(item.translation_ko)}</p>
            </section>
          ` : ''}

          ${renderTranslationPanel(item)}
        </section>
      </div>
    `;

    const textContainer = document.getElementById('reading-text');
    if (textContainer) {
      renderTokens(item, textContainer);
    }

    root.querySelectorAll('[data-reading-index]').forEach((button) => {
      button.addEventListener('click', () => {
        selectItem(Number(button.dataset.readingIndex));
      });
    });

    document.getElementById('reading-toggle')?.addEventListener('click', () => {
      state.showFullTranslation = !state.showFullTranslation;
      render();
    });

    document.getElementById('reading-mark')?.addEventListener('click', () => {
      markRead(item.id);
      render();
    });
  }

  render();
}
