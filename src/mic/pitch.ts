/*
 * pitch.ts — the production port of the Phase 0 pitch detector
 * (public/phase0-mic-test/pitch.js), typed and tree-shakeable. The algorithm
 * is IDENTICAL to the verified prototype — YIN with octave-error correction —
 * and the phase0 page stays deployed as the reference/debug implementation.
 *
 * Why YIN and not an FFT peak: a piano note (especially C3-ish and below)
 * often has a WEAKER fundamental than its harmonics, which fools peak-picking
 * into the wrong octave. YIN finds the lag where the waveform best repeats
 * itself — its period — which survives a weak or missing fundamental.
 */

export interface PitchResult {
  freq: number;
  /** 0..1 — how periodic the signal is (1 = perfectly). */
  clarity: number;
}

export function detectPitch(
  buf: Float32Array,
  sampleRate: number,
  opts: { minFreq?: number; maxFreq?: number; threshold?: number } = {}
): PitchResult | null {
  const minFreq = opts.minFreq ?? 70;
  const maxFreq = opts.maxFreq ?? 2200;
  const threshold = opts.threshold ?? 0.15;

  const N = buf.length;
  const W = N >> 1; // integration window = half the buffer
  const maxTau = Math.min(W, Math.floor(sampleRate / minFreq));
  const minTau = Math.max(2, Math.floor(sampleRate / maxFreq));

  // Difference function: how much the signal differs from itself shifted by tau.
  const d = new Float32Array(maxTau + 1);
  for (let tau = 1; tau <= maxTau; tau++) {
    let sum = 0;
    for (let i = 0; i < W; i++) {
      const diff = buf[i] - buf[i + tau];
      sum += diff * diff;
    }
    d[tau] = sum;
  }

  // Cumulative-mean normalization: makes a fixed threshold work at any volume.
  const cmnd = new Float32Array(maxTau + 1);
  cmnd[0] = 1;
  let running = 0;
  for (let tau = 1; tau <= maxTau; tau++) {
    running += d[tau];
    cmnd[tau] = running > 0 ? (d[tau] * tau) / running : 1;
  }

  // First dip under the threshold (not the global min — that's octave bait).
  let tauEstimate = -1;
  for (let tau = minTau; tau <= maxTau; tau++) {
    if (cmnd[tau] < threshold) {
      while (tau + 1 <= maxTau && cmnd[tau + 1] < cmnd[tau]) tau++;
      tauEstimate = tau;
      break;
    }
  }
  if (tauEstimate === -1) {
    let best = minTau;
    for (let tau = minTau; tau <= maxTau; tau++) {
      if (cmnd[tau] < cmnd[best]) best = tau;
    }
    if (cmnd[best] < 0.35) tauEstimate = best;
    else return null;
  }

  // Octave-error correction (the real-iPad C3→C4 fix): if DOUBLE the period
  // matches decisively better, the true note is an octave lower. Guarded so a
  // near-perfect candidate (true note, pure tones) is never halved.
  const tau2 = tauEstimate * 2;
  if (tau2 <= maxTau && cmnd[tauEstimate] > 0.03) {
    const win = Math.max(2, Math.round(tau2 * 0.01));
    const lo = Math.max(minTau, tau2 - win);
    const hi = Math.min(maxTau, tau2 + win);
    let best2 = lo;
    for (let k = lo; k <= hi; k++) if (cmnd[k] < cmnd[best2]) best2 = k;
    if (cmnd[best2] < cmnd[tauEstimate] * 0.5 && cmnd[best2] < threshold) {
      tauEstimate = best2;
    }
  }

  // Parabolic interpolation for sub-sample precision (≪1 cent).
  const t = tauEstimate;
  const x0 = t > 0 ? cmnd[t - 1] : cmnd[t];
  const x1 = cmnd[t];
  const x2 = t < maxTau ? cmnd[t + 1] : cmnd[t];
  const denom = x0 + x2 - 2 * x1;
  let betterTau = t;
  if (Math.abs(denom) > 1e-12) betterTau = t + (x0 - x2) / (2 * denom);

  return { freq: sampleRate / betterTau, clarity: 1 - x1 };
}

/** RMS level — the "is anything actually playing?" gate signal. */
export function rms(buf: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
  return Math.sqrt(sum / buf.length);
}

export function freqToMidiFloat(freq: number): number {
  return 69 + 12 * Math.log2(freq / 440);
}
