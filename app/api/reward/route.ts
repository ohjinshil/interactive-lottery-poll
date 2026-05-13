import { NextResponse } from "next/server";
import { getLotteryResult } from "@/lib/store";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);

  if (!body?.voterId) {
    return NextResponse.json({ ok: false, code: "BAD_REQUEST" }, { status: 400 });
  }

  const result = await getLotteryResult(body.voterId);
  return NextResponse.json(result, { status: result.ok ? 200 : 409 });
}
