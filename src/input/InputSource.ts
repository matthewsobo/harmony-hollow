/*
 * InputSource — abstraction over "how does the app hear which note the child
 * played?". Phase 4 implements MicPitchInputSource for real (productionizing
 * the Phase 0 prototype); the MIDI stub exists so that if the family ever adds
 * a digital piano, supporting it is a new implementation of this interface,
 * not a rewrite of the game modes.
 *
 * Game components must only ever talk to this interface, never to
 * getUserMedia / AudioContext directly.
 */

/** A note event: MIDI number (Middle C = 60) plus how confident we are. */
export interface NoteEvent {
  midi: number;
  /** 0..1 — detectors report confidence; MIDI hardware is always 1. */
  confidence: number;
  timestampMs: number;
}

export interface InputSource {
  /** Human-readable name for settings/debug UI. */
  readonly label: string;
  /** Start delivering note events. Rejects if unavailable (e.g. mic denied). */
  start(onNote: (event: NoteEvent) => void): Promise<void>;
  stop(): void;
}

/** Phase 4 will port the verified Phase 0 pitch pipeline into this class. */
export class MicPitchInputSource implements InputSource {
  readonly label = 'Microphone (acoustic piano)';
  async start(_onNote: (event: NoteEvent) => void): Promise<void> {
    throw new Error('MicPitchInputSource arrives in Phase 4');
  }
  stop(): void {}
}

/** Stub: Web MIDI exists but iOS Safari support is limited. Not MVP scope. */
export class MIDIInputSource implements InputSource {
  readonly label = 'MIDI keyboard';
  async start(_onNote: (event: NoteEvent) => void): Promise<void> {
    throw new Error('MIDI support is stubbed only');
  }
  stop(): void {}
}
