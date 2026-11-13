/**
 * Customer data is stored only in this browser (IndexedDB), encrypted with
 * AES-256-GCM. The key is derived from the passphrase with PBKDF2 and is kept
 * in memory only while the workspace is unlocked.
 */
const ITERATIONS = 600_000;
const DB_NAME = "cp-crm";
const STORE = "vault";
const RECORD = "workspace";

export interface Envelope { v: 1; app: "cp-crm"; iter: number; salt: string; iv: string; data: string; savedAt: number }
export interface Session { key: CryptoKey; salt: Uint8Array<ArrayBuffer>; iter: number }

const b64 = (u: Uint8Array) => { let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };
const unb64 = (s: string) => { const bin = atob(s); const u = new Uint8Array(new ArrayBuffer(bin.length)); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };

async function derive(pass: string, salt: Uint8Array<ArrayBuffer>, iter: number): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pass), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: iter, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]);
}

export async function newSession(pass: string): Promise<Session> {
  const salt = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(16)));
  return { key: await derive(pass, salt, ITERATIONS), salt, iter: ITERATIONS };
}

export async function seal(s: Session, value: unknown): Promise<Envelope> {
  const iv = crypto.getRandomValues(new Uint8Array(new ArrayBuffer(12)));
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, s.key, new TextEncoder().encode(JSON.stringify(value)));
  return { v: 1, app: "cp-crm", iter: s.iter, salt: b64(s.salt), iv: b64(iv), data: b64(new Uint8Array(data)), savedAt: Date.now() };
}

/** Throws when the passphrase is wrong or the data was altered. */
export async function open<T>(pass: string, env: Envelope): Promise<{ session: Session; value: T }> {
  const salt = unb64(env.salt);
  const key = await derive(pass, salt, env.iter);
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(env.iv) }, key, unb64(env.data));
  return { session: { key, salt, iter: env.iter }, value: JSON.parse(new TextDecoder().decode(plain)) as T };
}

export function isEnvelope(x: unknown): x is Envelope {
  const e = x as Envelope;
  return Boolean(e && e.app === "cp-crm" && e.v === 1 && typeof e.salt === "string" && typeof e.iv === "string" && typeof e.data === "string" && typeof e.iter === "number");
}

function idb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}
async function tx<T>(mode: IDBTransactionMode, run: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await idb();
  try {
    return await new Promise<T>((resolve, reject) => {
      const t = db.transaction(STORE, mode);
      const req = run(t.objectStore(STORE));
      t.oncomplete = () => resolve(req.result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    });
  } finally { db.close(); }
}
export const loadEnvelope = async (): Promise<Envelope | null> => { const v = await tx<unknown>("readonly", (s) => s.get(RECORD)); return isEnvelope(v) ? v : null; };
export const saveEnvelope = (e: Envelope) => tx("readwrite", (s) => s.put(e, RECORD));
export const deleteEnvelope = () => tx("readwrite", (s) => s.delete(RECORD));
