// Procedural Web Audio Synthesizer with ±8% pitch variation and concurrency cap
// Mirrors SUNDERLOOM Phase 6 Sound Concurrency and layered feedback audio.

class SunderloomAudio {
  private ctx: AudioContext | null = null;
  private muted = false;
  private masterVolume = 0.8;
  private activeVoices = 0;
  private readonly maxConcurrentVoices = 6;

  public setMuted(isMuted: boolean): void {
    this.muted = isMuted;
  }

  public setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
  }

  public isMuted(): boolean {
    return this.muted;
  }

  private ensureContext(): AudioContext | null {
    if (this.muted || typeof window === 'undefined') return null;
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;
      this.ctx = new AudioCtx();
    }
    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }
    return this.ctx;
  }

  private playTone(
    freqStart: number,
    freqEnd: number,
    duration: number,
    type: OscillatorType,
    gainPeak: number,
  ): void {
    const ctx = this.ensureContext();
    if (!ctx || this.activeVoices >= this.maxConcurrentVoices) return;

    this.activeVoices++;
    const now = ctx.currentTime;
    const jitter = 0.92 + Math.random() * 0.16; // ±8% pitch variation

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart * jitter, now);
    osc.frequency.exponentialRampToValueAtTime(Math.max(20, freqEnd * jitter), now + duration);

    const scaledPeak = Math.max(0.001, gainPeak * this.masterVolume);
    gain.gain.setValueAtTime(0.001, now);
    gain.gain.linearRampToValueAtTime(scaledPeak, now + 0.012);
    gain.gain.exponentialRampToValueAtTime(0.0008, now + duration);

    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start(now);
    osc.stop(now + duration + 0.02);
    osc.onended = () => {
      this.activeVoices = Math.max(0, this.activeVoices - 1);
    };
  }

  public playSwing(comboStep: number): void {
    const base = 210 + comboStep * 45;
    this.playTone(base, base * 0.45, 0.12, 'triangle', 0.12);
  }

  public playHit(heavy: boolean, crit: boolean): void {
    if (crit) {
      this.playTone(640, 260, 0.16, 'sawtooth', 0.14);
      this.playTone(980, 1320, 0.14, 'sine', 0.1);
    } else if (heavy) {
      this.playTone(150, 48, 0.2, 'sawtooth', 0.18);
    } else {
      this.playTone(230, 85, 0.11, 'square', 0.11);
    }
  }

  public playRuneLance(): void {
    this.playTone(580, 1180, 0.13, 'sine', 0.1);
  }

  public playPhaseStep(): void {
    this.playTone(420, 160, 0.15, 'sine', 0.11);
  }

  public playTelegraph(): void {
    this.playTone(260, 480, 0.22, 'triangle', 0.07);
  }

  public playPlayerHurt(): void {
    this.playTone(140, 52, 0.24, 'sawtooth', 0.18);
  }

  public playRoomLock(): void {
    this.playTone(120, 62, 0.32, 'triangle', 0.15);
  }

  public playRoomClear(): void {
    this.playTone(392, 523, 0.22, 'sine', 0.12);
    setTimeout(() => this.playTone(523, 659, 0.28, 'sine', 0.12), 110);
  }

  public playRelicClaim(): void {
    this.playTone(440, 880, 0.24, 'triangle', 0.13);
  }

  public playBossRoar(): void {
    this.playTone(110, 44, 0.55, 'sawtooth', 0.2);
  }

  public playDefeat(): void {
    this.playTone(220, 74, 0.55, 'sawtooth', 0.16);
  }
}

export const gameAudio = new SunderloomAudio();
