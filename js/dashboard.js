import { loadAll } from './data.js';
import { getMasteryByLevel, getProfile, getStruggling, getTodayActivity, touchDaily } from './learner.js';
import { getDueQueue, getNewCardAllowanceForToday, loadDailyProgress, loadProgress } from './srs.js';

const root = document.getElementById('home-shell');
const SUBLEVELS = ['B1.1', 'B1.2', 'B2.1', 'B2.2'];

if (root) {
  init().catch((error) => {
    root.innerHTML = `
      <section class="card">
        <span class="chip">오류</span>
        <h2>대시보드를 불러오지 못했습니다</h2>
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

function percent(value) {
  return `${Math.round(Math.max(0, Math.min(1, value)) * 100)}%`;
}

function titleMap(items) {
  return new Map(items.map((item) => [item.id, item]));
}

function todayKey(now = Date.now()) {
  return new Date(now).toLocaleDateString('en-CA');
}

function countRead(profile, items) {
  return items.filter((item) => profile.reading[item.id]?.readAt).length;
}

function countDone(profile, items) {
  return items.filter((item) => profile.situations[item.id]?.doneAt).length;
}

function modeHrefForCta({ dueCount, newCount, weakGrammar, readingItems, profile }) {
  if (dueCount + newCount > 0) {
    return 'flashcards.html';
  }
  if (weakGrammar[0]) {
    return `grammar.html#topic=${encodeURIComponent(weakGrammar[0].id)}`;
  }
  const unread = readingItems.find((item) => !profile.reading[item.id]?.readAt);
  if (unread) {
    return `reading.html#passage=${encodeURIComponent(unread.id)}`;
  }
  return 'situations.html';
}

function renderMastery(mastery) {
  return `
    <section class="card dashboard-panel">
      <div>
        <span class="chip">진행</span>
        <h2 class="heading--compact">Sublevel mastery</h2>
      </div>
      <div class="progress-list">
        ${SUBLEVELS.map((sublevel) => `
          <div class="progress-row">
            <div class="progress-row__label">
              <strong>${escapeHtml(sublevel)}</strong>
              <span>${percent(mastery[sublevel] || 0)}</span>
            </div>
            <div class="progress-track" aria-label="${escapeHtml(sublevel)} 진행률">
              <div class="progress-fill" style="width: ${percent(mastery[sublevel] || 0)}"></div>
            </div>
          </div>
        `).join('')}
      </div>
    </section>
  `;
}

function renderWeaknesses({ weakGrammar, weakVocab, grammarById, vocabById }) {
  const grammarMarkup = weakGrammar.length
    ? weakGrammar
        .map((entry) => {
          const item = grammarById.get(entry.id);
          return `
            <a class="mini-link" href="grammar.html#topic=${encodeURIComponent(entry.id)}">
              <strong>${escapeHtml(item?.title || entry.id)}</strong>
              <span>${Math.round((entry.entry.mastery || 0) * 100)}% 정확도</span>
            </a>
          `;
        })
        .join('')
    : '<p class="lede">아직 뚜렷한 약점 문법이 없습니다. 문법 문제를 몇 개 풀면 이곳이 살아납니다.</p>';

  const vocabMarkup = weakVocab.length
    ? weakVocab
        .map((entry) => {
          const item = vocabById.get(entry.id);
          return `
            <a class="mini-link" href="flashcards.html#card=${encodeURIComponent(entry.id)}">
              <strong>${escapeHtml(item?.es || entry.id)}</strong>
              <span>lapse ${escapeHtml(entry.entry.lapses || 0)}회 · ${escapeHtml(item?.ko || '')}</span>
            </a>
          `;
        })
        .join('')
    : '<p class="lede">lapse가 2회 이상인 어휘가 없습니다.</p>';

  return `
    <section class="card dashboard-panel">
      <div class="panel-heading-row">
        <div>
          <span class="chip">약점</span>
          <h2 class="heading--compact">복습 우선순위</h2>
        </div>
        <a class="link link--secondary" href="flashcards.html">복습 후 재시도</a>
      </div>
      <div class="dashboard-two-col">
        <div>
          <h3>문법</h3>
          <div class="content-list">${grammarMarkup}</div>
        </div>
        <div>
          <h3>어휘</h3>
          <div class="content-list">${vocabMarkup}</div>
        </div>
      </div>
    </section>
  `;
}

function renderStreak(profile) {
  const current = Number(profile.streak?.current || 0);
  const longest = Number(profile.streak?.longest || 0);
  return `
    <section class="card dashboard-panel">
      <span class="chip">streak</span>
      <h2 class="heading--compact">연속 학습 ${current}일</h2>
      <p class="lede">최장 기록 ${longest}일</p>
      <div class="milestone-row" aria-label="학습 마일스톤">
        <span class="${current >= 7 ? 'is-hit' : ''}">7일</span>
        <span class="${current >= 30 ? 'is-hit' : ''}">30일</span>
      </div>
    </section>
  `;
}

function renderModes({ dueCount, newCount, grammarAttempted, grammarTotal, readCount, readingTotal, doneCount, situationTotal }) {
  const modes = [
    {
      title: 'Flashcards',
      label: `${dueCount} due · 신규 ${newCount}`,
      href: 'flashcards.html',
      body: '어휘 SRS 큐를 먼저 처리해 장기 기억을 유지합니다.'
    },
    {
      title: 'Grammar',
      label: `${grammarAttempted}/${grammarTotal} 토픽`,
      href: 'grammar.html',
      body: '정확도가 낮은 토픽을 다시 풀고 관련 독해로 강화합니다.'
    },
    {
      title: 'Reading',
      label: `${readCount}/${readingTotal} 읽음`,
      href: 'reading.html',
      body: '본문 토큰을 눌러 어휘와 문법 연결을 확인합니다.'
    },
    {
      title: 'Situations',
      label: `${doneCount}/${situationTotal} 완료`,
      href: 'situations.html',
      body: '장면 대화와 핵심 표현을 따라 읽으며 사용 맥락을 익힙니다.'
    }
  ];

  return `
    <section class="mode-grid" aria-label="학습 모드">
      ${modes
        .map((mode) => `
          <article class="card mode-card">
            <span class="chip">${escapeHtml(mode.label)}</span>
            <h2>${escapeHtml(mode.title)}</h2>
            <p>${escapeHtml(mode.body)}</p>
            <a class="link" href="${mode.href}">열기</a>
          </article>
        `)
        .join('')}
    </section>
  `;
}

async function init() {
  root.innerHTML = `
    <section class="card">
      <span class="chip">불러오는 중</span>
      <h2>오늘의 학습 상태를 계산하고 있습니다</h2>
    </section>
  `;

  touchDaily('home');
  const content = await loadAll();
  const vocabulary = content.vocabulary.items || [];
  const grammar = content.grammar.items || [];
  const reading = content.reading.items || [];
  const situations = content.situations.items || [];
  const profile = getProfile();
  const progress = loadProgress();
  const daily = loadDailyProgress();
  const now = Date.now();
  const dueCount = vocabulary.filter((item) => progress[item.id]?.dueAt <= now).length;
  const newCount = Math.min(
    getNewCardAllowanceForToday({ now, limit: 10 }),
    vocabulary.filter((item) => !progress[item.id]).length
  );
  const queue = getDueQueue(vocabulary, { progress, daily, newLimit: 10, now });
  const weakGrammar = getStruggling({ type: 'grammar', topN: 3 });
  const weakVocab = getStruggling({ type: 'vocab', topN: 5 }).filter((entry) => Number(entry.entry.lapses || 0) >= 2);
  const mastery = getMasteryByLevel(content);
  const readCount = countRead(profile, reading);
  const doneCount = countDone(profile, situations);
  const grammarAttempted = grammar.filter((item) => Number(profile.grammar[item.id]?.total || 0) > 0).length;
  const today = getTodayActivity();
  const ctaHref = modeHrefForCta({ dueCount, newCount, weakGrammar, readingItems: reading, profile });
  const goalMet = Number(today.cardsReviewed || 0) >= 10 && new Set(today.modes || []).size >= 2;

  root.innerHTML = `
    <section class="dashboard-hero">
      <div>
        <span class="chip">오늘의 학습</span>
        <h2>due ${dueCount}장 · 신규 ${newCount}장 · 약점 문법 ${weakGrammar.length}개</h2>
        <p class="lede">현재 큐에는 ${queue.length}장이 잡혀 있습니다. 가장 급한 활동부터 이어서 진행하세요.</p>
      </div>
      <a class="link dashboard-cta" href="${ctaHref}">지금 학습 시작</a>
    </section>

    ${goalMet ? `
      <section class="card tinted-card--green-strong">
        <span class="chip">목표 달성</span>
        <h2 class="heading--compact">오늘 목표를 채웠습니다</h2>
        <p class="lede">카드 10장과 활동 1개 이상을 완료했습니다.</p>
      </section>
    ` : ''}

    <section class="dashboard-grid">
      ${renderMastery(mastery)}
      ${renderStreak(profile)}
    </section>

    ${renderWeaknesses({
      weakGrammar,
      weakVocab,
      grammarById: titleMap(grammar),
      vocabById: titleMap(vocabulary)
    })}

    ${renderModes({
      dueCount,
      newCount,
      grammarAttempted,
      grammarTotal: grammar.length,
      readCount,
      readingTotal: reading.length,
      doneCount,
      situationTotal: situations.length
    })}
  `;
}
