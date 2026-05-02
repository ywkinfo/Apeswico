const memoryStore = new Map();

function detectLocalStorage() {
  try {
    const probe = '__apeswico_probe__';
    localStorage.setItem(probe, '1');
    localStorage.removeItem(probe);
    return localStorage;
  } catch {
    return null;
  }
}

const backend = detectLocalStorage();

function readRaw(key) {
  if (backend) {
    return backend.getItem(key);
  }
  return memoryStore.has(key) ? memoryStore.get(key) : null;
}

function writeRaw(key, value) {
  if (backend) {
    backend.setItem(key, value);
    return;
  }
  memoryStore.set(key, value);
}

function removeRaw(key) {
  if (backend) {
    backend.removeItem(key);
    return;
  }
  memoryStore.delete(key);
}

export function namespace(scope, version = 1, suffix = '') {
  const base = `spa.${scope}.v${version}`;
  return suffix ? `${base}.${suffix}` : base;
}

export function get(key, fallback) {
  try {
    const raw = readRaw(key);
    if (raw == null) {
      return fallback;
    }
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

export function set(key, value) {
  writeRaw(key, JSON.stringify(value));
  return value;
}

export function remove(key) {
  removeRaw(key);
}

export function hasPersistentStorage() {
  return backend !== null;
}
