/*
 * MicPitchInputSource — the production microphone pipeline, built from what
 * the Phase 0 iPad/iPhone testing proved out:
 *
 *  - Voice-call processing (echo cancellation / noise suppression / AGC) is
 *    requested OFF — it eats piano harmonics.
 *  - An RMS gate ignores everything quieter than the calibrated threshold
 *    (per-device: the iPad needed 0.002 at music-stand distance).
 *  - A note is only EMITTED after 5 consecutive frames agree on the same
 *    note within a 30-cent band — piano notes hold pitch, speech glides, so
 *    this is what keeps household conversation from registering as answers.
 *  - The calibrated tuning offset (how sharp/flat the family piano runs) is
 *    subtracted before rounding to a note.
 *
 * Emission is edge-triggered: one event per struck note. After emitting, the
 * source re-arms when the signal drops below the gate briefly (the gap
 * between key presses) or when a DIFFERENT note stabilizes (legato playing).
 */
import { detectPitch, freqToMidiFloat, rms } from './pitch';
import type { InputSource, NoteEvent } from '../input/InputSource';

export interface MicConfig {
  gateThreshold: number;
  tuningOffsetCents: number;
}

const BUF_SIZE = 4096;         // ~85ms at 48kHz — resolves C3, feels instant
const CONFIRM_FRAMES = 5;
const MAX_CENTS_SPAN = 30;
const CLARITY_MIN = 0.8;
// Re-arming (allowing the SAME note to trigger again) requires ~200ms of
// genuine silence, well below the gate. The first cut used 3 frames (~50ms)
// right at the gate line — a long-ringing piano note decaying across the
// threshold would dip out and back, re-fire the same answer, and (on a wrong
// answer) re-narrate the hint in a loop. Real device testing caught it.
const REARM_QUIET_FRAMES = 12;
const REARM_LEVEL_FACTOR = 0.7; // silence = below 70% of the gate, not just below it

export class MicPitchInputSource implements InputSource {
  readonly label = 'Microphone (acoustic piano)';
  level = 0;
  /** Live raw detection for UI (may flicker; emissions are debounced). */
  detectedMidi: number | null = null;

  private stream: MediaStream | null = null;
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private buf = new Float32Array(BUF_SIZE);
  private raf = 0;

  private stableMidi: number | null = null;
  private stableCount = 0;
  private minCents = 0;
  private maxCents = 0;
  private armed = true;
  private quietFrames = 0;
  private lastEmitted: number | null = null;

  constructor(private config: MicConfig) {}

  async start(onNote: (event: NoteEvent) => void): Promise<void> {
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    this.ctx = new AudioContext();
    await this.ctx.resume();
    const source = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = BUF_SIZE;
    source.connect(this.analyser);

    const tick = () => {
      if (!this.analyser || !this.ctx) return;
      this.analyser.getFloatTimeDomainData(this.buf);
      this.level = rms(this.buf);

      if (this.level < this.config.gateThreshold) {
        this.detectedMidi = null;
        this.resetStreak();
        // Only clearly-quiet frames count toward re-arming; the band between
        // 70% and 100% of the gate is a dead zone (neither detects nor re-arms),
        // so a note decaying across the threshold can't re-trigger itself.
        if (this.level < this.config.gateThreshold * REARM_LEVEL_FACTOR) {
          this.quietFrames++;
          if (this.quietFrames >= REARM_QUIET_FRAMES) this.armed = true;
        }
      } else {
        this.quietFrames = 0;
        const r = detectPitch(this.buf, this.ctx.sampleRate);
        if (r && r.clarity >= CLARITY_MIN) {
          // Apply the piano's calibrated drift BEFORE rounding to a note.
          const midiFloat = freqToMidiFloat(r.freq) - this.config.tuningOffsetCents / 100;
          const midi = Math.round(midiFloat);
          const cents = (midiFloat - midi) * 100;
          this.detectedMidi = midi;

          if (midi === this.stableMidi) {
            this.stableCount++;
            this.minCents = Math.min(this.minCents, cents);
            this.maxCents = Math.max(this.maxCents, cents);
            if (this.maxCents - this.minCents > MAX_CENTS_SPAN) {
              // Gliding pitch (a voice, not a string) — restart the streak.
              this.stableCount = 1;
              this.minCents = this.maxCents = cents;
            }
          } else {
            // A different note stabilizing re-arms us even without a gap.
            if (midi !== this.lastEmitted) this.armed = true;
            this.stableMidi = midi;
            this.stableCount = 1;
            this.minCents = this.maxCents = cents;
          }

          if (this.stableCount >= CONFIRM_FRAMES && this.armed) {
            this.armed = false;
            this.lastEmitted = midi;
            onNote({ midi, cents, confidence: r.clarity, timestampMs: performance.now() });
          }
        } else {
          this.detectedMidi = null;
          this.resetStreak();
        }
      }
      this.raf = requestAnimationFrame(tick);
    };
    this.raf = requestAnimationFrame(tick);
  }

  private resetStreak() {
    this.stableMidi = null;
    this.stableCount = 0;
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
    this.stream?.getTracks().forEach((t) => t.stop()); // releases the mic (green dot off)
    void this.ctx?.close();
    this.stream = null;
    this.ctx = null;
    this.analyser = null;
  }
}

/*
 * FakeMicInputSource — development/testing double. Activated by adding
 * ?fakemic=1 to the URL: no getUserMedia, and window.__fakeNote(midi, cents?)
 * injects a note as if the piano had played it. This is how the game logic
 * gets exercised in an automated browser with no microphone; the real-device
 * test then only has to validate the audio pipeline itself.
 */
export class FakeMicInputSource implements InputSource {
  readonly label = 'Fake mic (testing)';
  level = 0.05;
  async start(onNote: (event: NoteEvent) => void): Promise<void> {
    (window as unknown as Record<string, unknown>).__fakeNote = (midi: number, cents = 0) =>
      onNote({ midi, cents, confidence: 1, timestampMs: performance.now() });
  }
  stop(): void {
    delete (window as unknown as Record<string, unknown>).__fakeNote;
  }
}

export function micAvailable(): boolean {
  return typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
}

export function createMicSource(config: MicConfig): InputSource {
  if (new URLSearchParams(window.location.search).has('fakemic')) {
    return new FakeMicInputSource();
  }
  return new MicPitchInputSource(config);
}
