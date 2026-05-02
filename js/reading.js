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
    button.className = 'token-button';
    button.textContent = token.es;
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
        <section class="card tinted-card--orange">
          <span class="chip">토큰</span>
          <p class="lede">스페인어 토큰을 클릭하면 한국어 뜻이 이곳에 표시됩니다.</p>
        </section>
      `;
    }

    return `
      <section class="card tinted-card--orange">
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
      <div class="split-layout">
        <aside class="card split-layout__sidebar">
          <span class="chip">지문</span>
          <h2 class="heading--flush">읽기 목록</h2>
          <div class="split-layout__sidebar-list">${renderSidebar()}</div>
          <p class="lede">읽음 ${readCount} / ${items.length}</p>
        </aside>
        <section class="stack">
          <section class="card">
            <span class="chip">${escapeHtml(item.level)} · ${escapeHtml(item.sublevel)}</span>
            <h2 class="heading--compact">${escapeHtml(item.title)}</h2>
            <p class="lede">${escapeHtml(item.translation_ko)}</p>
            <div class="action-row">
              <button type="button" class="link" id="reading-toggle">${state.showFullTranslation ? '전체 번역 숨기기' : '전체 번역 보기'}</button>
              <button type="button" class="link" id="reading-mark">읽음으로 표시</button>
            </div>
          </section>

          <section class="card" aria-live="polite">
            <h2>본문</h2>
            <p id="reading-text" class="lede reading-body"></p>
          </section>

          ${state.showFullTranslation ? `
            <section class="card tinted-card--green">
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
