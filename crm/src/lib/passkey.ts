import { b64, random, unb64 } from "./crypto";

/**
 * A passkey (fingerprint, face, device PIN or a hardware security key) used as
 * a second factor for opening the workspace. Nothing is sent to a server:
 * the passkey is asked for a secret value (the WebAuthn "PRF" extension) and
 * that value is mixed into the encryption key.
 */
type Bytes = Uint8Array<ArrayBuffer>;
interface PrfOut { prf?: { enabled?: boolean; results?: { first?: ArrayBuffer } } }

export function passkeysPossible(): boolean {
  return typeof window !== "undefined" && window.isSecureContext && typeof PublicKeyCredential !== "undefined" && Boolean(navigator.credentials);
}

const toBytes = (b: ArrayBuffer): Bytes => { const u = new Uint8Array(new ArrayBuffer(b.byteLength)); u.set(new Uint8Array(b)); return u; };

/** Asks the passkey for its secret. Returns null when the user cancels or the passkey is not available. */
export async function askPasskey(id: string, salt: string): Promise<Bytes | null> {
  if (!passkeysPossible()) return null;
  try {
    const got = (await navigator.credentials.get({
      publicKey: {
        challenge: random(32),
        allowCredentials: [{ type: "public-key", id: unb64(id) }],
        userVerification: "required",
        timeout: 120_000,
        extensions: { prf: { eval: { first: unb64(salt) } } } as AuthenticationExtensionsClientInputs,
      },
    })) as PublicKeyCredential | null;
    const first = (got?.getClientExtensionResults() as PrfOut | undefined)?.prf?.results?.first;
    return first ? toBytes(first) : null;
  } catch { return null; }
}

/**
 * Creates a passkey for this site and reads its secret once.
 * "unsupported" means this device or browser cannot give a passkey secret.
 */
export async function createPasskey(label: string): Promise<{ id: string; salt: string; prf: Bytes } | "unsupported" | "cancelled"> {
  if (!passkeysPossible()) return "unsupported";
  let made: PublicKeyCredential | null;
  try {
    made = (await navigator.credentials.create({
      publicKey: {
        rp: { name: "CP Consulting CRM" },
        user: { id: random(16), name: label, displayName: label },
        challenge: random(32),
        pubKeyCredParams: [{ type: "public-key", alg: -7 }, { type: "public-key", alg: -257 }],
        authenticatorSelection: { residentKey: "preferred", userVerification: "required" },
        extensions: { prf: {} } as AuthenticationExtensionsClientInputs,
      },
    })) as PublicKeyCredential | null;
  } catch { return "cancelled"; }
  if (!made) return "cancelled";
  if (!(made.getClientExtensionResults() as PrfOut).prf?.enabled) return "unsupported";
  const id = b64(new Uint8Array(made.rawId)), salt = b64(random(32));
  const prf = await askPasskey(id, salt);
  return prf ? { id, salt, prf } : "unsupported";
}
