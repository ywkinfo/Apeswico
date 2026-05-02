const cache = new Map();

function buildError(pathname, error) {
  const isFile = typeof location !== 'undefined' && location.protocol === 'file:';
  if (isFile) {
    return new Error(
      "로컬 파일로 직접 열면 데이터를 불러올 수 없습니다. 터미널에서 'python3 -m http.server 8000' 실행 후 http://localhost:8000 으로 접속하세요."
    );
  }
  return new Error(`데이터를 불러오지 못했습니다 (${pathname}): ${error.message}`);
}

export async function loadJson(pathname) {
  if (cache.has(pathname)) {
    return cache.get(pathname);
  }

  try {
    const response = await fetch(pathname, { cache: 'no-cache' });
    if (!response.ok) {
      throw new Error(`${response.status} ${response.statusText}`);
    }
    const data = await response.json();
    cache.set(pathname, data);
    return data;
  } catch (error) {
    throw buildError(pathname, error);
  }
}

export function clearJsonCache(pathname) {
  if (typeof pathname === 'string') {
    cache.delete(pathname);
    return;
  }
  cache.clear();
}

export function loadVocabulary() {
  return loadJson('data/vocabulary.json');
}

export function loadGrammar() {
  return loadJson('data/grammar.json');
}

export function loadReading() {
  return loadJson('data/reading.json');
}

export function loadSituations() {
  return loadJson('data/situations.json');
}
