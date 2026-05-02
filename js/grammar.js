import { loadGrammar } from './data.js';
import { getGraph, getRelated } from './content-graph.js';
import { recordEncounter, touchDaily } from './learner.js';
import { get, namespace, set } from './storage.js';

const root = document.getElementById('grammar-app');
const scoreKey = namespace('grammar', 1, 'scores');

if (root) {
  init().catch((error) => {
    root.innerHTML = `
      <section class="card">
        <span class="chip">오류</span>
        <h2>문법을 불러오지 못했습니다</h2>
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

function stripAccents(text) {
  return String(text ?? '').normalize('NFD').replace(/\p{M}/gu, '');
}

function normalizeAnswer(text, { caseSensitive, accentSensitive }) {
  let value = String(text ?? '').trim().replace(/\s+/g, ' ');
  if (!caseSensitive) {
    value = value.toLowerCase();
  }
  if (!accentSensitive) {
    value = stripAccents(value);
  }
  return value;
}

function loadScores() {
  return get(scoreKey, {});
}

function saveScores(scores) {
  set(scoreKey, scores);
}

function updateScore(topicId, correct) {
  const scores = loadScores();
  const current = scores[topicId] || { correct: 0, total: 0 };
  const next = {
    correct: current.correct + (correct ? 1 : 0),
    total: current.total + 1
  };
  scores[topicId] = next;
  saveScores(scores);
  return next;
}

function topicAccuracy(topicId) {
  const score = loadScores()[topicId];
  if (!score || !score.total) {
    return null;
  }
  return Math.round((score.correct / score.total) * 100);
}

function renderStem(question) {
  return `
    <p class="lede">${escapeHtml(question.stem)}</p>
    ${question.stem_ko ? `<p class="lede">${escapeHtml(question.stem_ko)}</p>` : ''}
  `;
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

async function init() {
  root.innerHTML = `
    <section class="card">
      <span class="chip">불러오는 중</span>
      <h2>문법 토픽을 준비하고 있습니다</h2>
      <p class="lede">잠시만 기다리면 토픽과 문항이 나타납니다.</p>
    </section>
  `;

  touchDaily('grammar');
  const [payload, graph] = await Promise.all([loadGrammar(), getGraph()]);
  const topics = Array.isArray(payload?.items) ? payload.items : [];

  if (!topics.length) {
    root.innerHTML = `
      <section class="card">
        <span class="chip">비어 있음</span>
        <h2>문법 데이터가 아직 없습니다</h2>
        <p class="lede">다음 단계에서 <code>data/grammar.json</code>이 채워지면 퀴즈가 표시됩니다.</p>
      </section>
    `;
    return;
  }

  const hashTopic = hashParam('topic');
  const topicIndex = Math.max(0, topics.findIndex((topic) => topic.id === hashTopic));
  const hashQuestion = hashParam('q');
  const initialQuestion = Number.isFinite(Number(hashQuestion)) ? Math.max(0, Number(hashQuestion) - 1) : 0;
  const state = {
    topicIndex,
    questionIndex: initialQuestion,
    answered: null,
    showExamples: false
  };
  if (state.questionIndex >= (topics[state.topicIndex]?.questions?.length || 0)) {
    state.questionIndex = 0;
  }

  function currentTopic() {
    return topics[state.topicIndex] || null;
  }

  function currentQuestion() {
    const topic = currentTopic();
    return topic?.questions?.[state.questionIndex] || null;
  }

  function topicListMarkup() {
    return topics
      .map((topic, index) => {
        const active = index === state.topicIndex ? 'aria-current="true"' : '';
        const accuracy = topicAccuracy(topic.id);
        const scoreLine = accuracy == null ? '기록 없음' : `${accuracy}%`;
        return `
          <button type="button" class="topic-button" data-topic-index="${index}" ${active}>
            <strong>${escapeHtml(topic.title)}</strong>
            <span>${escapeHtml(topic.level)} ${escapeHtml(topic.sublevel)}</span>
            <small>${escapeHtml(scoreLine)}</small>
          </button>
        `;
      })
      .join('');
  }

  function renderRelatedExamples(topic) {
    const related = getRelated({ type: 'grammar', id: topic.id }, graph);
    const examples = [...related.reading.slice(0, 2), ...related.situations.slice(0, 2)];
    if (!examples.length || !state.showExamples) {
      return '';
    }
    return `
      <section class="card tinted-card--orange-soft">
        <span class="chip">예문 더 보기</span>
        <div class="content-list">
          ${examples
            .map((entry) => `
              <a class="related-card" href="${entry.type === 'reading' ? `reading.html#passage=${encodeURIComponent(entry.id)}` : `situations.html#situation=${encodeURIComponent(entry.id)}`}">
                <strong>${escapeHtml(entry.item.title)}</strong>
                <span>${escapeHtml(entry.type === 'reading' ? readingExcerpt(entry.item) : situationExcerpt(entry.item))}</span>
              </a>
            `)
            .join('')}
        </div>
      </section>
    `;
  }

  function renderFeedback(topic, question, result) {
    const solution = Array.isArray(result.solution) ? result.solution.join(' · ') : '';
    const examplesToggle = `
      <div class="action-row">
        <button type="button" class="link link--secondary" id="grammar-examples-toggle">${state.showExamples ? '예문 접기' : '예문 더 보기'}</button>
      </div>
      ${renderRelatedExamples(topic)}
    `;
    if (result.correct) {
      return `
        <section class="card tinted-card--green-strong">
          <span class="chip">정답</span>
          <p class="lede">좋습니다. ${escapeHtml(question.explanation_ko || '설명을 준비 중입니다.')}</p>
        </section>
        ${examplesToggle}
      `;
    }

    if (result.accentOnly) {
      return `
        <section class="card tinted-card--orange-strong">
          <span class="chip">악센트 주의</span>
          <p class="lede">철자는 맞지만 악센트가 빠졌습니다. 정답 예시: ${escapeHtml(solution)}</p>
          <p class="lede">${escapeHtml(question.explanation_ko || '설명을 준비 중입니다.')}</p>
        </section>
        ${examplesToggle}
      `;
    }

    return `
      <section class="card tinted-card--red">
        <span class="chip">오답</span>
        <p class="lede">정답 예시: ${escapeHtml(solution || '정답을 준비 중입니다.')}</p>
        <p class="lede">${escapeHtml(question.explanation_ko || '설명을 준비 중입니다.')}</p>
      </section>
      ${examplesToggle}
    `;
  }

  function evaluateFill(question, values) {
    const caseSensitive = question.case_sensitive ?? false;
    const accentSensitive = question.accent_sensitive ?? true;
    const accepted = Array.isArray(question.accepted_answers) ? question.accepted_answers : [];

    const exact = accepted.find((answerSet) => {
      if (!Array.isArray(answerSet) || answerSet.length !== values.length) {
        return false;
      }
      return values.every(
        (value, index) =>
          normalizeAnswer(value, { caseSensitive, accentSensitive: true }) ===
          normalizeAnswer(answerSet[index], { caseSensitive, accentSensitive: true })
      );
    });

    if (exact) {
      return { correct: true, solution: exact };
    }

    if (accentSensitive) {
      const accentMatch = accepted.find((answerSet) => {
        if (!Array.isArray(answerSet) || answerSet.length !== values.length) {
          return false;
        }
        return values.every(
          (value, index) =>
            normalizeAnswer(value, { caseSensitive, accentSensitive: false }) ===
            normalizeAnswer(answerSet[index], { caseSensitive, accentSensitive: false })
        );
      });

      if (accentMatch) {
        return { correct: false, accentOnly: true, solution: accentMatch };
      }
    }

    return { correct: false, solution: accepted[0] || [] };
  }

  function evaluateChoice(question, selectedIndex) {
    const correct = Number(selectedIndex) === Number(question.answer_index);
    return {
      correct,
      solution:
        Array.isArray(question.choices) && question.choices.length
          ? [question.choices[question.answer_index]]
          : []
    };
  }

  function submitAnswer(event) {
    event.preventDefault();
    if (state.answered) {
      return;
    }

    const topic = currentTopic();
    const question = currentQuestion();
    if (!topic || !question) {
      return;
    }

    let result;
    if (question.type === 'fill') {
      const blankCount = (question.stem.match(/___/g) || []).length || 1;
      const values = [];
      for (let index = 0; index < blankCount; index += 1) {
        const input = root.querySelector(`[data-blank-index="${index}"]`);
        values.push(input?.value ?? '');
      }
      result = evaluateFill(question, values);
    } else {
      const selected = root.querySelector('input[name="choice-answer"]:checked');
      result = evaluateChoice(question, selected?.value);
    }

    state.answered = result;
    updateScore(topic.id, result.correct);
    recordEncounter('grammar', topic.id, {
      kind: 'grammar-answer',
      questionId: question.id,
      correct: result.correct,
      level: topic.level,
      sublevel: topic.sublevel,
      mode: 'grammar'
    });
    render();
  }

  function advance() {
    const topic = currentTopic();
    if (!topic) {
      return;
    }
    const lastQuestion = state.questionIndex >= (topic.questions?.length || 1) - 1;
    if (lastQuestion) {
      state.topicIndex = (state.topicIndex + 1) % topics.length;
      state.questionIndex = 0;
    } else {
      state.questionIndex += 1;
    }
    state.answered = null;
    render();
  }

  function selectTopic(index) {
    state.topicIndex = index;
    state.questionIndex = 0;
    state.answered = null;
    state.showExamples = false;
    const topic = topics[index];
    if (topic) {
      recordEncounter('grammar', topic.id, {
        kind: 'topic-view',
        level: topic.level,
        sublevel: topic.sublevel,
        mode: 'grammar'
      });
    }
    render();
  }

  function renderRelatedTopic(topic) {
    const related = getRelated({ type: 'grammar', id: topic.id }, graph);
    const examples = [...related.reading.slice(0, 3), ...related.situations.slice(0, 3)];
    if (!examples.length) {
      return '';
    }
    return `
      <div class="related-grid" aria-label="이 문법이 쓰인 콘텐츠">
        ${examples
          .map((entry) => `
            <a class="related-card" href="${entry.type === 'reading' ? `reading.html#passage=${encodeURIComponent(entry.id)}` : `situations.html#situation=${encodeURIComponent(entry.id)}`}">
              <strong>${escapeHtml(entry.item.title)}</strong>
              <span>${escapeHtml(entry.type === 'reading' ? readingExcerpt(entry.item) : situationExcerpt(entry.item))}</span>
            </a>
          `)
          .join('')}
      </div>
    `;
  }

  function renderReinforceCta(topic) {
    const relatedReading = getRelated({ type: 'grammar', id: topic.id }, graph).reading[0];
    if (!relatedReading) {
      return '';
    }
    return `
      <a class="link" href="reading.html#passage=${encodeURIComponent(relatedReading.id)}">관련 독해로 강화하기</a>
    `;
  }

  function renderQuestion(topic, question) {
    if (!question) {
      return `
        <section class="card">
          <span class="chip">빈 상태</span>
          <h2>문항이 없습니다</h2>
        </section>
      `;
    }

    if (question.type === 'fill') {
      const blankCount = (question.stem.match(/___/g) || []).length || 1;
      const blanks = Array.from({ length: blankCount }, (_, index) => `
        <label class="field-label">
          <span class="eyebrow">빈칸 ${index + 1}</span>
          <input
            type="text"
            data-blank-index="${index}"
            autocomplete="off"
            spellcheck="false"
            class="field-input"
          />
        </label>
      `).join('');

      return `
        <form id="grammar-form" class="stack">
          <section class="card">
            <span class="chip">빈칸 채우기</span>
            <h2>${escapeHtml(question.id)}</h2>
            ${renderStem(question)}
            <div class="stack">${blanks}</div>
          </section>
          ${state.answered ? renderFeedback(topic, question, state.answered) : ''}
          <div class="button-row">
            <button type="submit" class="link">${state.answered ? '다시 채점' : '정답 확인'}</button>
            ${state.answered ? `<button type="button" class="link" id="grammar-next">다음 문제</button>` : ''}
            ${state.answered ? renderReinforceCta(topic) : ''}
          </div>
        </form>
      `;
    }

    const choices = Array.isArray(question.choices)
      ? question.choices
          .map(
            (choice, index) => `
              <label class="card choice-row">
                <input type="radio" name="choice-answer" value="${index}" class="choice-radio" />
                <span>${escapeHtml(choice)}</span>
              </label>
            `
          )
          .join('')
      : '';

    return `
      <form id="grammar-form" class="stack">
        <section class="card">
          <span class="chip">객관식</span>
          <h2>${escapeHtml(question.id)}</h2>
          ${renderStem(question)}
          <div class="stack">${choices}</div>
        </section>
        ${state.answered ? renderFeedback(topic, question, state.answered) : ''}
        <div class="button-row">
          <button type="submit" class="link">${state.answered ? '다시 채점' : '정답 확인'}</button>
          ${state.answered ? `<button type="button" class="link" id="grammar-next">다음 문제</button>` : ''}
          ${state.answered ? renderReinforceCta(topic) : ''}
        </div>
      </form>
    `;
  }

  function render() {
    const topic = currentTopic();
    const question = currentQuestion();

    root.innerHTML = `
      <div class="split-layout">
        <aside class="card split-layout__sidebar">
          <span class="chip">토픽</span>
          <h2 class="heading--flush">학습 목록</h2>
          <div class="split-layout__sidebar-list">${topicListMarkup()}</div>
        </aside>
        <section class="stack">
          <section class="card">
            <span class="chip">${escapeHtml(topic?.level || 'B1-B2')} · ${escapeHtml(topic?.sublevel || '')}</span>
            <h2 class="heading--compact">${escapeHtml(topic?.title || '토픽')}</h2>
            <p class="lede">${escapeHtml(topic?.explanation_ko || '문법 해설을 준비 중입니다.')}</p>
            <p class="lede">문항 ${state.questionIndex + 1} / ${topic?.questions?.length || 0}</p>
            ${topic ? renderRelatedTopic(topic) : ''}
          </section>
          ${renderQuestion(topic, question)}
        </section>
      </div>
    `;

    root.querySelectorAll('[data-topic-index]').forEach((button) => {
      button.addEventListener('click', () => {
        selectTopic(Number(button.dataset.topicIndex));
      });
    });

    const form = document.getElementById('grammar-form');
    form?.addEventListener('submit', submitAnswer);

    const next = document.getElementById('grammar-next');
    next?.addEventListener('click', advance);

    const examplesToggle = document.getElementById('grammar-examples-toggle');
    examplesToggle?.addEventListener('click', () => {
      state.showExamples = !state.showExamples;
      render();
    });
  }

  render();
}
