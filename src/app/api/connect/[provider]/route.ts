import { NextResponse } from "next/server";

export async function DELETE() {
  // Credential removal is deliberately an authenticated admin operation, never client self-service.
  return NextResponse.json({ error: "Please contact your Volitex AI specialist to request an account change." }, { status: 405 });
}
