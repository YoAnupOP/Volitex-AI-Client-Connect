import { NextRequest, NextResponse } from "next/server";
import { removeInstagramConnectionByAccountId } from "@/lib/connection";
import { signedRequestFromPost, verifyMetaSignedRequest } from "@/lib/meta-signed-request";

export async function POST(request: NextRequest) {
  try {
    const payload = verifyMetaSignedRequest(await signedRequestFromPost(request));
    const tenantIds = await removeInstagramConnectionByAccountId(payload.user_id, "deauthorized");
    console.info("Instagram connection deauthorized", { tenantCount: tenantIds.length });
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && /signed_request|base64url|Unsupported/.test(error.message)) {
      return NextResponse.json({ error: "Invalid signed request" }, { status: 400 });
    }
    console.error("Unable to process Instagram deauthorization", error);
    return NextResponse.json({ error: "Unable to process deauthorization" }, { status: 500 });
  }
}
