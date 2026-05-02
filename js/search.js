import { searchAll } from './content-graph.js';

const TYPE_LABELS = {
  vocab: '어휘',
  grammar: '문법',
  reading: '독해',
  situations: '상황극'
};

document.querySelectorAll('[data-global-search]').forEach((form) => {
  const input = form.querySelector('input[type="search"]');
  const results = form.querySelector('[data-search-results]');
  let requestId = 0;

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const first = (await searchAll(input.value, { limit: 1 }))[0];
    if (first) {
      location.href = first.href;
    }
  });

  input?.addEventListener('input', async () => {
    const current = ++requestId;
    const query = input.value.trim();
    if (!query) {
      results.hidden = true;
      results.innerHTML = '';
      return;
    }

    const matches = await searchAll(query, { limit: 8 });
    if (current !== requestId) {
      return;
    }

    results.hidden = false;
    if (!matches.length) {
      results.innerHTML = '<p class="search-empty">검색 결과 없음</p>';
      return;
    }

    const grouped = matches.reduce((acc, result) => {
      if (!acc[result.type]) {
        acc[result.type] = [];
      }
      acc[result.type].push(result);
      return acc;
    }, {});

    results.innerHTML = Object.entries(grouped)
      .map(([type, entries]) => `
        <section class="search-group">
          <h2>${TYPE_LABELS[type] || type}</h2>
          ${entries
            .map((entry) => `
              <a href="${entry.href}" class="search-result">
                <strong>${escapeHtml(entry.title)}</strong>
                <span>${escapeHtml(entry.subtitle)}</span>
              </a>
            `)
            .join('')}
        </section>
      `)
      .join('');
  });

  input?.addEventListener('blur', () => {
    setTimeout(() => {
      results.hidden = true;
    }, 160);
  });

  input?.addEventListener('focus', () => {
    if (results.innerHTML.trim()) {
      results.hidden = false;
    }
  });
});

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
