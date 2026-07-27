import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { getTenant } from "@/lib/connection";
import { decrypt } from "@/lib/crypto";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ tenantId: string }> }
) {
  if (request.headers.get("authorization") !== `Bearer ${env.cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { tenantId } = await params;

  try {
    const tenant = await getTenant(tenantId);

    if (!tenant.instagram_access_token) {
      return NextResponse.json({ error: "No Instagram token found for this tenant" }, { status: 404 });
    }

    if (tenant.instagram_token_expires_at && new Date(tenant.instagram_token_expires_at) < new Date()) {
      return NextResponse.json({ error: "Instagram token has expired" }, { status: 410 });
    }

    const accessToken = decrypt(tenant.instagram_access_token);

    return NextResponse.json({
      access_token: accessToken,
      instagram_business_account_id: tenant.instagram_business_account_id,
      expires_at: tenant.instagram_token_expires_at,
    });
  } catch {
    return NextResponse.json({ error: "Unable to retrieve Instagram token" }, { status: 500 });
  }
}
