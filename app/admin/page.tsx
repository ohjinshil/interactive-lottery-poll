"use client";

import { useState } from "react";
import { ImagePlus, Link2, Rocket, Sparkles } from "lucide-react";

type OptionInput = {
  label: string;
  image: string;
};

const emptyOptions: OptionInput[] = [
  { label: "AI 자동화 실습", image: "" },
  { label: "콘텐츠 제작 실습", image: "" }
];

function readFile(file: Blob) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

async function compressImage(file: File) {
  const raw = await readFile(file);
  const image = await loadImage(raw);
  const maxSide = 1100;
  const ratio = Math.min(1, maxSide / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * ratio));
  const height = Math.max(1, Math.round(image.height * ratio));
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;

  const ctx = canvas.getContext("2d");
  if (!ctx) return raw;

  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, width, height);
  ctx.drawImage(image, 0, 0, width, height);

  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.72));
  return blob ? readFile(blob) : raw;
}

export default function AdminPage() {
  const [title, setTitle] = useState("디지털 AI 능력 UP! 다음 주제 투표");
  const [description, setDescription] = useState("가장 기대되는 실습 주제에 투표하고 행운의 복권을 받아보세요.");
  const [hostName, setHostName] = useState("DIGITAL AI ABILITY UP");
  const [tag, setTag] = useState("따끈따끈");
  const [minutes, setMinutes] = useState(30);
  const [pin, setPin] = useState("");
  const [options, setOptions] = useState<OptionInput[]>(emptyOptions);
  const [rewardImage, setRewardImage] = useState("");
  const [shareUrl, setShareUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  function updateOption(index: number, patch: Partial<OptionInput>) {
    setOptions((current) => current.map((option, i) => (i === index ? { ...option, ...patch } : option)));
  }

  async function handleImage(file: File | undefined, callback: (image: string) => void) {
    if (!file) return;
    setMessage("이미지를 업로드용으로 압축하는 중이에요.");
    try {
      const image = await compressImage(file);
      callback(image);
      setMessage("이미지가 준비됐어요.");
    } catch {
      setMessage("이미지를 처리하지 못했어요. 다른 이미지로 다시 시도해 주세요.");
    }
  }

  async function createPoll() {
    setBusy(true);
    setMessage("");

    const res = await fetch("/api/admin", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        pin,
        title,
        description,
        hostName,
        tag,
        endTime: Date.now() + minutes * 60_000,
        options,
        rewardImage
      })
    });

    const data = await res.json().catch(() => ({ ok: false, code: "SERVER_ERROR" }));
    setBusy(false);

    if (!data.ok) {
      if (data.code === "IMAGE_TOO_LARGE") {
        setMessage("이미지가 아직 너무 커요. 더 작은 이미지로 다시 올려주세요.");
      } else if (data.code === "STORE_NOT_CONFIGURED") {
        setMessage("Vercel의 Redis 환경변수가 아직 연결되지 않았어요. UPSTASH_REDIS_REST_URL/TOKEN을 확인해 주세요.");
      } else if (data.code === "UNAUTHORIZED") {
        setMessage("관리 PIN이 맞지 않아요.");
      } else {
        setMessage("생성에 실패했어요. Vercel 로그와 환경변수를 확인해 주세요.");
      }
      return;
    }

    setShareUrl(window.location.origin);
    setMessage("투표가 생성됐어요.");
  }

  return (
    <main className="shell">
      <section className="brand-row">
        <div>
          <p className="eyebrow">ADMIN CREATOR</p>
          <h1 className="title">복권 투표 만들기</h1>
          <p className="description">이미지는 MVP에 맞게 압축된 썸네일을 권장합니다.</p>
        </div>
        <div className="brand-mark"><Sparkles size={22} /></div>
      </section>

      <section className="admin-panel">
        <label className="field">
          <span>관리 PIN</span>
          <input className="input" value={pin} onChange={(event) => setPin(event.target.value)} placeholder="Vercel ADMIN_PIN 사용 시 입력" />
        </label>
        <label className="field">
          <span>투표 제목</span>
          <input className="input" value={title} onChange={(event) => setTitle(event.target.value)} />
        </label>
        <label className="field">
          <span>설명</span>
          <textarea className="textarea" value={description} onChange={(event) => setDescription(event.target.value)} />
        </label>
        <div className="preview-grid">
          <label className="field">
            <span>호스트명</span>
            <input className="input" value={hostName} onChange={(event) => setHostName(event.target.value)} />
          </label>
          <label className="field">
            <span>상황 태그</span>
            <select className="select" value={tag} onChange={(event) => setTag(event.target.value)}>
              <option>따끈따끈</option>
              <option>관심필요</option>
              <option>마감임박</option>
              <option>인기상승</option>
            </select>
          </label>
        </div>
        <label className="field">
          <span>진행 시간</span>
          <input className="input" type="number" min={1} value={minutes} onChange={(event) => setMinutes(Number(event.target.value))} />
        </label>

        {options.map((option, index) => (
          <div className="option-editor" key={index}>
            <div className="section-row">
              <strong>선택지 {index + 1}</strong>
              <ImagePlus size={18} />
            </div>
            <input className="input" value={option.label} onChange={(event) => updateOption(index, { label: event.target.value })} />
            <input className="file" type="file" accept="image/*" onChange={(event) => handleImage(event.target.files?.[0], (image) => updateOption(index, { image }))} />
            {option.image ? <img className="thumb-preview" src={option.image} alt="" /> : null}
          </div>
        ))}

        <div className="option-editor">
          <div className="section-row">
            <strong>당첨 리워드 이미지</strong>
            <ImagePlus size={18} />
          </div>
          <input className="file" type="file" accept="image/*" onChange={(event) => handleImage(event.target.files?.[0], setRewardImage)} />
          {rewardImage ? <img className="thumb-preview" src={rewardImage} alt="" /> : null}
        </div>

        {message ? <p className="notice">{message}</p> : null}
        {shareUrl ? (
          <div className="notice">
            <Link2 size={15} /> {shareUrl}
          </div>
        ) : null}
      </section>

      <div className="floating">
        <button className="action-btn" onClick={createPoll} disabled={busy || !title || !options[0].image || !options[1].image || !rewardImage}>
          <Rocket size={20} />
          {busy ? "생성 중..." : "투표 생성하기"}
        </button>
      </div>
    </main>
  );
}
