import { NextResponse } from "next/server";
import { getPublicPoll } from "@/lib/store";

export async function GET() {
  const poll = await getPublicPoll();
  return NextResponse.json({ poll });
}
