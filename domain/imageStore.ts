// domain/imageStore.ts
// IndexedDB store for concert album images (URL only). Keeps large URL arrays out of localStorage.
//
// Design goals:
// - Simple key/value store: imageId -> url
// - Bulk helpers for migration/import/export
// - No external deps

const DB_NAME = 'livetrack-jp-images';
const DB_VERSION = 1;
const STORE_NAME = 'images';

type ImageRecord = {
  id: string;
  url: string;
  createdAt: string; // ISO
};

let _dbPromise: Promise<IDBDatabase> | null = null;

const openDB = (): Promise<IDBDatabase> => {
  if (_dbPromise) return _dbPromise;
  _dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
  return _dbPromise;
};

const txStore = async (mode: IDBTransactionMode) => {
  const db = await openDB();
  const tx = db.transaction(STORE_NAME, mode);
  return tx.objectStore(STORE_NAME);
};

const genId = () => `${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

/** Save URL and return generated imageId. */
export const putImageUrl = async (url: string): Promise<string> => {
  const id = genId();
  const rec: ImageRecord = { id, url, createdAt: new Date().toISOString() };
  const store = await txStore('readwrite');
  await new Promise<void>((resolve, reject) => {
    const req = store.put(rec);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
  return id;
};

/** Replace URL for an existing imageId (used for "置換"). */
export const setImageUrl = async (id: string, url: string): Promise<void> => {
  const rec: ImageRecord = { id, url, createdAt: new Date().toISOString() };
  const store = await txStore('readwrite');
  await new Promise<void>((resolve, reject) => {
    const req = store.put(rec);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

export const getImageUrl = async (id: string): Promise<string | null> => {
  const store = await txStore('readonly');
  return await new Promise<string | null>((resolve, reject) => {
    const req = store.get(id);
    req.onsuccess = () => resolve((req.result as ImageRecord | undefined)?.url ?? null);
    req.onerror = () => reject(req.error);
  });
};

export const deleteImage = async (id: string): Promise<void> => {
  const store = await txStore('readwrite');
  await new Promise<void>((resolve, reject) => {
    const req = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

/** Bulk put URLs and return imageIds in same order. */
export const bulkPutImageUrls = async (urls: string[]): Promise<string[]> => {
  const ids: string[] = [];
  for (const url of urls) {
    if (!url) continue;
    // Skip data:image / blob: defensively
    if (url.startsWith('data:image') || url.startsWith('blob:')) continue;
    const id = await putImageUrl(url);
    ids.push(id);
  }
  return ids;
};

/** Bulk get urls. Missing ids are omitted from the result map. */
export const bulkGetImageUrls = async (ids: string[]): Promise<Record<string, string>> => {
  const out: Record<string, string> = {};
  if (!ids || ids.length === 0) return out;

  // Use single readonly tx; sequential get to keep it simple + reliable.
  const store = await txStore('readonly');
  for (const id of ids) {
    // eslint-disable-next-line no-await-in-loop
    const url = await new Promise<string | null>((resolve, reject) => {
      const req = store.get(id);
      req.onsuccess = () => resolve((req.result as ImageRecord | undefined)?.url ?? null);
      req.onerror = () => reject(req.error);
    });
    if (url) out[id] = url;
  }
  return out;
};
