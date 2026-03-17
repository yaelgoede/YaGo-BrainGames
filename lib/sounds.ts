export type SoundType = "correct" | "wrong" | "click" | "gameOver" | "levelUp" | "wheelTick" | "jackpot" | "bust" | "scratch" | "collectible" | "eventStart" | "eventComplete" | "scratchWin";

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
  if (audioCtx.state === "suspended") {
    audioCtx.resume().catch(() => {});
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
  playSweep(300, 100, 0.4);
}

function playArpeggio(
  notes: number[],
  type: OscillatorType = "sine",
  duration = 0.1,
  gap = 0.05,
  volume = 0.3,
) {
  notes.forEach((freq, i) => {
    const offset = i * (duration + gap);
    const ctx = getContext();
    if (!ctx) return;
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, ctx.currentTime + offset);
    gain.gain.setValueAtTime(volume, ctx.currentTime + offset);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + offset + duration);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(ctx.currentTime + offset);
    osc.stop(ctx.currentTime + offset + duration);
  });
}

function playSweep(
  startFreq: number,
  endFreq: number,
  duration: number,
  type: OscillatorType = "sawtooth",
  volume = 0.2,
) {
  const ctx = getContext();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(startFreq, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(endFreq, ctx.currentTime + duration);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + duration);
}

function playLevelUp() {
  playArpeggio([440, 660, 880], "sine", 0.08, 0.04);
}

function playWheelTick() {
  playTone(1200, 0.03, "sine", 0.1);
}

function playJackpot() {
  playArpeggio([523, 659, 784, 1047]);
}

function playBust() {
  playSweep(400, 80, 0.5);
}

function playScratch() {
  playSweep(800, 200, 0.08, "square", 0.15);
}

function playCollectible() {
  playTone(660, 0.06, "sine", 0.25);
  setTimeout(() => playTone(880, 0.06, "sine", 0.25), 80);
}

function playEventStart() {
  playArpeggio([440, 660, 880], "triangle", 0.1, 0.02, 0.25);
}

function playEventComplete() {
  playArpeggio([523, 659, 784, 1047], "sine", 0.15, -0.03);
}

const soundMap: Record<SoundType, () => void> = {
  correct: playCorrect,
  wrong: playWrong,
  click: playClick,
  gameOver: playGameOver,
  levelUp: playLevelUp,
  wheelTick: playWheelTick,
  jackpot: playJackpot,
  bust: playBust,
  scratch: playScratch,
  collectible: playCollectible,
  eventStart: playEventStart,
  eventComplete: playEventComplete,
  scratchWin: playJackpot,
};

export function playSound(type: SoundType): void {
  if (isMuted()) return;
  try {
    soundMap[type]();
  } catch {
    // Silently ignore — iOS Safari may suspend AudioContext
  }
}
