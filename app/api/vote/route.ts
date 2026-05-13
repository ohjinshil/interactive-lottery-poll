import { NextResponse } from "next/server";
import { submitVote } from "@/lib/store";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body?.voterId || !["a", "b"].includes(body?.optionId)) {
    return NextResponse.json({ ok: false, code: "BAD_REQUEST" }, { status: 400 });
  }

  const result = await submitVote(body.voterId, body.optionId);
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
