/**
 * Customer data is stored only in this browser (IndexedDB), encrypted with
 * AES-256-GCM under a random data key. The data key is never stored in the
 * clear: it is locked ("wrapped") once per way of opening the workspace.
 *
 *  - Passphrase: PBKDF2-SHA256 with 1,000,000 rounds, then HKDF.
 *  - Passphrase plus passkey (optional): the passkey's secret (WebAuthn PRF)
 *    is mixed into the key, so a copy of the stored data cannot be opened
 *    without the device or security key, even if the passphrase is known.
 *  - Recovery code (optional): 150 random bits, for a forgotten passphrase
 *    or a lost passkey.
 *
 * The data key lives in memory only while the workspace is unlocked.
 */
export const ITERATIONS = 1_000_000;
const DB_NAME = "cp-crm";
const STORE = "vault";
const RECORD = "workspace";

type Bytes = Uint8Array<ArrayBuffer>;
/** Format used until November 2026: the passphrase key encrypted the data directly. */
export interface EnvelopeV1 { v: 1; app: "cp-crm"; iter: number; salt: string; iv: string; data: string; savedAt: number }
export interface PassSlot { salt: string; iter: number; iv: string; key: string; passkey?: { id: string; salt: string } }
export interface RecoverySlot { salt: string; iv: string; key: string }
export interface EnvelopeV2 { v: 2; app: "cp-crm"; pass: PassSlot; recovery?: RecoverySlot; iv: string; data: string; savedAt: number }
export type Envelope = EnvelopeV1 | EnvelopeV2;
export interface Session { dek: CryptoKey; pass: PassSlot; recovery?: RecoverySlot }
/** The passkey to mix into the passphrase key: its id, the salt it is asked with, and its answer. */
export interface PasskeySecret { id: string; salt: string; prf: Bytes }

export const b64 = (u: Uint8Array) => { let s = ""; for (let i = 0; i < u.length; i += 0x8000) s += String.fromCharCode(...u.subarray(i, i + 0x8000)); return btoa(s); };
export const unb64 = (s: string): Bytes => { const bin = atob(s); const u = new Uint8Array(new ArrayBuffer(bin.length)); for (let i = 0; i < bin.length; i++) u[i] = bin.charCodeAt(i); return u; };
const enc = (s: string): Bytes => { const e = new TextEncoder().encode(s); const u = new Uint8Array(new ArrayBuffer(e.length)); u.set(e); return u; };
export const random = (n: number): Bytes => crypto.getRandomValues(new Uint8Array(new ArrayBuffer(n)));
const AES = { name: "AES-GCM", length: 256 } as const;
const DATA_AAD = enc("cp-crm:2:data");

async function hkdf(ikm: Bytes, salt: Bytes, info: string): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", ikm, "HKDF", false, ["deriveKey"]);
  return crypto.subtle.deriveKey({ name: "HKDF", hash: "SHA-256", salt, info: enc(info) }, base, AES, false, ["wrapKey", "unwrapKey"]);
}
async function passKek(pass: string, salt: Bytes, iter: number, prf?: Bytes): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey("raw", enc(pass), "PBKDF2", false, ["deriveBits"]);
  const stretched = new Uint8Array(await crypto.subtle.deriveBits({ name: "PBKDF2", salt, iterations: iter, hash: "SHA-256" }, base, 256));
  const ikm = new Uint8Array(new ArrayBuffer(32 + (prf?.length ?? 0)));
  ikm.set(stretched); if (prf) ikm.set(prf, 32);
  return hkdf(ikm, salt, prf ? "cp-crm:2:passphrase+passkey" : "cp-crm:2:passphrase");
}
const ALPHABET = "0123456789ABCDEFGHJKMNPQRSTVWXYZ"; // no I, L, O, U: they are easy to misread
/** What the user typed, without spaces or dashes, with look-alike letters corrected. */
export const normaliseCode = (code: string) => code.toUpperCase().replace(/[^0-9A-Z]/g, "").replace(/O/g, "0").replace(/[IL]/g, "1");
export const looksLikeCode = (code: string) => { const c = normaliseCode(code); return c.length === 30 && [...c].every((ch) => ALPHABET.includes(ch)); };
const recoveryKek = (code: string, salt: Bytes) => hkdf(enc(normaliseCode(code)), salt, "cp-crm:2:recovery");

async function wrap(dek: CryptoKey, kek: CryptoKey, label: string) {
  const iv = random(12);
  const key = await crypto.subtle.wrapKey("raw", dek, kek, { name: "AES-GCM", iv, additionalData: enc(`cp-crm:2:${label}`) });
  return { iv: b64(iv), key: b64(new Uint8Array(key)) };
}
const unwrap = (slot: { iv: string; key: string }, kek: CryptoKey, label: string) =>
  crypto.subtle.unwrapKey("raw", unb64(slot.key), kek, { name: "AES-GCM", iv: unb64(slot.iv), additionalData: enc(`cp-crm:2:${label}`) }, AES, true, ["encrypt", "decrypt"]);

async function passSlot(dek: CryptoKey, pass: string, passkey?: PasskeySecret): Promise<PassSlot> {
  const salt = random(16);
  const w = await wrap(dek, await passKek(pass, salt, ITERATIONS, passkey?.prf), "pass");
  return { salt: b64(salt), iter: ITERATIONS, ...w, ...(passkey ? { passkey: { id: passkey.id, salt: passkey.salt } } : {}) };
}

