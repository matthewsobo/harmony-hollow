/*
 * test-pitch.mjs — Node harness for pitch.js.
 *
 * Run with:  node phase0-mic-test/test-pitch.mjs
 *
 * Feeds the YIN detector synthetic signals that imitate the hard cases the
 * project brief calls out — especially low piano notes whose fundamental is
 * weaker than their harmonics — and checks the detected note. This proves the
 * MATH is right before we test the MICROPHONE on the real iPad; if the iPad
 * test then fails, we know to blame the mic/iOS side, not the algorithm.
 */
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { detectPitch, freqToNote, midiToFreq, rms } = require('./pitch.js');

const SAMPLE_RATE = 48000; // what iPads actually use
const BUF_SIZE = 4096;     // same analysis window the page uses (~85 ms)

// --- Signal generators -------------------------------------------------------

function sine(freq, { amp = 0.5 } = {}) {
  const buf = new Float32Array(BUF_SIZE);
  for (let i = 0; i < BUF_SIZE; i++) {
    buf[i] = amp * Math.sin((2 * Math.PI * freq * i) / SAMPLE_RATE);
  }
  return buf;
}

// Piano-like: several harmonics, DECAYING envelope, and a deliberately weak
// fundamental (the case that fools naive FFT peak-picking on low notes).
function pianoLike(freq, { fundamentalAmp = 0.15 } = {}) {
  const harmonicAmps = [fundamentalAmp, 1.0, 0.6, 0.4, 0.25, 0.15];
  const buf = new Float32Array(BUF_SIZE);
  for (let i = 0; i < BUF_SIZE; i++) {
    const t = i / SAMPLE_RATE;
    let s = 0;
    harmonicAmps.forEach((amp, h) => {
      // Slight inharmonicity like real piano strings (harmonics run a bit sharp).
      const stretch = 1 + 0.0004 * h * h;
      s += amp * Math.sin(2 * Math.PI * freq * (h + 1) * stretch * t);
    });
    buf[i] = 0.4 * s * Math.exp(-t * 1.5); // decaying strike
  }
  return buf;
}

function whiteNoise(amp = 0.3) {
  const buf = new Float32Array(BUF_SIZE);
  for (let i = 0; i < BUF_SIZE; i++) buf[i] = amp * (Math.random() * 2 - 1);
  return buf;
}

function mix(a, b) {
  const buf = new Float32Array(BUF_SIZE);
  for (let i = 0; i < BUF_SIZE; i++) buf[i] = a[i] + b[i];
  return buf;
}

// --- Test cases --------------------------------------------------------------

const A4 = 440;
const cases = [
  { label: 'Pure sine A4 (440 Hz)',            buf: sine(A4),                          expect: 'A4' },
  { label: 'Pure sine C4 / Middle C',           buf: sine(261.63),                      expect: 'C4' },
  { label: 'Piano-like C3, weak fundamental',   buf: pianoLike(130.81),                 expect: 'C3' },
  { label: 'Piano-like G3, weak fundamental',   buf: pianoLike(196.0),                  expect: 'G3' },
  { label: 'Piano-like C4',                     buf: pianoLike(261.63),                 expect: 'C4' },
  { label: 'Piano-like C5',                     buf: pianoLike(523.25),                 expect: 'C5' },
  { label: 'Piano-like C6',                     buf: pianoLike(1046.5),                 expect: 'C6' },
  { label: 'Piano-like C3 + light noise',       buf: mix(pianoLike(130.81), whiteNoise(0.03)), expect: 'C3' },
  // The real-iPad failure case (C3 read as C4): at music-stand distance the
  // fundamental is essentially GONE, not just weak. These must still read C3.
  { label: 'C3, fundamental fully missing',     buf: pianoLike(130.81, { fundamentalAmp: 0 }), expect: 'C3' },
  { label: 'C3, missing fund. + light noise',   buf: mix(pianoLike(130.81, { fundamentalAmp: 0 }), whiteNoise(0.02)), expect: 'C3' },
  { label: 'E3, fundamental fully missing',     buf: pianoLike(164.81, { fundamentalAmp: 0 }), expect: 'E3' },
  { label: 'Piano-like A4 + light noise',       buf: mix(pianoLike(A4), whiteNoise(0.03)),     expect: 'A4' },
  // A piano 30 cents flat (badly out of tune) should still round to the right
  // note — this is the "generous tolerance" requirement in action.
  { label: 'C4 tuned 30 cents flat',            buf: pianoLike(261.63 * Math.pow(2, -30 / 1200)), expect: 'C4' },
  // Non-pitched input must NOT produce a confident note (false-positive guard).
  { label: 'Pure white noise (expect no pitch)', buf: whiteNoise(0.3),                  expect: null },
  { label: 'Near-silence (expect no pitch)',     buf: whiteNoise(0.002),               expect: null },
];

// --- Runner ------------------------------------------------------------------

let pass = 0, fail = 0;
for (const c of cases) {
  const level = rms(c.buf);
  const gated = level < 0.01; // same default gate as the page
  const result = gated ? null : detectPitch(c.buf, SAMPLE_RATE);
  // Same acceptance rule as the page: a pitch only counts if clarity is high.
  const confident = result && result.clarity > 0.8;
  const note = confident ? freqToNote(result.freq) : null;

  let ok;
  if (c.expect === null) ok = !confident;
  else ok = note !== null && note.name === c.expect;

  const detail = confident
    ? `${note.name} @ ${result.freq.toFixed(2)} Hz (${note.cents >= 0 ? '+' : ''}${note.cents.toFixed(1)}c, clarity ${result.clarity.toFixed(3)})`
    : gated ? 'gated (below RMS threshold)' : 'no confident pitch';

  console.log(`${ok ? 'PASS' : 'FAIL'}  ${c.label.padEnd(38)} -> ${detail}`);
  ok ? pass++ : fail++;
}

console.log(`\n${pass}/${pass + fail} passed`);
process.exit(fail === 0 ? 0 : 1);
