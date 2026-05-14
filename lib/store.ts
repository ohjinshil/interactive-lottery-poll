import { promises as fs } from "node:fs";
import path from "node:path";
import { Redis } from "@upstash/redis";
import type { Poll, PollOption, PollStats, PublicPoll, Vote } from "./types";

const POLL_KEY = "lottery-poll:current";
const VOTES_KEY = "lottery-poll:votes";
const WINNER_KEY = "lottery-poll:winner";
const LOCAL_STORE = path.join(process.cwd(), "data", "local-store.json");

type StoreShape = {
  poll: Poll | null;
  votes: Vote[];
  winnerId: string | null;
};

const defaultStore: StoreShape = {
  poll: null,
  votes: [],
  winnerId: null
};

function getRedis() {
  if (!process.env.UPSTASH_REDIS_REST_URL || !process.env.UPSTASH_REDIS_REST_TOKEN) {
    return null;
  }

  return new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL,
    token: process.env.UPSTASH_REDIS_REST_TOKEN
  });
}

export function hasRedisConfig() {
  return Boolean(process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN);
}

function voteKey(pollId: string, voterId: string) {
  return `lottery-poll:${pollId}:vote:${voterId}`;
}

function votePattern(pollId: string) {
  return `lottery-poll:${pollId}:vote:*`;
}

function countKey(pollId: string, optionId: PollOption["id"]) {
  return `lottery-poll:${pollId}:count:${optionId}`;
}

async function readLocalStore(): Promise<StoreShape> {
  try {
    const raw = await fs.readFile(LOCAL_STORE, "utf8");
    return { ...defaultStore, ...JSON.parse(raw) };
  } catch {
    return defaultStore;
  }
}

async function writeLocalStore(nextStore: StoreShape) {
  await fs.mkdir(path.dirname(LOCAL_STORE), { recursive: true });
  await fs.writeFile(LOCAL_STORE, JSON.stringify(nextStore, null, 2), "utf8");
}

export function getStats(votes: Vote[]): PollStats {
  const counts: Record<PollOption["id"], number> = { a: 0, b: 0 };
  votes.forEach((vote) => {
    counts[vote.optionId] += 1;
  });

  const total = votes.length;

  return {
    total,
    options: {
      a: { count: counts.a, percent: total ? Math.round((counts.a / total) * 100) : 0 },
      b: { count: counts.b, percent: total ? Math.round((counts.b / total) * 100) : 0 }
    }
  };
}

function toPublicPoll(poll: Poll | null, votes: Vote[]): PublicPoll | null {
  if (!poll) return null;

  const { rewardImage: _rewardImage, ...safePoll } = poll;
  const status = Date.now() > poll.endTime ? "closed" : "open";

  return {
    ...safePoll,
    stats: getStats(votes),
    status
  };
}

export async function getPublicPoll(): Promise<PublicPoll | null> {
  const redis = getRedis();

  if (redis) {
    const poll = await redis.get<Poll | null>(POLL_KEY);
    if (!poll) return null;

    const [a, b] = await Promise.all([
      redis.get<number | null>(countKey(poll.id, "a")),
      redis.get<number | null>(countKey(poll.id, "b"))
    ]);

    return toPublicPollFromStats(poll, getStatsFromCounts(a ?? 0, b ?? 0));
  }

  const store = await readLocalStore();
  return toPublicPoll(store.poll, store.votes);
}

export async function savePoll(poll: Poll) {
  const redis = getRedis();

  if (redis) {
    await Promise.all([
      redis.set(POLL_KEY, poll),
      redis.set(countKey(poll.id, "a"), 0),
      redis.set(countKey(poll.id, "b"), 0),
      redis.del(WINNER_KEY)
    ]);
    return;
  }

  await writeLocalStore({ poll, votes: [], winnerId: null });
}

