import crypto from "node:crypto";
import { env } from "@/lib/env";

type SignedPayload = Record<string, unknown> & { exp: number };

function base64url(value: Buffer | string) {
  return Buffer.from(value).toString("base64url");
}

function safeEqual(a: string, b: string) {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  return left.length === right.length && crypto.timingSafeEqual(left, right);
}

export function randomToken() {
  return crypto.randomBytes(32).toString("base64url");
}

export function sha256(value: string) {
  return crypto.createHash("sha256").update(value).digest("hex");
}

export function sign<T extends Record<string, unknown>>(payload: T, expiresInSeconds: number): string {
  const body: SignedPayload = { ...payload, exp: Math.floor(Date.now() / 1000) + expiresInSeconds };
  const encoded = base64url(JSON.stringify(body));
  const signature = base64url(crypto.createHmac("sha256", env.sessionSecret).update(encoded).digest());
  return `${encoded}.${signature}`;
}

export function verify<T extends Record<string, unknown>>(token: string): T | null {
  const [encoded, signature] = token.split(".");
  if (!encoded || !signature) return null;
  const expected = base64url(crypto.createHmac("sha256", env.sessionSecret).update(encoded).digest());
  if (!safeEqual(signature, expected)) return null;
  try {
    const payload = JSON.parse(Buffer.from(encoded, "base64url").toString("utf8")) as SignedPayload;
    if (payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload as T;
  } catch { return null; }
}

export function encrypt(plaintext: string): string {
  const key = Buffer.from(env.tokenEncryptionKey, "base64");
  if (key.length !== 32) throw new Error("TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes");
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const ciphertext = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `enc:v1:${base64url(iv)}:${base64url(tag)}:${base64url(ciphertext)}`;
}

export function decrypt(envelope: string): string {
  const [prefix, version, ivEncoded, tagEncoded, dataEncoded] = envelope.split(":");
  if (prefix !== "enc" || version !== "v1" || !ivEncoded || !tagEncoded || !dataEncoded) {
    throw new Error("Invalid encrypted token envelope");
  }
  const key = Buffer.from(env.tokenEncryptionKey, "base64");
  if (key.length !== 32) throw new Error("TOKEN_ENCRYPTION_KEY must decode to exactly 32 bytes");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key, Buffer.from(ivEncoded, "base64url"));
  decipher.setAuthTag(Buffer.from(tagEncoded, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(dataEncoded, "base64url")), decipher.final()]).toString("utf8");
}
