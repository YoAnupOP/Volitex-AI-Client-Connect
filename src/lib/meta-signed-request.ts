import crypto from "node:crypto";
import { env } from "@/lib/env";

export type MetaSignedRequestPayload = {
  algorithm: string;
  user_id: string;
  issued_at?: number;
  expires?: number;
};

function decodeBase64Url(value: string): Buffer {
  if (!/^[A-Za-z0-9_-]+$/.test(value)) throw new Error("Invalid base64url value");
  return Buffer.from(value, "base64url");
}

export function verifyMetaSignedRequest(signedRequest: string): MetaSignedRequestPayload {
  const parts = signedRequest.split(".");
  if (parts.length !== 2 || !parts[0] || !parts[1]) throw new Error("Malformed signed_request");
  const [encodedSignature, encodedPayload] = parts;
  const signature = decodeBase64Url(encodedSignature);
  const expected = crypto.createHmac("sha256", env.metaAppSecret).update(encodedPayload, "utf8").digest();
  if (signature.length !== expected.length || !crypto.timingSafeEqual(signature, expected)) throw new Error("Invalid signed_request signature");

  let payload: MetaSignedRequestPayload;
  try { payload = JSON.parse(decodeBase64Url(encodedPayload).toString("utf8")) as MetaSignedRequestPayload; }
  catch { throw new Error("Invalid signed_request payload"); }
  if (payload.algorithm?.toUpperCase() !== "HMAC-SHA256" || !payload.user_id || typeof payload.user_id !== "string") {
    throw new Error("Unsupported signed_request payload");
  }
  return payload;
}

export async function signedRequestFromPost(request: Request): Promise<string> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    const body = await request.json() as { signed_request?: unknown };
    if (typeof body.signed_request === "string") return body.signed_request;
  } else {
    const form = await request.formData();
    const value = form.get("signed_request");
    if (typeof value === "string") return value;
  }
  throw new Error("Missing signed_request");
}