export async function submitVote(voterId: string, optionId: PollOption["id"]) {
  const redis = getRedis();

  if (redis) {
    const poll = await redis.get<Poll | null>(POLL_KEY);

    if (!poll) return { ok: false, code: "NO_POLL" as const };
    if (Date.now() > poll.endTime) return { ok: false, code: "CLOSED" as const };

    const created = await redis.set(voteKey(poll.id, voterId), { voterId, optionId, createdAt: Date.now() }, { nx: true });
    if (!created) {
      return { ok: false, code: "ALREADY_VOTED" as const };
    }

    await redis.incr(countKey(poll.id, optionId));
    const [a, b] = await Promise.all([
      redis.get<number | null>(countKey(poll.id, "a")),
      redis.get<number | null>(countKey(poll.id, "b"))
    ]);

    return { ok: true, code: "SUCCESS" as const, stats: getStatsFromCounts(a ?? 0, b ?? 0) };
  }

  const store = await readLocalStore();
  if (!store.poll) return { ok: false, code: "NO_POLL" as const };
  if (Date.now() > store.poll.endTime) return { ok: false, code: "CLOSED" as const };
  if (store.votes.some((vote) => vote.voterId === voterId)) {
    return { ok: false, code: "ALREADY_VOTED" as const };
  }

  const nextVotes = [...store.votes, { voterId, optionId, createdAt: Date.now() }];
  await writeLocalStore({ ...store, votes: nextVotes });
  return { ok: true, code: "SUCCESS" as const, stats: getStats(nextVotes) };
}

export async function getLotteryResult(voterId: string) {
  const redis = getRedis();

  if (redis) {
    const [poll, existingWinner] = await Promise.all([
      redis.get<Poll | null>(POLL_KEY),
      redis.get<string | null>(WINNER_KEY)
    ]);

    if (!poll) return { ok: false, code: "NO_POLL" as const };
    if (Date.now() <= poll.endTime) return { ok: false, code: "NOT_CLOSED" as const };

    const ownVote = await redis.get<Vote | null>(voteKey(poll.id, voterId));
    if (!ownVote) {
      return { ok: false, code: "NOT_VOTED" as const };
    }

    const winnerId = existingWinner ?? (await pickRedisWinner(poll.id));
    if (!existingWinner && winnerId) await redis.set(WINNER_KEY, winnerId);

    return {
      ok: true,
      isWinner: voterId === winnerId,
      rewardImage: voterId === winnerId ? poll.rewardImage : undefined
    };
  }

  const store = await readLocalStore();
  if (!store.poll) return { ok: false, code: "NO_POLL" as const };
  if (Date.now() <= store.poll.endTime) return { ok: false, code: "NOT_CLOSED" as const };
  if (!store.votes.some((vote) => vote.voterId === voterId)) {
    return { ok: false, code: "NOT_VOTED" as const };
  }

  const winnerId = store.winnerId ?? pickWinner(store.votes);
  await writeLocalStore({ ...store, winnerId });

  return {
    ok: true,
    isWinner: voterId === winnerId,
    rewardImage: voterId === winnerId ? store.poll.rewardImage : undefined
  };
}

function pickWinner(votes: Vote[]) {
  if (!votes.length) return null;
  return votes[Math.floor(Math.random() * votes.length)].voterId;
}

async function pickRedisWinner(pollId: string) {
  const redis = getRedis();
  if (!redis) return null;

  const keys = await redis.keys(votePattern(pollId));
  if (!keys.length) return null;

  const winnerKey = keys[Math.floor(Math.random() * keys.length)];
  const vote = await redis.get<Vote | null>(winnerKey);
  return vote?.voterId ?? null;
}

function getStatsFromCounts(a: number, b: number): PollStats {
  const total = a + b;

  return {
    total,
    options: {
      a: { count: a, percent: total ? Math.round((a / total) * 100) : 0 },
      b: { count: b, percent: total ? Math.round((b / total) * 100) : 0 }
    }
  };
}

function toPublicPollFromStats(poll: Poll, stats: PollStats): PublicPoll {
  const { rewardImage: _rewardImage, ...safePoll } = poll;

  return {
    ...safePoll,
    stats,
    status: Date.now() > poll.endTime ? "closed" : "open"
  };
}

export function createPoll(input: Omit<Poll, "id" | "createdAt">): Poll {
  return {
    ...input,
    id: crypto.randomUUID(),
    createdAt: Date.now()
  };
}
