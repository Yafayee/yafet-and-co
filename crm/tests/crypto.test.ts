import { describe, expect, it } from "vitest";
import { addRecovery, b64, checkPass, isEnvelope, ITERATIONS, looksLikeCode, newSession, open, openWithRecovery, passkeyOf, random, removeRecovery, rotate, seal, setPassphrase, unb64, type EnvelopeV1, type EnvelopeV2 } from "@/lib/crypto";

const PASS = "blauer Tisch Wolke 47 Fenster";
const secret = { name: "Müller", n: 42 };

/** Builds a file in the format used before the data key was introduced. */
async function oldFormat(pass: string, value: unknown, iter = 600_000): Promise<EnvelopeV1> {
  const salt = random(16), iv = random(12);
  const base = await crypto.subtle.importKey("raw", new TextEncoder().encode(pass), "PBKDF2", false, ["deriveKey"]);
  const key = await crypto.subtle.deriveKey({ name: "PBKDF2", salt, iterations: iter, hash: "SHA-256" }, base, { name: "AES-GCM", length: 256 }, false, ["encrypt"]);
  const data = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(JSON.stringify(value)));
  return { v: 1, app: "cp-crm", iter, salt: b64(salt), iv: b64(iv), data: b64(new Uint8Array(data)), savedAt: 1 };
}

describe("encryption", () => {
  it("opens with the right passphrase only and never stores readable text", async () => {
    const env = await seal(await newSession(PASS), secret);
    expect(JSON.stringify(env)).not.toContain("Müller");
    expect(env.pass.iter).toBe(ITERATIONS);
    expect((await open(PASS, env)).value).toEqual(secret);
    await expect(open(PASS + "x", env)).rejects.toBeTruthy();
  });
  it("detects any change to the stored data or to the key locks", async () => {
    const env = await seal(await newSession(PASS), secret);
    const flip = (s: string) => { const u = unb64(s); u[3] ^= 1; return b64(u); };
    await expect(open(PASS, { ...env, data: flip(env.data) })).rejects.toBeTruthy();
    await expect(open(PASS, { ...env, iv: flip(env.iv) })).rejects.toBeTruthy();
    await expect(open(PASS, { ...env, pass: { ...env.pass, key: flip(env.pass.key) } })).rejects.toBeTruthy();
  });
  it("still opens the old format and upgrades it on the next save", async () => {
    const old = await oldFormat(PASS, secret);
    expect(isEnvelope(old)).toBe(true);
    const { session, value } = await open(PASS, old);
    expect(value).toEqual(secret);
    const upgraded = await seal(session, value);
    expect(upgraded.v).toBe(2);
    expect((await open(PASS, upgraded)).value).toEqual(secret);
    await expect(open("wrong passphrase 123", old)).rejects.toBeTruthy();
  });
  it("re-locks with today's number of rounds when the stored lock is weaker", async () => {
    const s = await newSession(PASS);
    const env = await seal(s, secret);
    // Same lock, but claiming fewer rounds must simply fail: the count is part of the key.
    await expect(open(PASS, { ...env, pass: { ...env.pass, iter: 200_000 } })).rejects.toBeTruthy();
  });
  it("changes the passphrase without re-encrypting under a guessable key", async () => {
    const s = await newSession(PASS);
    expect(await checkPass(s, PASS)).toBe(true);
    expect(await checkPass(s, "nope nope nope")).toBe(false);
    await setPassphrase(s, "neues Wort Lampe 93 Garten");
    const env = await seal(s, secret);
    await expect(open(PASS, env)).rejects.toBeTruthy();
    expect((await open("neues Wort Lampe 93 Garten", env)).value).toEqual(secret);
  });
});

