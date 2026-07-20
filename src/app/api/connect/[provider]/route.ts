import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { disconnect } from "@/lib/connection";

export async function DELETE(_: NextRequest, { params }: { params: Promise<{ provider: string }> }) {
  const session = await getSession();
  const { provider } = await params;
  if (!session) return NextResponse.json({ error: "Unauthenticated" }, { status: 401 });
  if (provider !== "whatsapp" && provider !== "instagram") return NextResponse.json({ error: "Not found" }, { status: 404 });
  try { await disconnect(session.tenantId, provider); return NextResponse.json({ ok: true }); }
  catch { return NextResponse.json({ error: "Unable to disconnect account" }, { status: 500 }); }
}
