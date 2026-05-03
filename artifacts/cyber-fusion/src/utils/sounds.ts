const MUTE_KEY = "rf-copilot-sound-muted";

export function isSoundMuted(): boolean {
  try { return localStorage.getItem(MUTE_KEY) === "true"; } catch { return false; }
}

export function setSoundMuted(muted: boolean): void {
  try { localStorage.setItem(MUTE_KEY, String(muted)); } catch {}
}

function tone(opts: {
  freq: number; freqEnd?: number; duration: number;
  volume: number; type?: OscillatorType; delay?: number;
}): void {
  const { freq, freqEnd, duration, volume, type = "sine", delay = 0 } = opts;
  try {
    const ctx = new AudioContext();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.type = type;
    const t = ctx.currentTime + delay;
    osc.frequency.setValueAtTime(freq, t);
    if (freqEnd) osc.frequency.exponentialRampToValueAtTime(freqEnd, t + duration * 0.75);
    gain.gain.setValueAtTime(0.001, t);
    gain.gain.linearRampToValueAtTime(volume, t + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    osc.start(t);
    osc.stop(t + duration + 0.05);
    setTimeout(() => { try { ctx.close(); } catch {} }, (delay + duration + 0.2) * 1000);
  } catch {}
}

export function playOpenSound(): void {
  if (isSoundMuted()) return;
  tone({ freq: 280, freqEnd: 840, duration: 0.22, volume: 0.18, type: "sine" });
  tone({ freq: 840, freqEnd: 1120, duration: 0.18, volume: 0.12, type: "sine", delay: 0.18 });
}

export function playReplySound(): void {
  if (isSoundMuted()) return;
  tone({ freq: 1047, duration: 0.18, volume: 0.1, type: "sine" });
  tone({ freq: 1319, duration: 0.22, volume: 0.08, type: "sine", delay: 0.14 });
}
