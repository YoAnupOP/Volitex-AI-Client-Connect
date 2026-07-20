import { NextRequest, NextResponse } from "next/server";
import { randomToken } from "@/lib/crypto";
import { removeInstagramConnectionByAccountId } from "@/lib/connection";
import { env } from "@/lib/env";
import { signedRequestFromPost, verifyMetaSignedRequest } from "@/lib/meta-signed-request";

export async function POST(request: NextRequest) {
  try {
    const payload = verifyMetaSignedRequest(await signedRequestFromPost(request));
    const tenantIds = await removeInstagramConnectionByAccountId(payload.user_id, "deleted");
    const confirmationCode = randomToken();
    console.info("Instagram data deletion completed", { tenantCount: tenantIds.length, confirmationCode });
    return NextResponse.json({
      url: `${env.appUrl}/data-deletion-status?id=${encodeURIComponent(confirmationCode)}`,
      confirmation_code: confirmationCode,
    });
  } catch (error) {
    if (error instanceof Error && /signed_request|base64url|Unsupported/.test(error.message)) {
      return NextResponse.json({ error: "Invalid signed request" }, { status: 400 });
    }
    console.error("Unable to process Instagram data deletion", error);
    return NextResponse.json({ error: "Unable to process data deletion" }, { status: 500 });
  }
}