export async function newSession(pass: string): Promise<Session> {
  const dek = await crypto.subtle.generateKey(AES, true, ["encrypt", "decrypt"]);
  return { dek, pass: await passSlot(dek, pass) };
}

export async function seal(s: Session, value: unknown): Promise<EnvelopeV2> {
  const iv = random(12);
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv, additionalData: DATA_AAD }, s.dek, enc(JSON.stringify(value)));
  return { v: 2, app: "cp-crm", pass: s.pass, ...(s.recovery ? { recovery: s.recovery } : {}), iv: b64(iv), data: b64(new Uint8Array(data)), savedAt: Date.now() };
}
async function read<T>(env: EnvelopeV2, dek: CryptoKey): Promise<T> {
  const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(env.iv), additionalData: DATA_AAD }, dek, unb64(env.data));
  return JSON.parse(new TextDecoder().decode(plain)) as T;
}

/** The passkey this stored workspace asks for, if any. */
export const passkeyOf = (env: Envelope) => (env.v === 2 ? env.pass.passkey ?? null : null);

/**
 * Throws when the passphrase (or passkey answer) is wrong or the data was altered.
 * Data in the old format, or locked with fewer rounds than today's standard,
 * comes back with a session in the current format; saving then upgrades it.
 */
export async function open<T>(pass: string, env: Envelope, prf?: Bytes): Promise<{ session: Session; value: T }> {
  if (env.v === 1) {
    const base = await crypto.subtle.importKey("raw", enc(pass), "PBKDF2", false, ["deriveKey"]);
    const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt: unb64(env.salt), iterations: env.iter, hash: "SHA-256" }, base, AES, false, ["decrypt"]);
    const plain = await crypto.subtle.decrypt({ name: "AES-GCM", iv: unb64(env.iv) }, key, unb64(env.data));
    return { session: await newSession(pass), value: JSON.parse(new TextDecoder().decode(plain)) as T };
  }
  const pk = env.pass.passkey;
  if (pk && !prf) throw new Error("passkey");
  const dek = await unwrap(env.pass, await passKek(pass, unb64(env.pass.salt), env.pass.iter, pk ? prf : undefined), "pass");
  const value = await read<T>(env, dek);
  const slot = env.pass.iter < ITERATIONS ? await passSlot(dek, pass, pk && prf ? { ...pk, prf } : undefined) : env.pass;
  return { session: { dek, pass: slot, recovery: env.recovery }, value };
}

/** Opens with the recovery code. The passphrase slot is left as it is; set a new passphrase afterwards. */
export async function openWithRecovery<T>(code: string, env: Envelope): Promise<{ session: Session; value: T }> {
  if (env.v !== 2 || !env.recovery) throw new Error("no recovery code");
  const dek = await unwrap(env.recovery, await recoveryKek(code, unb64(env.recovery.salt)), "recovery");
  return { session: { dek, pass: env.pass, recovery: env.recovery }, value: await read<T>(env, dek) };
}

/** True when this passphrase (and passkey answer) opens the session's passphrase lock. */
export async function checkPass(s: Session, pass: string, prf?: Bytes): Promise<boolean> {
  if (s.pass.passkey && !prf) return false;
  try { await unwrap(s.pass, await passKek(pass, unb64(s.pass.salt), s.pass.iter, s.pass.passkey ? prf : undefined), "pass"); return true; }
  catch { return false; }
}
/** Replaces the passphrase lock. Without `passkey` the workspace opens with the passphrase alone. */
export async function setPassphrase(s: Session, pass: string, passkey?: PasskeySecret): Promise<void> {
  s.pass = await passSlot(s.dek, pass, passkey);
}
/** Creates (or replaces) the recovery code and returns it for the user to write down. It is not stored. */
export async function addRecovery(s: Session): Promise<string> {
  const raw = random(30);
  const code = [...raw].map((b) => ALPHABET[b & 31]).join("");
  const salt = random(16);
  s.recovery = { salt: b64(salt), ...(await wrap(s.dek, await recoveryKek(code, salt), "recovery")) };
  return code.match(/.{5}/g)!.join("-");
}
export function removeRecovery(s: Session): void { delete s.recovery; }

export function isEnvelope(x: unknown): x is Envelope {
  const e = x as Record<string, unknown> | null;
  if (!e || typeof e !== "object" || e.app !== "cp-crm" || typeof e.iv !== "string" || typeof e.data !== "string") return false;
  if (e.v === 1) return typeof e.salt === "string" && typeof e.iter === "number";
  const slot = (v: unknown) => { const k = v as Record<string, unknown> | null; return Boolean(k && typeof k === "object" && typeof k.salt === "string" && typeof k.iv === "string" && typeof k.key === "string"); };
  const pass = e.pass as PassSlot | undefined;
  // The number of rounds is bounded so that a prepared file cannot freeze the browser.
  return e.v === 2 && slot(pass) && typeof pass!.iter === "number" && pass!.iter >= 100_000 && pass!.iter <= 20_000_000 && (e.recovery === undefined || slot(e.recovery));
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
