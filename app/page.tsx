"use client";

import { useEffect, useMemo, useRef, useState, type PointerEvent } from "react";
import clsx from "clsx";
import { CheckCircle2, Clock3, Gift, Link, Sparkles, TicketCheck, UsersRound } from "lucide-react";
import type { LotteryResult, PublicPoll } from "@/lib/types";

function getDeviceId() {
  const existing = localStorage.getItem("lottery-device-id");
  if (existing) return existing;

  const next = `v_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  localStorage.setItem("lottery-device-id", next);
  return next;
}

function formatLeft(ms: number) {
  if (ms <= 0) return "마감됨";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function getVotedOption(pollId: string) {
  const value = localStorage.getItem(`voted:${pollId}`);
  return value === "a" || value === "b" ? value : null;
}

type ScratchTicketProps = {
  poll: PublicPoll;
  isClosed: boolean;
  busy: boolean;
  result: LotteryResult | null;
  onReveal: () => Promise<void>;
};

function ScratchTicket({ poll, isClosed, busy, result, onReveal }: ScratchTicketProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [scratchReady, setScratchReady] = useState(false);
  const [scratched, setScratched] = useState(0);
  const [isScratching, setIsScratching] = useState(false);

  useEffect(() => {
    if (!scratchReady || !result) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const scale = window.devicePixelRatio || 1;
    canvas.width = Math.floor(rect.width * scale);
    canvas.height = Math.floor(rect.height * scale);

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.scale(scale, scale);
    const gradient = ctx.createLinearGradient(0, 0, rect.width, rect.height);
    gradient.addColorStop(0, "#cfd6e6");
    gradient.addColorStop(0.5, "#7f8aa0");
    gradient.addColorStop(1, "#e8edf7");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, rect.width, rect.height);
    ctx.fillStyle = "rgba(255,255,255,0.22)";
    for (let x = -rect.height; x < rect.width; x += 22) {
      ctx.fillRect(x, 0, 10, rect.height * 1.8);
    }
    ctx.fillStyle = "#202638";
    ctx.font = "800 16px -apple-system, BlinkMacSystemFont, sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("마우스나 손가락으로 긁어주세요", rect.width / 2, rect.height / 2);
  }, [scratchReady, result]);

  function scratch(event: PointerEvent<HTMLCanvasElement>) {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (!canvas || !ctx) return;

    const rect = canvas.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    ctx.save();
    ctx.globalCompositeOperation = "destination-out";
    ctx.beginPath();
    ctx.arc(x, y, 24, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const nextScratched = Math.min(100, scratched + 7);
    setScratched(nextScratched);

    if (nextScratched >= 55) {
      canvas.style.opacity = "0";
      canvas.style.pointerEvents = "none";
    }
  }

  async function startScratch() {
    if (!isClosed || busy) return;
    if (!result) await onReveal();
    setScratchReady(true);
  }

  return (
    <section className="ticket">
      <div className="ticket-head">
        <div>
          <p className="eyebrow">MY LUCKY TICKET</p>
          <h2 className="ticket-title">내 복권</h2>
        </div>
        <span className={clsx("ticket-state", isClosed && "ready")}>{isClosed ? "확인 가능" : "대기 중"}</span>
      </div>

      <div className="scratch-stage">
        <div className="scratch-result">
          {result?.isWinner ? (
            <div className="reward">
              <p className="reward-title">당첨! 축하합니다</p>
              {result.rewardImage ? <img className="reward-image" src={result.rewardImage} alt="당첨 리워드" /> : null}
            </div>
          ) : result ? (
            <div className="reward lose">
              <p className="reward-title">아쉽지만 꽝ㅠㅠ</p>
              <p className="description">다음 이벤트에서 다시 도전해 주세요.</p>
            </div>
          ) : (
            <div className="reward pending">
              <Gift size={30} />
              <p className="reward-title">{isClosed ? "복권을 긁어 결과를 확인하세요" : "마감 후 긁을 수 있어요"}</p>
              <p className="description">{poll.title}</p>
            </div>
          )}
        </div>

        {scratchReady && result ? (
          <canvas
            ref={canvasRef}
            className="scratch-canvas"
            onPointerDown={(event) => {
              setIsScratching(true);
              event.currentTarget.setPointerCapture(event.pointerId);
              scratch(event);
            }}
            onPointerMove={(event) => {
              if (isScratching) scratch(event);
            }}
            onPointerUp={() => setIsScratching(false)}
            onPointerCancel={() => setIsScratching(false)}
          />
        ) : null}
      </div>

      <button className="ticket-action" onClick={startScratch} disabled={!isClosed || busy || scratchReady}>
        <TicketCheck size={18} />
        {!isClosed ? "마감 대기 중" : busy ? "결과 준비 중..." : scratchReady ? `${scratched}% 긁는 중` : "복권 긁기 시작"}
      </button>
    </section>
  );
}

export default function Home() {
  const [poll, setPoll] = useState<PublicPoll | null>(null);
  const [selected, setSelected] = useState<"a" | "b" | null>(null);
  const [votedOption, setVotedOption] = useState<"a" | "b" | null>(null);
  const [deviceId, setDeviceId] = useState("");
  const [now, setNow] = useState(Date.now());
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<LotteryResult | null>(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setDeviceId(getDeviceId());
  }, []);

  useEffect(() => {
    const loadPoll = async () => {
      const res = await fetch("/api/poll", { cache: "no-store" });
      const data = (await res.json()) as { poll: PublicPoll | null };
      setPoll(data.poll);

      if (data.poll) {
        const localVote = getVotedOption(data.poll.id);
        setVotedOption(localVote);
        if (localVote) setSelected(localVote);
      }
    };

    loadPoll();
    const pollTimer = window.setInterval(loadPoll, 3000);
    const clockTimer = window.setInterval(() => setNow(Date.now()), 1000);

    return () => {
      window.clearInterval(pollTimer);
      window.clearInterval(clockTimer);
    };
  }, []);

  const isClosed = !poll || now >= poll.endTime || poll.status === "closed";
  const timeLeft = useMemo(() => (poll ? formatLeft(poll.endTime - now) : "준비 중"), [poll, now]);
  const hasVoted = Boolean(votedOption);

  async function submitVote() {
    if (!poll || !selected || !deviceId) return;

    setBusy(true);
    setMessage("");

    const res = await fetch("/api/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voterId: deviceId, optionId: selected })
    });

    const data = await res.json();
    setBusy(false);

    if (data.ok) {
      localStorage.setItem(`voted:${poll.id}`, selected);
      setVotedOption(selected);
      setPoll((current) => (current ? { ...current, stats: data.stats } : current));
      setMessage("투표가 완료됐어요. 진행 상황은 계속 볼 수 있고, 아래에 내 복권이 보관됩니다.");
      return;
    }

    if (data.code === "ALREADY_VOTED") {
      const fallback = selected ?? "a";
      localStorage.setItem(`voted:${poll.id}`, fallback);
      setVotedOption(fallback);
      setMessage("이미 투표한 기기예요. 내 복권 영역을 열어둘게요.");
      return;
    }

    setMessage(data.code === "CLOSED" ? "투표가 마감됐어요." : "잠시 후 다시 시도해 주세요.");
  }

  async function revealReward() {
    if (!poll || !deviceId || !isClosed) return;

    setBusy(true);
    setMessage("");

    const res = await fetch("/api/reward", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ voterId: deviceId })
    });

    const data = await res.json();
    setBusy(false);

    if (data.ok) {
      setResult({ isWinner: data.isWinner, rewardImage: data.rewardImage });
      return;
    }

    if (data.code === "NOT_VOTED") {
      setMessage("서버에 투표 기록이 없어요. 이 브라우저에서 투표를 완료한 뒤 복권을 확인할 수 있습니다.");
      return;
    }

    setMessage(data.code === "NOT_CLOSED" ? "아직 마감 전이에요." : "결과를 불러오지 못했어요.");
  }

  async function shareLink() {
    const shareUrl = window.location.origin;
    const text = poll ? `${poll.title}\n${shareUrl}` : shareUrl;

    if (navigator.share) {
      await navigator.share({ title: "디지털 AI 능력 UP! 이벤트 투표", text, url: shareUrl });
      return;
    }

    await navigator.clipboard.writeText(text);
    setMessage("공유 링크를 복사했어요.");
  }

  if (!poll) {
    return (
      <main className="shell">
        <div className="brand-row">
          <div>
            <p className="eyebrow">DIGITAL AI ABILITY UP</p>
            <h1 className="title">열려 있는 이벤트가 없어요</h1>
          </div>
          <div className="brand-mark"><Sparkles size={22} /></div>
        </div>
        <div className="empty">관리자 페이지에서 첫 투표를 만들면 이 화면에 바로 표시됩니다.</div>
      </main>
    );
  }

  return (
    <main className="shell">
      <div className="topbar">
        <div className="timer-pill">
          <span className="mini-row"><Clock3 size={17} /> {isClosed ? "투표 마감" : "남은 시간"}</span>
          <strong>{timeLeft}</strong>
        </div>
      </div>

      <section className="brand-row">
        <div>
          <p className="eyebrow">{poll.hostName}</p>
          <h1 className="title">{poll.title}</h1>
          <p className="description">{poll.description}</p>
        </div>
        <span className="tag"><Sparkles size={14} /> {poll.tag}</span>
      </section>

      {message ? <p className="notice">{message}</p> : null}

      {hasVoted ? (
        <div className="voted-banner">
          <CheckCircle2 size={18} />
          <span>투표 완료. 현재 진행 상황을 계속 확인할 수 있어요.</span>
        </div>
      ) : null}

      <section className="card-list">
        {poll.options.map((option) => {
          const stat = poll.stats.options[option.id];
          const selectedCard = selected === option.id;
          const votedCard = votedOption === option.id;

          return (
            <button
              className={clsx("vote-card", selectedCard && "selected", votedCard && "voted")}
              key={option.id}
              onClick={() => {
                if (!hasVoted && !isClosed) setSelected(option.id);
              }}
              disabled={hasVoted || isClosed}
            >
              <img className="vote-image" src={option.image} alt="" />
              <div className="vote-content">
                <div className="section-row">
                  <h2 className="vote-label">{option.label}</h2>
                  <span className="tag">{stat.percent >= 55 ? "관심필요" : "따끈따끈"}</span>
                </div>
                <div>
                  <div className="metric">
                    <span className="percent">{stat.percent}%</span>
                    <span className="count"><UsersRound size={14} /> {stat.count}명</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-fill" style={{ "--value": `${stat.percent}%` } as React.CSSProperties} />
                  </div>
                </div>
              </div>
            </button>
          );
        })}
      </section>

      {hasVoted ? (
        <ScratchTicket poll={poll} isClosed={isClosed} busy={busy} result={result} onReveal={revealReward} />
      ) : null}

      <div className="floating">
        {hasVoted ? (
          <button className="action-btn secondary" onClick={shareLink}>
            <Link size={20} />
            링크 공유하기
          </button>
        ) : (
          <button className="action-btn" onClick={submitVote} disabled={!selected || busy || isClosed}>
            <TicketCheck size={20} />
            {isClosed ? "마감된 투표예요" : busy ? "응모 중..." : "투표하고 복권 받기"}
          </button>
        )}
      </div>
    </main>
  );
}
