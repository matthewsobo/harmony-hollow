/*
 * pitch.js — Phase 0 pitch detection for Harmony Hollow.
 *
 * This file is deliberately plain JavaScript with no imports so the SAME code
 * can run in two places:
 *   1. The browser test page (index.html loads it with a <script> tag).
 *   2. A Node test harness (test-pitch.mjs) that feeds it synthetic piano-like
 *      signals to verify the algorithm before we ever touch a real microphone.
 *
 * Algorithm: YIN (de Cheveigné & Kawahara, 2002), which is the standard choice
 * for musical monophonic pitch detection. Why not a plain FFT peak?  Because a
 * piano note — especially low notes like C3 — often has a WEAKER fundamental
 * than its 2nd or 3rd harmonic. An FFT peak-picker would report C4 or G4 when
 * the child played C3. YIN instead looks for the lag at which the waveform
 * best repeats itself (its period), which survives a weak fundamental.
 */

(function (global) {
  'use strict';

  // ---------------------------------------------------------------------------
  // Core YIN pitch detector.
  //
  // buf        : Float32Array of time-domain audio samples (e.g. 4096 samples)
  // sampleRate : samples per second (48000 on most iPads/iPhones)
  // opts       : { minFreq, maxFreq, threshold }
  //
  // Returns { freq, clarity } or null if no confident pitch was found.
  //   freq    : detected frequency in Hz
  //   clarity : 0..1, how confident the detector is (1 = perfectly periodic)
  // ---------------------------------------------------------------------------
  function detectPitch(buf, sampleRate, opts) {
    opts = opts || {};
    // A2 (110 Hz) to ~C7 gives comfortable margin around the required C3–C6.
    var minFreq = opts.minFreq || 70;
    var maxFreq = opts.maxFreq || 2200;
    // YIN's "absolute threshold": how close to perfect self-similarity a lag
    // must be before we accept it as the period. Lower = stricter.
    var threshold = opts.threshold || 0.15;

    var N = buf.length;
    var W = N >> 1;                                   // integration window = half the buffer
    var maxTau = Math.min(W, Math.floor(sampleRate / minFreq));
    var minTau = Math.max(2, Math.floor(sampleRate / maxFreq));

    // Step 1+2: difference function d(tau) — how much the signal differs from
    // a copy of itself shifted by tau samples.
    var d = new Float32Array(maxTau + 1);
    for (var tau = 1; tau <= maxTau; tau++) {
      var sum = 0;
      for (var i = 0; i < W; i++) {
        var diff = buf[i] - buf[i + tau];
        sum += diff * diff;
      }
      d[tau] = sum;
    }

    // Step 3: cumulative-mean-normalized difference. This is YIN's key trick:
    // it stops the detector from always picking tau=0-ish (trivially similar)
    // and normalizes so a fixed threshold works at any volume.
    var cmnd = new Float32Array(maxTau + 1);
    cmnd[0] = 1;
    var running = 0;
    for (tau = 1; tau <= maxTau; tau++) {
      running += d[tau];
      cmnd[tau] = running > 0 ? (d[tau] * tau) / running : 1;
    }

    // Step 4: find the FIRST lag under the threshold (not the global minimum —
    // the global minimum is often at 2x the true period, i.e. an octave low).
    var tauEstimate = -1;
    for (tau = minTau; tau <= maxTau; tau++) {
      if (cmnd[tau] < threshold) {
        // Walk down to the local minimum of this dip.
        while (tau + 1 <= maxTau && cmnd[tau + 1] < cmnd[tau]) tau++;
        tauEstimate = tau;
        break;
      }
    }

    // Fallback: nothing under the strict threshold. Accept the global minimum
    // only if it is still reasonably periodic; otherwise report "no pitch".
    if (tauEstimate === -1) {
      var best = minTau;
      for (tau = minTau; tau <= maxTau; tau++) {
        if (cmnd[tau] < cmnd[best]) best = tau;
      }
      if (cmnd[best] < 0.35) tauEstimate = best;
      else return null;
    }

    // Step 5: parabolic interpolation around the minimum for sub-sample
    // precision (turns ~±5 cent error into well under ±1 cent).
    var t = tauEstimate;
    var x0 = t > 0 ? cmnd[t - 1] : cmnd[t];
    var x1 = cmnd[t];
    var x2 = t < maxTau ? cmnd[t + 1] : cmnd[t];
    var denom = x0 + x2 - 2 * x1;
    var betterTau = t;
    if (Math.abs(denom) > 1e-12) betterTau = t + (x0 - x2) / (2 * denom);

    return { freq: sampleRate / betterTau, clarity: 1 - x1 };
  }

  // ---------------------------------------------------------------------------
  // RMS (root mean square) level of a buffer — our "is anything actually
  // playing?" signal gate. Background hum has a low RMS; a struck piano note
  // spikes well above it. The page exposes the threshold as a slider so we can
  // tune it in the real living room.
  // ---------------------------------------------------------------------------
  function rms(buf) {
    var sum = 0;
    for (var i = 0; i < buf.length; i++) sum += buf[i] * buf[i];
    return Math.sqrt(sum / buf.length);
  }

  // ---------------------------------------------------------------------------
  // Frequency -> note name helpers. A4 = 440 Hz, 12-tone equal temperament,
  // MIDI numbering (Middle C = C4 = MIDI 60).
  // ---------------------------------------------------------------------------
  var NOTE_NAMES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

  function freqToMidi(freq) {
    return 69 + 12 * Math.log2(freq / 440);
  }

  function midiToFreq(midi) {
    return 440 * Math.pow(2, (midi - 69) / 12);
  }

  // Returns { name: "C4", midi: 60, cents: -12.3 } — cents is how far the
  // detected pitch is from the nearest equal-tempered note. On an out-of-tune
  // home piano expect a consistent offset here; that consistency is exactly
  // what the future calibration step will measure and subtract.
  function freqToNote(freq) {
    var midiFloat = freqToMidi(freq);
    var midi = Math.round(midiFloat);
    var cents = (midiFloat - midi) * 100;
    var name = NOTE_NAMES[((midi % 12) + 12) % 12] + (Math.floor(midi / 12) - 1);
    return { name: name, midi: midi, cents: cents };
  }

  var api = {
    detectPitch: detectPitch,
    rms: rms,
    freqToMidi: freqToMidi,
    midiToFreq: midiToFreq,
    freqToNote: freqToNote,
    NOTE_NAMES: NOTE_NAMES
  };

  // Export for both environments: browser global + Node require().
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  global.HHPitch = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
