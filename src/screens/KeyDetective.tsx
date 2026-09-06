/*
 * KeyDetective — the game ENGINE for tap-the-key questions. It renders
 * whatever content/keyDetective.ts generates; it knows nothing about what any
 * stage teaches. Feedback pacing (stars, misses, praise, advance timing)
 * lives in the shared useRound hook so every game mode feels identical.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { ensureAudio, playNote } from '../audio';
import { narrate, stopNarration } from '../speech';
import { Keyboard } from '../components/Keyboard';
import { TopBar } from '../components/TopBar';
import { Tempo } from '../components/Tempo';
import { KB_HIGH, KB_LOW, makeRound } from '../content/keyDetective';
import { stageName } from '../content/stages';
import { getMicSettings } from '../db';
import type { InputSource, NoteEvent } from '../input/InputSource';
import { createMicSource } from '../mic/MicPitchInputSource';
import { useRound } from '../game/useRound';
import type { Profile } from '../types';

type MicState = 'off' | 'starting' | 'on' | 'failed';

export function KeyDetective({
  profile,
  stageId,
  mic = false,
  onFinish,
  onExit,
  onCalibrate,
}: {
  profile: Profile;
  stageId: number;
  /** "Find it for real": answers come from the real piano via the mic. */
  mic?: boolean;
  /** Called once with the stars earned when the round completes. */
  onFinish: (stageId: number, stars: number) => void;
  onExit: () => void;
  onCalibrate?: () => void;
}) {
  // The graceful fallback: if the mic won't start, the child can flip this
  // same round to tap mode without leaving the screen.
  const [tapOverride, setTapOverride] = useState(false);
  const micMode = mic && !tapOverride;

  const questionCount = profile.tier === 'junior' ? 6 : 8;
  // useMemo so the round survives re-renders but regenerates per mount.
  const round = useMemo(
    () => makeRound(stageId, questionCount, micMode),
    [stageId, questionCount, micMode]
  );
  const r = useRound(round.length, (stars) => onFinish(stageId, stars));
  const [hint, setHint] = useState<string | null>(null);
  const [micState, setMicState] = useState<MicState>('off');
  const [calibrated, setCalibrated] = useState(true);
  const sourceRef = useRef<InputSource | null>(null);
  const qRef = useRef(0);

  const q = round[r.qIndex];
  qRef.current = r.qIndex;

  // Release the microphone whenever this screen goes away.
  useEffect(() => () => sourceRef.current?.stop(), []);

  async function startMic() {
    setMicState('starting');
    try {
      const settings = await getMicSettings();
      setCalibrated(settings.calibrated);
      const source = createMicSource({
        gateThreshold: settings.gateThreshold,
        tuningOffsetCents: settings.tuningOffsetCents,
      });
      sourceRef.current = source;
      await source.start(handleMicNote);
      ensureAudio();
      setMicState('on');
    } catch {
      setMicState('failed');
    }
  }

  function handleMicNote(event: NoteEvent) {
    const question = round[qRef.current];
    if (!question) return;
    const correct = question.matchPitchClass
      ? question.accept.some((a) => a % 12 === event.midi % 12)
      : question.accept.includes(event.midi);
    // Flash a key the child can see: the accepted key when right, or the
    // displayed octave's version of what they played when wrong.
    const displayMidi = correct
      ? question.accept.find((a) => a % 12 === event.midi % 12) ?? question.accept[0]
      : KB_LOW + ((event.midi - KB_LOW) % 12 + 12) % 12;
    if (r.answer(correct, displayMidi) && !correct) {
      setHint(question.hint);
      if (profile.tier === 'junior') narrate(question.hint);
    }
  }

  // Junior tier hears every prompt automatically; everyone else has the 🔊 button.
  useEffect(() => {
    setHint(null);
    if (!r.done && profile.tier === 'junior') narrate(q.narration);
    return stopNarration;
  }, [q, r.done, profile.tier]);

  function handleKey(midi: number) {
    ensureAudio(); // user gesture — the moment iOS lets audio through
    playNote(midi);
    const correct = q.accept.includes(midi);
    if (r.answer(correct, midi) && !correct) {
      setHint(q.hint);
      if (profile.tier === 'junior') narrate(q.hint);
    }
  }

  if (r.done) {
    return (
      <>
        <TopBar title={stageName(stageId)} />
        <main className="screen">
          <div className="bounce-in" style={{ textAlign: 'center' }}>
            <Tempo size={130} />
            <p className="praise">Round complete!</p>
            <p className="star-count">⭐ ×{r.stars}</p>
          </div>
          <button className="big-btn" onClick={onExit}>
            Back to town
          </button>
        </main>
      </>
    );
  }

  // Mic mode needs its explicit start tap (permission + audio unlock in one
  // gesture) — and a friendly exit ramp to tap mode if the mic won't start.
  if (micMode && micState !== 'on') {
    return (
      <>
        <TopBar title={stageName(stageId)} onBack={onExit} />
        <main className="screen">
          <Tempo size={110} />
          {micState === 'failed' ? (
            <>
              <p className="prompt-text">The microphone didn't start 😕</p>
              <button className="big-btn" onClick={() => void startMic()}>
                Try the mic again
              </button>
              <button className="big-btn big-btn--quiet" onClick={() => setTapOverride(true)}>
                Play the tap version instead
              </button>
            </>
          ) : (
            <>
              <p className="muted">Find the keys on the REAL piano — Tempo is listening!</p>
              <button className="big-btn" disabled={micState === 'starting'} onClick={() => void startMic()}>
                {micState === 'starting' ? 'Turning on the mic…' : '🎤 Turn on the mic'}
              </button>
            </>
          )}
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar title={stageName(stageId)} onBack={onExit} />
      <main className="screen">
        {/* Progress dots: where am I in the round, no numbers to read. */}
        <div className="dots" aria-label={`Question ${r.qIndex + 1} of ${round.length}`}>
          {round.map((_, i) => (
            <span key={i} className={'dot' + (i < r.qIndex ? ' dot--done' : i === r.qIndex ? ' dot--now' : '')} />
          ))}
        </div>

        <div className="prompt-card card">
          <span className="prompt-text">{q.prompt}</span>
          <button
            className="topbar__btn"
            aria-label="Read the question aloud"
            onClick={() => narrate(q.narration)}
          >
            🔊
          </button>
        </div>

        {micMode && !calibrated && onCalibrate && (
          <button className="big-btn big-btn--quiet" onClick={onCalibrate}>
            🎹 Tune up first (recommended)
          </button>
        )}

        {/* Feedback line: praise or hint, never both, never scolding. */}
        <p className={'feedback' + (r.praise ? ' feedback--praise' : '')} aria-live="polite">
          {r.praise ?? hint ?? ' '}
        </p>

        {/* In mic mode the keyboard is a read-only reference — answers come
            from the real piano, so taps are disabled. */}
        <div style={micMode ? { pointerEvents: 'none', width: '100%' } : { width: '100%' }}>
          <Keyboard
            lowMidi={KB_LOW}
            highMidi={KB_HIGH}
            markedMidi={q.markedMidi}
            glowMidi={r.misses >= 2 ? q.accept[0] : undefined}
            flash={
              r.flash && typeof r.flash.id === 'number'
                ? { midi: r.flash.id, kind: r.flash.kind }
                : null
            }
            onKey={handleKey}
          />
        </div>
        <p className="muted">
          ⭐ {r.stars} this round{micMode ? ' · 🎤 listening for the real piano' : ''}
        </p>
      </main>
    </>
  );
}
