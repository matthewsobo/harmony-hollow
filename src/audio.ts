/*
 * audio.ts — reference tones, synthesized with the Web Audio API.
 *
 * We synthesize piano-ish tones (triangle wave + a quiet octave partial, fast
 * attack, exponential decay) instead of bundling samples: zero download
 * weight, and plenty good for "which key did I tap" feedback. If the family
 * ever wants prettier sound, swapping in samples only touches this file.
 *
 * iOS rule: an AudioContext only produces sound after a user gesture, so
 * ensureAudio() is called from tap handlers — never from timers or effects.
 */

let ctx: AudioContext | null = null;

export function ensureAudio(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === 'suspended') void ctx.resume();
  return ctx;
}

export function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

/** Play one piano-ish note. `when` is seconds from now (audio-clock scheduled). */
export function playNote(midi: number, opts: { dur?: number; when?: number; gain?: number } = {}): void {
  const { dur = 0.6, when = 0, gain = 0.22 } = opts;
  try {
    const ac = ensureAudio();
    if (ac.state !== 'running') return; // no gesture yet — stay silent, never crash
    const t0 = ac.currentTime + when;
    const freq = midiToFreq(midi);

    const master = ac.createGain();
    master.connect(ac.destination);
    // Fast attack, exponential decay — the shape that reads as "plucked/struck".
    master.gain.setValueAtTime(0.0001, t0);
    master.gain.exponentialRampToValueAtTime(gain, t0 + 0.015);
    master.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);

    const fundamental = ac.createOscillator();
    fundamental.type = 'triangle';
    fundamental.frequency.value = freq;

    // A quiet upper octave adds brightness so it doesn't sound like a buzzer.
    const partial = ac.createOscillator();
    partial.type = 'sine';
    partial.frequency.value = freq * 2;
    const partialGain = ac.createGain();
    partialGain.gain.value = 0.25;

    fundamental.connect(master);
    partial.connect(partialGain).connect(master);
    fundamental.start(t0);
    partial.start(t0);
    fundamental.stop(t0 + dur + 0.05);
    partial.stop(t0 + dur + 0.05);
  } catch {
    /* audio is a nice-to-have; never let it break gameplay */
  }
}

/** Little rising arpeggio for a correct answer. */
export function playCorrectJingle(): void {
  playNote(72, { when: 0.0, dur: 0.18, gain: 0.15 });   // C5
  playNote(76, { when: 0.09, dur: 0.18, gain: 0.15 });  // E5
  playNote(79, { when: 0.18, dur: 0.35, gain: 0.18 });  // G5
}

/** Bigger flourish for finishing a whole round. */
export function playFanfare(): void {
  [60, 64, 67, 72, 76, 79, 84].forEach((m, i) =>
    playNote(m, { when: i * 0.08, dur: 0.4, gain: 0.16 })
  );
}
