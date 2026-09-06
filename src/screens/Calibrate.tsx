/*
 * Calibrate — the "tune up" flow that makes the mic reliable on THIS device
 * at THIS piano. Two measurements, both learned from real-device testing:
 *
 *  1. Room noise → gate threshold. The right gate differs per device (the
 *     family iPad needed 0.002 at music-stand distance; the iPhone was fine
 *     at 0.01), so we sample 2 seconds of ambient sound and sit just above
 *     its 95th percentile.
 *  2. Middle C → tuning offset. Home acoustic pianos drift (this one runs up
 *     to ~25 cents sharp on some notes). Averaging three Middle C strikes
 *     gives a global offset the detector subtracts before naming notes.
 *
 * Written to be run by a parent+child together; every step is one action.
 */
import { useEffect, useRef, useState } from 'react';
import { getMicSettings, saveMicSettings, type MicSettings } from '../db';
import { createMicSource } from '../mic/MicPitchInputSource';
import type { InputSource } from '../input/InputSource';
import { TopBar } from '../components/TopBar';
import { Tempo } from '../components/Tempo';

type Step = 'intro' | 'quiet' | 'playC' | 'done' | 'failed';

export function Calibrate({ onBack }: { onBack: () => void }) {
  const [step, setStepState] = useState<Step>('intro');
  // The mic callback is registered once, so it must read the CURRENT step —
  // a ref avoids stale closures (and keeps side effects out of setState
  // updaters, which React is allowed to invoke twice).
  const stepRef = useRef<Step>('intro');
  function setStep(s: Step) {
    stepRef.current = s;
    setStepState(s);
  }
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<MicSettings | null>(null);
  const sourceRef = useRef<InputSource | null>(null);
  const gateRef = useRef(0.01);
  const centsSamples = useRef<number[]>([]);

  // Whatever happens, release the mic when this screen goes away.
  useEffect(() => () => sourceRef.current?.stop(), []);

  async function begin() {
    try {
      // Offset 0 and a floor-level gate during calibration — we're measuring.
      const source = createMicSource({ gateThreshold: 0.0015, tuningOffsetCents: 0 });
      sourceRef.current = source;
      await source.start(handleNote);
      setStep('quiet');
      setMessage('Listening to the room… stay quiet for a moment!');
      // Sample ambient level for 2 seconds, then set the gate above its p95.
      const levels: number[] = [];
      const interval = setInterval(() => levels.push(source.level), 50);
      setTimeout(() => {
        clearInterval(interval);
        levels.sort((a, b) => a - b);
        const p95 = levels[Math.floor(levels.length * 0.95)] ?? 0;
        gateRef.current = Math.min(0.1, Math.max(0.0015, p95 * 2.5));
        centsSamples.current = [];
        setStep('playC');
        setMessage('');
      }, 2000);
    } catch {
      setStep('failed');
    }
  }

  function handleNote(event: { midi: number; cents: number }) {
    // Only the play-C step consumes notes.
    if (stepRef.current !== 'playC') return;
    if (event.midi % 12 !== 0) {
      setMessage("Hmm, that didn't sound like C — it lives just left of the 2 black keys. Try again!");
      return;
    }
    centsSamples.current.push(event.cents);
    const n = centsSamples.current.length;
    if (n < 3) {
      setMessage(`Got it! Play Middle C again… (${n}/3)`);
      return;
    }
    // Average of three strikes = the piano's global drift.
    const offset = centsSamples.current.reduce((a, b) => a + b, 0) / n;
    const settings: MicSettings = {
      gateThreshold: gateRef.current,
      tuningOffsetCents: Math.round(offset * 10) / 10,
      calibrated: true,
    };
    void saveMicSettings(settings);
    setResult(settings);
    sourceRef.current?.stop();
    setStep('done');
  }

  return (
    <>
      <TopBar title="🎹 Tune Up" onBack={onBack} />
      <main className="screen">
        <Tempo size={100} />
        {step === 'intro' && (
          <>
            <p className="muted">
              Put this device where it lives during practice, near the piano.
              Tempo will listen to the room, then ask for Middle C.
            </p>
            <button className="big-btn" onClick={() => void begin()}>
              Start tuning up
            </button>
          </>
        )}
        {step === 'quiet' && <p className="prompt-text">🤫 {message}</p>}
        {step === 'playC' && (
          <>
            <p className="prompt-text">🎹 Play Middle C on the piano!</p>
            <p className="muted">{message || 'Middle C is just left of the 2 black keys, in the middle of the piano.'}</p>
          </>
        )}
        {step === 'done' && result && (
          <>
            <p className="praise bounce-in">All tuned up! 🎉</p>
            <div className="card">
              <div className="settings-row">
                <span>Piano tuning</span>
                <span>
                  {Math.abs(result.tuningOffsetCents) < 5
                    ? 'right on pitch ✔'
                    : `${Math.abs(result.tuningOffsetCents).toFixed(0)} cents ${result.tuningOffsetCents > 0 ? 'sharp' : 'flat'} — I'll adjust!`}
                </span>
              </div>
              <div className="settings-row">
                <span>Quiet-room gate</span>
                <span>{result.gateThreshold.toFixed(4)}</span>
              </div>
            </div>
            <button className="big-btn" onClick={onBack}>
              Done
            </button>
          </>
        )}
        {step === 'failed' && (
          <>
            <p className="prompt-text">The microphone didn't start 😕</p>
            <p className="muted">
              Check that microphone access is allowed for this app, then try
              again — or just keep playing the tap games, they work great too!
            </p>
            <button className="big-btn" onClick={() => void begin()}>
              Try again
            </button>
            <button className="big-btn big-btn--quiet" onClick={onBack}>
              Back
            </button>
          </>
        )}
      </main>
    </>
  );
}

// Re-exported so games can prompt "tune up first?" without importing db.ts everywhere.
export { getMicSettings };