describe("recovery code", () => {
  it("opens the workspace when the passphrase is forgotten, and can be withdrawn", async () => {
    const s = await newSession(PASS);
    const code = await addRecovery(s);
    expect(code).toMatch(/^([0-9A-HJKMNP-TV-Z]{5}-){5}[0-9A-HJKMNP-TV-Z]{5}$/);
    expect(looksLikeCode(code.toLowerCase().replace(/-/g, " "))).toBe(true);
    const env = await seal(s, secret);
    expect(JSON.stringify(env)).not.toContain(code.replace(/-/g, ""));
    const viaCode = await openWithRecovery(code.toLowerCase(), env);
    expect(viaCode.value).toEqual(secret);
    await expect(openWithRecovery("00000-00000-00000-00000-00000-00000", env)).rejects.toBeTruthy();
    // After recovery a new passphrase is set; the old one stops working.
    await setPassphrase(viaCode.session, "ganz neu Baum 55 Wasser");
    const next = await seal(viaCode.session, secret);
    await expect(open(PASS, next)).rejects.toBeTruthy();
    expect((await open("ganz neu Baum 55 Wasser", next)).value).toEqual(secret);
    removeRecovery(viaCode.session);
    await expect(openWithRecovery(code, await seal(viaCode.session, secret))).rejects.toBeTruthy();
  });
  it("replacing the code makes the old one useless", async () => {
    const s = await newSession(PASS);
    const first = await addRecovery(s), second = await addRecovery(s);
    const env = await seal(s, secret);
    await expect(openWithRecovery(first, env)).rejects.toBeTruthy();
    expect((await openWithRecovery(second, env)).value).toEqual(secret);
  });
});

describe("passkey as a second factor", () => {
  const passkey = { id: "cred", salt: b64(random(32)), prf: random(32) };
  it("needs both the passphrase and the passkey's secret", async () => {
    const s = await newSession(PASS);
    await setPassphrase(s, PASS, passkey);
    const env: EnvelopeV2 = await seal(s, secret);
    expect(passkeyOf(env)).toEqual({ id: "cred", salt: passkey.salt });
    await expect(open(PASS, env)).rejects.toThrow("passkey");
    await expect(open(PASS, env, random(32))).rejects.toBeTruthy();
    await expect(open(PASS + "x", env, passkey.prf)).rejects.toBeTruthy();
    expect((await open(PASS, env, passkey.prf)).value).toEqual(secret);
    // Removing the passkey note from the file does not help an attacker who knows the passphrase.
    const stripped = { ...env, pass: { ...env.pass, passkey: undefined } };
    await expect(open(PASS, stripped)).rejects.toBeTruthy();
  });
  it("the recovery code still opens it when the passkey is lost", async () => {
    const s = await newSession(PASS);
    const code = await addRecovery(s);
    await setPassphrase(s, PASS, passkey);
    expect((await openWithRecovery(code, await seal(s, secret))).value).toEqual(secret);
  });
});

describe("recognising files", () => {
  it("rejects anything that is not a workspace file", async () => {
    const env = await seal(await newSession(PASS), secret);
    expect(isEnvelope(env)).toBe(true);
    expect(isEnvelope({ ...env, app: "other" })).toBe(false);
    expect(isEnvelope({ ...env, pass: { ...env.pass, iter: 1 } })).toBe(false);
    expect(isEnvelope({ ...env, pass: undefined })).toBe(false);
    expect(isEnvelope(null)).toBe(false);
    expect(isEnvelope("text")).toBe(false);
  });
});

describe("renewing the data key", () => {
  it("makes locks copied from an older backup useless for data saved afterwards", async () => {
    const s = await newSession(PASS);
    const oldCode = await addRecovery(s);
    const oldBackup = await seal(s, secret);
    // The passphrase is changed and a passkey is required: the data moves to a fresh key.
    const passkey = { id: "cred", salt: b64(random(32)), prf: random(32) };
    await rotate(s, "neues Wort Lampe 93 Garten", passkey);
    const newCode = await addRecovery(s);
    const now = await seal(s, { name: "new customer" });
    // An attacker holding the old backup, the old passphrase and the old code grafts the old locks onto the new data.
    await expect(open(PASS, { ...now, pass: oldBackup.pass })).rejects.toBeTruthy();
    await expect(openWithRecovery(oldCode, { ...now, recovery: oldBackup.recovery })).rejects.toBeTruthy();
    await expect(openWithRecovery(oldCode, now)).rejects.toBeTruthy();
    // The legitimate ways still work, and the old backup still opens with its own credentials.
    expect((await open("neues Wort Lampe 93 Garten", now, passkey.prf)).value).toEqual({ name: "new customer" });
    expect((await openWithRecovery(newCode, now)).value).toEqual({ name: "new customer" });
    expect((await open(PASS, oldBackup)).value).toEqual(secret);
  });
});

