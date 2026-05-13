export type PollOption = {
  id: "a" | "b";
  label: string;
  image: string;
};

export type Vote = {
  voterId: string;
  optionId: PollOption["id"];
  createdAt: number;
};

export type Poll = {
  id: string;
  title: string;
  description: string;
  hostName: string;
  tag: string;
  endTime: number;
  options: PollOption[];
  rewardImage: string;
  createdAt: number;
};

export type PublicPoll = Omit<Poll, "rewardImage"> & {
  stats: PollStats;
  status: "empty" | "open" | "closed";
};

export type PollStats = {
  total: number;
  options: Record<PollOption["id"], { count: number; percent: number }>;
};

export type LotteryResult = {
  isWinner: boolean;
  rewardImage?: string;
};
