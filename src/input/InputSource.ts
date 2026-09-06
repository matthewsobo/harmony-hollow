/*
 * InputSource — abstraction over "how does the app hear which note the child
 * played?". Game components only ever talk to this interface, never to
 * getUserMedia / AudioContext directly. That's why three implementations can
 * coexist: the real microphone (mic/MicPitchInputSource), a fake source for
 * development and automated testing, and a stubbed MIDI source in case the
 * family ever adds a digital piano.
 */

/** A confirmed note event: MIDI number (Middle C = 60) plus confidence. */
export interface NoteEvent {
  midi: number;
  /** Cents deviation from the rounded midi (after tuning offset), -50..+50. */
  cents: number;
  /** 0..1 — detectors report confidence; MIDI hardware would be 1. */
  confidence: number;
  timestampMs: number;
}

export interface InputSource {
  /** Human-readable name for settings/debug UI. */
  readonly label: string;
  /** Live input level 0..~0.2, for UI meters. */
  readonly level: number;
  /** Start delivering note events. Rejects if unavailable (e.g. mic denied). */
  start(onNote: (event: NoteEvent) => void): Promise<void>;
  stop(): void;
}

/** Stub: Web MIDI exists but iOS Safari support is limited. Not MVP scope. */
export class MIDIInputSource implements InputSource {
  readonly label = 'MIDI keyboard';
  readonly level = 0;
  async start(_onNote: (event: NoteEvent) => void): Promise<void> {
    throw new Error('MIDI support is stubbed only');
  }
  stop(): void {}
}
