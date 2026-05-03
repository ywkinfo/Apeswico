import { loadReading } from './data.js';
import { findVocabMatches, getGraph, getRelated, normalizeText } from './content-graph.js';
import { getProfile, recordEncounter, touchDaily } from './learner.js';
import { createCardState, loadProgress, saveProgress } from './srs.js';
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

function escapeRegExp(value) {
  return String(value ?? '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function hashParam(name) {
  return new URLSearchParams(location.hash.replace(/^#/, '')).get(name);
}

function contentText(item) {
  return (item.tokens || []).map((token) => token.es).join('');
}

function firstSentence(item) {
  return contentText(item).split(/(?<=[.!?])\s+/u)[0] || contentText(item);
}

function situationExcerpt(item) {
  const turn = (item.dialogue || [])[0];
  return turn ? `${turn.es} / ${turn.ko}` : item.scene_ko;
}

function highlightedTokenSet(item) {
  return new Set(
    (item.sentences || [])
      .flatMap((sentence) => sentence.highlight || [])
      .map((entry) => normalizeText(entry))
      .filter(Boolean)
  );
}

function renderHighlightedSpan(text, highlights = []) {
  const terms = highlights
    .filter((entry) => typeof entry === 'string' && entry.trim())
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp);

  if (!terms.length) {
    return escapeHtml(text);
  }

  const pattern = new RegExp(`(?<![\\p{L}\\p{M}\\p{N}])(${terms.join('|')})(?![\\p{L}\\p{M}\\p{N}])`, 'giu');
  const source = String(text ?? '');
  let result = '';
  let lastIndex = 0;
  for (const match of source.matchAll(pattern)) {
    result += escapeHtml(source.slice(lastIndex, match.index));
    result += `<mark class="story-line__highlight">${escapeHtml(match[0])}</mark>`;
    lastIndex = match.index + match[0].length;
  }
  result += escapeHtml(source.slice(lastIndex));
  return result;
}

function grammarHrefForLine(line) {
  const params = new URLSearchParams({ topic: line.grammar_id });
  if (Number.isInteger(line.question_number) && line.question_number > 0) {
    params.set('q', String(line.question_number));
  }
  return `grammar.html#${params.toString()}`;
}

function dueLabel(cardState) {
  if (!cardState) {
    return '새 단어';
  }
  if (!cardState.reps) {
    return '학습 대기';
  }
  const diff = Math.ceil((cardState.dueAt - Date.now()) / (24 * 60 * 60 * 1000));
  if (diff <= 0) {
    return '오늘 복습';
  }
  return `${diff}일 후 복습`;
}

async function init() {
  root.innerHTML = `
    <section class="card">
      <span class="chip">불러오는 중</span>
      <h2>독해 지문을 준비하고 있습니다</h2>
      <p class="lede">잠시만 기다리면 토큰과 번역이 표시됩니다.</p>
    </section>
  `;

  touchDaily('reading');
  const [payload, graph] = await Promise.all([loadReading(), getGraph()]);
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

  const profile = getProfile();
  const hashPassage = hashParam('passage');
  const initialIndex = Math.max(0, items.findIndex((item) => item.id === hashPassage));
  const state = {
    selectedIndex: initialIndex,
    activeToken: null,
    showFullTranslation: false,
    readIds: new Set([
      ...get(readKey, []),
      ...Object.entries(profile.reading || {})
        .filter(([, entry]) => entry.readAt)
        .map(([id]) => id)
    ])
  };

  function persistReadState() {
    set(readKey, [...state.readIds]);
  }

  function markRead(itemId) {
    if (!state.readIds.has(itemId)) {
      state.readIds.add(itemId);
      persistReadState();
    }
    const item = items.find((entry) => entry.id === itemId);
    if (item) {
      recordEncounter('reading', item.id, {
        kind: 'reading-read',
        level: item.level,
        sublevel: item.sublevel,
        mode: 'reading'
      });
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

  function tokenButton(item, token, index, highlighted = false) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = highlighted ? 'token-button token-button--highlight' : 'token-button';
    button.textContent = token.es;
    button.addEventListener('click', () => {
      const vocabMatches = findVocabMatches(token.es, graph, { limit: 4 });
      state.activeToken = { ...token, index, vocabMatches };
      recordEncounter('reading', item.id, {
        kind: 'token-click',
        token: token.es,
        vocabIds: vocabMatches.map((match) => match.id),
        level: item.level,
        sublevel: item.sublevel,
        mode: 'reading'
      });
      for (const vocab of vocabMatches) {
        recordEncounter('vocab', vocab.id, {
          kind: 'reading-click',
          from: item.id,
          token: token.es,
          level: vocab.level,
          sublevel: vocab.sublevel,
          mode: 'reading'
        });
      }
      render();
    });
    return button;
  }

  function renderTokens(item, container) {
    container.innerHTML = '';
    const fragment = document.createDocumentFragment();
    const highlights = highlightedTokenSet(item);

    item.tokens.forEach((token, index) => {
      if (token.ko == null) {
        fragment.append(document.createTextNode(token.es));
        return;
      }
      fragment.append(tokenButton(item, token, index, highlights.has(normalizeText(token.es))));
    });

    container.append(fragment);
  }

  function renderStoryTimeline(item) {
    if (!Array.isArray(item.sentences) || !item.sentences.length) {
      return '';
    }

    const lines = item.sentences
      .map((line) => `
        <a
          class="story-line"
          href="${escapeHtml(grammarHrefForLine(line))}"
          data-grammar-id="${escapeHtml(line.grammar_id)}"
          data-sentence-id="${escapeHtml(line.id)}"
          data-question-number="${escapeHtml(line.question_number || '')}"
        >
          <span class="story-line__stage">${escapeHtml(line.stage_emoji)} ${escapeHtml(line.stage_ko)}</span>
          <p class="story-line__es">${renderHighlightedSpan(line.es, line.highlight)}</p>
          <p class="story-line__ko">${escapeHtml(line.ko)}</p>
          <span class="chip story-line__tense">${escapeHtml(line.tense_ko)} - ${escapeHtml(line.grammar_id)}</span>
        </a>
      `)
      .join('');

    return `
      <section class="card story-timeline" aria-label="시제 타임라인">
        <span class="chip">시제 타임라인</span>
        <h2 class="heading--compact">한 인생 = 한 시제 지도</h2>
        <p class="lede">각 문장을 누르면 해당 문법 토픽으로 이동합니다.</p>
        <div class="story-timeline__lines">${lines}</div>
      </section>
    `;
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

    const progress = loadProgress();
    const vocabMatches = state.activeToken.vocabMatches || [];
    const primaryVocab = vocabMatches[0] || null;
    const primaryRelated = primaryVocab ? getRelated({ type: 'vocab', id: primaryVocab.id }, graph) : null;
    const otherPlaces = primaryRelated
      ? [
          ...primaryRelated.reading.filter((entry) => entry.id !== item.id).slice(0, 2),
          ...primaryRelated.situations.slice(0, 2)
        ]
      : [];

    return `
      <section class="card tinted-card--orange">
        <span class="chip">토큰 번역</span>
        <h2>${escapeHtml(state.activeToken.es)}</h2>
        <p class="lede">${escapeHtml(state.activeToken.ko)}</p>
        ${primaryVocab ? `
          <div class="content-list">
            <a class="related-card" href="flashcards.html#card=${encodeURIComponent(primaryVocab.id)}">
              <strong>${escapeHtml(primaryVocab.es)} · SRS 덱</strong>
              <span>${escapeHtml(dueLabel(progress[primaryVocab.id]))}</span>
            </a>
          </div>
        ` : '<p class="lede">연결된 SRS 어휘가 아직 없습니다.</p>'}
        ${otherPlaces.length ? `
          <div class="context-panel">
            <span class="chip">이 단어가 나오는 다른 곳</span>
            <div class="related-grid">
              ${otherPlaces
                .map((entry) => `
                  <a class="related-card" href="${entry.type === 'reading' ? `reading.html#passage=${encodeURIComponent(entry.id)}` : `situations.html#situation=${encodeURIComponent(entry.id)}`}">
                    <strong>${escapeHtml(entry.item.title)}</strong>
                    <span>${escapeHtml(entry.type === 'reading' ? firstSentence(entry.item) : situationExcerpt(entry.item))}</span>
                  </a>
                `)
                .join('')}
            </div>
          </div>
        ` : ''}
      </section>
    `;
  }

  function renderGrammarChips(item) {
    const related = getRelated({ type: 'reading', id: item.id }, graph).grammar.filter((entry) => entry.kind !== 'level-prereq');
    if (!related.length) {
      return '';
    }
    return `
      <div class="chip-row" aria-label="이 글의 문법 포인트">
        ${related
          .map((entry) => `
            <a class="chip" href="grammar.html#topic=${encodeURIComponent(entry.id)}">${escapeHtml(entry.id)} ${escapeHtml(entry.item.title)}</a>
          `)
          .join('')}
      </div>
    `;
  }

  function relatedVocabForReading(item) {
    return getRelated({ type: 'reading', id: item.id }, graph).vocab.filter((entry) => entry.kind !== 'level-prereq');
  }

  function addReadingVocab(item) {
    const progress = loadProgress();
    const related = relatedVocabForReading(item).filter((entry) => !progress[entry.id]);
    const now = Date.now();
    for (const entry of related) {
      progress[entry.id] = createCardState(entry.id, now);
      recordEncounter('vocab', entry.id, {
        kind: 'reading-add',
        from: item.id,
        level: entry.item.level,
        sublevel: entry.item.sublevel,
        mode: 'reading'
      });
    }
    saveProgress(progress);
    recordEncounter('reading', item.id, {
      kind: 'reading-add-vocab',
      addedVocab: related.map((entry) => entry.id),
      level: item.level,
      sublevel: item.sublevel,
      mode: 'reading'
    });
    render();
  }

  function render() {
    const item = items[state.selectedIndex];
    const readCount = state.readIds.size;
    const newVocabCount = relatedVocabForReading(item).filter((entry) => !loadProgress()[entry.id]).length;

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
            ${renderGrammarChips(item)}
            <div class="action-row">
              <button type="button" class="link" id="reading-toggle">${state.showFullTranslation ? '전체 번역 숨기기' : '전체 번역 보기'}</button>
              <button type="button" class="link" id="reading-mark">읽음으로 표시</button>
              <button type="button" class="link link--secondary" id="reading-add-vocab">새 단어 ${newVocabCount}개 SRS에 추가</button>
            </div>
          </section>

          ${renderStoryTimeline(item)}

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

    document.getElementById('reading-add-vocab')?.addEventListener('click', () => {
      addReadingVocab(item);
    });

    root.querySelectorAll('[data-sentence-id]').forEach((link) => {
      link.addEventListener('click', () => {
        recordEncounter('reading', item.id, {
          kind: 'sentence-jump',
          grammarId: link.dataset.grammarId,
          sentenceId: link.dataset.sentenceId,
          questionNumber: Number(link.dataset.questionNumber) || null,
          level: item.level,
          sublevel: item.sublevel,
          mode: 'reading'
        });
      });
    });
  }

  render();
}
