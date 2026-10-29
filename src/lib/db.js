// IndexedDB 저장소: ISS 좌표를 timestamp(ms) 키로 저장하고 최근 4시간만 유지한다.
const DB_NAME = 'iss-tracker';
const STORE = 'positions';
export const RETENTION_MS = 4 * 60 * 60 * 1000;

let dbPromise;

function openDb() {
  dbPromise ??= new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: 'timestamp' });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return dbPromise;
}

function tx(mode, fn) {
  return openDb().then(
    (db) =>
      new Promise((resolve, reject) => {
        const t = db.transaction(STORE, mode);
        const result = fn(t.objectStore(STORE));
        t.oncomplete = () => resolve(result?.result ?? result);
        t.onerror = () => reject(t.error);
      }),
  );
}

export function savePosition(pos) {
  return tx('readwrite', (store) => store.put(pos));
}

export function pruneOld(now = Date.now()) {
  return tx('readwrite', (store) => store.delete(IDBKeyRange.upperBound(now - RETENTION_MS)));
}

export function loadRecent(now = Date.now()) {
  return tx('readonly', (store) => store.getAll(IDBKeyRange.lowerBound(now - RETENTION_MS, true)));
}
