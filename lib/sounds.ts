export type SoundType = "correct" | "wrong" | "click" | "gameOver" | "levelUp";

let audioCtx: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === "undefined") return null;
  if (!audioCtx) {
    try {
      audioCtx = new AudioContext();
    } catch {
      return null;
    }
  }
  return audioCtx;
}

export function isMuted(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem("sound-muted") === "true";
}

export function setMuted(muted: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem("sound-muted", String(muted));
}

export function toggleMute(): boolean {
  const next = !isMuted();
  setMuted(next);
  return next;
}

function playTone(
  freq: number,
  duration: number,
  type: OscillatorType = "sine",
  volume = 0.3,
) {
  const ctx = getContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, ctx.currentTime);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

function playCorrect() {
  playTone(880, 0.1);
}

function playWrong() {
  playTone(220, 0.2, "square", 0.2);
}

function playClick() {
  playTone(600, 0.05, "sine", 0.15);
}

function playGameOver() {
  const ctx = getContext();
  if (!ctx) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(300, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(100, ctx.currentTime + 0.4);
  gain.gain.setValueAtTime(0.2, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.4);
}

function playLevelUp() {
  const notes = [440, 660, 880];
  const noteDuration = 0.08;
  const gap = 0.04;
  notes.forEach((freq, i) => {
    const offset = i * (noteDuration + gap);
    const ctx = getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = "sine";
    osc.frequency.setValueAtTime(freq, ctx.currentTime + offset);
    gain.gain.setValueAtTime(0.3, ctx.currentTime + offset);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + noteDuration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + offset);
    osc.stop(ctx.currentTime + offset + noteDuration);
  });
}

const soundMap: Record<SoundType, () => void> = {
  correct: playCorrect,
  wrong: playWrong,
  click: playClick,
  gameOver: playGameOver,
  levelUp: playLevelUp,
};

export function playSound(type: SoundType): void {
  if (isMuted()) return;
  soundMap[type]();
}
