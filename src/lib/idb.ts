/**
 * Minimal IndexedDB helpers for demo mode: uploaded video blobs are far too
 * large for localStorage, so they live in IndexedDB and survive a page reload.
 */
const DB_NAME = "reelforge";
const DB_VERSION = 1;
const FILES = "files";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (typeof indexedDB === "undefined") return Promise.reject(new Error("IndexedDB unavailable"));
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(FILES)) db.createObjectStore(FILES);
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB open failed"));
  });
  return dbPromise;
}

async function tx<T>(mode: IDBTransactionMode, fn: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb();
  return new Promise<T>((resolve, reject) => {
    const transaction = db.transaction(FILES, mode);
    const request = fn(transaction.objectStore(FILES));
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error ?? new Error("IndexedDB request failed"));
  });
}

export async function putFile(id: string, blob: Blob): Promise<void> {
  await tx("readwrite", (store) => store.put(blob, id) as IDBRequest<IDBValidKey>);
}

export async function getFile(id: string): Promise<Blob | null> {
  try {
    const result = await tx<Blob | undefined>("readonly", (store) => store.get(id));
    return result ?? null;
  } catch {
    return null;
  }
}

export async function deleteFile(id: string): Promise<void> {
  try {
    await tx("readwrite", (store) => store.delete(id) as IDBRequest<undefined>);
  } catch {
    /* non-fatal */
  }
}
