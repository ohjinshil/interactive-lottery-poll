import { NextResponse } from "next/server";
import { createPoll, hasRedisConfig, savePoll } from "@/lib/store";

const MAX_IMAGE_LENGTH = 750_000;

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const adminPin = process.env.ADMIN_PIN;

  if (!hasRedisConfig() && process.env.VERCEL) {
    return NextResponse.json({ ok: false, code: "STORE_NOT_CONFIGURED" }, { status: 500 });
  }

  if (adminPin && body?.pin !== adminPin) {
    return NextResponse.json({ ok: false, code: "UNAUTHORIZED" }, { status: 401 });
  }

  if (!body?.title || !body?.endTime || !body?.options?.length || !body?.rewardImage) {
    return NextResponse.json({ ok: false, code: "BAD_REQUEST" }, { status: 400 });
  }

  const images = [body.options?.[0]?.image, body.options?.[1]?.image, body.rewardImage];
  if (images.some((image) => typeof image !== "string" || image.length > MAX_IMAGE_LENGTH)) {
    return NextResponse.json({ ok: false, code: "IMAGE_TOO_LARGE" }, { status: 413 });
  }

  const poll = createPoll({
    title: String(body.title).slice(0, 80),
    description: String(body.description ?? "").slice(0, 140),
    hostName: String(body.hostName ?? "디지털 AI 능력 UP").slice(0, 40),
    tag: String(body.tag ?? "따끈따끈").slice(0, 12),
    endTime: Number(body.endTime),
    options: [
      { id: "a", label: String(body.options[0].label).slice(0, 32), image: body.options[0].image },
      { id: "b", label: String(body.options[1].label).slice(0, 32), image: body.options[1].image }
    ],
    rewardImage: body.rewardImage
  });

  try {
    await savePoll(poll);
  } catch {
    return NextResponse.json({ ok: false, code: "SAVE_FAILED" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, pollId: poll.id });
}
