/*
 * SoundDetective — the game engine for ear-training questions.
 *
 * Two shapes of question share this screen:
 *  - listening + choice buttons (higher/lower, same/different, direction,
 *    intervals): the question's tones auto-play, the 🔁 button replays them
 *    as many times as the child likes (no penalty — ear training with a
 *    rushed child is misery), and answers are big buttons.
 *  - match-it-on-the-piano (mic): the app plays a note; the child hunts for
 *    it on the real piano by ear; the microphone confirms. Reuses the exact
 *    pipeline Echo Keys runs on. Listening is suppressed while the device
 *    itself is playing so the speaker can't answer its own question.
 *
 * Every question starts from one explicit tap ("Start listening!") — the
 * iOS gesture that unlocks audio (and the mic, when needed).
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { ensureAudio, playNote } from '../audio';
import { narrate, stopNarration } from '../speech';
import { Keyboard } from '../components/Keyboard';
import { TopBar } from '../components/TopBar';
import { Tempo } from '../components/Tempo';
import { makeEarRound, SD_INFO, type SDKind } from '../content/soundDetective';
import { getMicSettings } from '../db';
import type { InputSource, NoteEvent } from '../input/InputSource';
import { createMicSource } from '../mic/MicPitchInputSource';
import { useRound } from '../game/useRound';
import type { Profile } from '../types';

type Phase = 'start' | 'playing' | 'failed';

export function SoundDetective({
  profile,
  kind,
  onFinish,
  onExit,
  onCalibrate,
}: {
  profile: Profile;
  kind: SDKind;
  onFinish: (stageId: number, stars: number) => void;
  onExit: () => void;
  onCalibrate: () => void;
}) {
  const info = SD_INFO[kind];
  const isMic = !!info.mic;
  const count = profile.tier === 'junior' ? 6 : 8;
  const round = useMemo(() => makeEarRound(kind, profile.tier, count), [kind, profile.tier, count]);
  const r = useRound(round.length, (stars) => onFinish(info.stageId, stars));

  const [phase, setPhase] = useState<Phase>('start');
  const [calibrated, setCalibrated] = useState(true);
  const [hint, setHint] = useState<string | null>(null);
  const [flashMidi, setFlashMidi] = useState<{ midi: number; kind: 'good' | 'bad' } | null>(null);
  const sourceRef = useRef<InputSource | null>(null);
  const qIndexRef = useRef(0);
  const listeningRef = useRef(false);

  const q = round[r.qIndex];
  qIndexRef.current = r.qIndex;

  useEffect(() => () => sourceRef.current?.stop(), []);
  useEffect(() => stopNarration, []);

  /** Play this question's tones; mic games hold their ears shut meanwhile. */
  function playTones(index = qIndexRef.current) {
    const question = round[index];
    listeningRef.current = false;
    question.tones.forEach((t) => playNote(t.midi, { when: t.at + 0.15, dur: 0.55 }));
    const lastAt = question.tones[question.tones.length - 1].at;
    setTimeout(() => {
      listeningRef.current = true;
    }, (lastAt + 0.15) * 1000 + 700);
  }

  // Auto-play each new question once the round is running.
  useEffect(() => {
    if (phase !== 'playing' || r.done) return;
    setHint(null);
    if (profile.tier === 'junior') narrate(q.narration);
    // Give the narration a beat before the tones on junior; others hear tones
    // right away.
    const delay = profile.tier === 'junior' ? 1600 : 150;
    const timer = setTimeout(() => playTones(), delay);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, phase, r.done]);

  async function begin() {
    ensureAudio();
    if (!isMic) {
      setPhase('playing');
      return;
    }
    try {
      const settings = await getMicSettings();
      setCalibrated(settings.calibrated);
      const source = createMicSource({
        gateThreshold: settings.gateThreshold,
        tuningOffsetCents: settings.tuningOffsetCents,
      });
      sourceRef.current = source;
      await source.start(handleMicNote);
      setPhase('playing');
    } catch {
      setPhase('failed');
    }
  }

  function handleMicNote(event: NoteEvent) {
    if (!listeningRef.current) return;
    const question = round[qIndexRef.current];
    if (question.answerUI.kind !== 'mic') return;
    const target = question.answerUI.targetMidi;
    const correct = event.midi % 12 === target % 12;
    setFlashMidi({ midi: target, kind: correct ? 'good' : 'bad' });
    setTimeout(() => setFlashMidi(null), 350);
    if (r.answer(correct, target) && !correct) {
      setHint(question.hint);
      if (profile.tier === 'junior') narrate(question.hint);
      // Re-play the target so the child can compare against what they hit.
      setTimeout(() => playTones(), 700);
    }
  }

  function handleChoice(option: string) {
    if (q.answerUI.kind !== 'choice') return;
    ensureAudio();
    const correct = option === q.answerUI.correct;
    if (r.answer(correct, option) && !correct) {
      setHint(q.hint);
      if (profile.tier === 'junior') narrate(q.hint);
    }
  }

  if (r.done) {
    return (
      <>
        <TopBar title={`${info.emoji} ${info.title}`} />
        <main className="screen">
          <div className="bounce-in" style={{ textAlign: 'center' }}>
            <Tempo size={130} />
            <p className="praise">Round complete!</p>
            <p className="star-count">⭐ ×{r.stars}</p>
          </div>
          <button className="big-btn" onClick={onExit}>
            Back to the hall
          </button>
        </main>
      </>
    );
  }

  if (phase !== 'playing') {
    return (
      <>
        <TopBar title={`${info.emoji} ${info.title}`} onBack={onExit} />
        <main className="screen">
          <Tempo size={110} />
          {phase === 'failed' ? (
            <>
              <p className="prompt-text">The microphone didn't start 😕</p>
              <p className="muted">The other listening games in the hall work without it!</p>
              <button className="big-btn" onClick={() => void begin()}>
                Try the mic again
              </button>
              <button className="big-btn big-btn--quiet" onClick={onExit}>
                Back to the hall
              </button>
            </>
          ) : (
            <>
              <p className="muted">
                {isMic
                  ? 'Tempo plays a note — you hunt it down on the REAL piano!'
                  : 'Put on your listening ears — Tempo will play some notes!'}
              </p>
              <button className="big-btn" onClick={() => void begin()}>
                {isMic ? '🎤 Turn on the mic' : '👂 Start listening!'}
              </button>
            </>
          )}
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar title={`${info.emoji} ${info.title}`} onBack={onExit} />
      <main className="screen">
        <div className="dots" aria-label={`Question ${r.qIndex + 1} of ${round.length}`}>
          {round.map((_, i) => (
            <span key={i} className={'dot' + (i < r.qIndex ? ' dot--done' : i === r.qIndex ? ' dot--now' : '')} />
          ))}
        </div>

        {isMic && !calibrated && (
          <button className="big-btn big-btn--quiet" onClick={onCalibrate}>
            🎹 Tune up first (recommended)
          </button>
        )}

        <div className="prompt-card card">
          <span className="prompt-text">{q.prompt}</span>
          <button
            className="topbar__btn"
            aria-label="Hear it again"
            onClick={() => {
              ensureAudio();
              playTones();
            }}
          >
            🔁
          </button>
        </div>

        <p className={'feedback' + (r.praise ? ' feedback--praise' : '')} aria-live="polite">
          {r.praise ?? hint ?? 'Replay as many times as you like — no rush!'}
        </p>

        {q.answerUI.kind === 'choice' ? (
          <div className="choice-row">
            {q.answerUI.options.map((opt) => {
              const isAnswer = q.answerUI.kind === 'choice' && q.answerUI.correct === opt;
              return (
                <button
                  key={opt}
                  className={
                    'choice-btn' +
                    (r.flash?.id === opt ? ` choice-btn--${r.flash.kind}` : '') +
                    (r.misses >= 2 && isAnswer ? ' choice-btn--glow' : '')
                  }
                  onPointerDown={() => handleChoice(opt)}
                >
                  {opt}
                </button>
              );
            })}
          </div>
        ) : (
          // Match-on-piano: a read-only keyboard as the map of where to hunt.
          // After two misses the target key glows — the "answer reveal".
          <div style={{ pointerEvents: 'none', width: '100%' }}>
            <Keyboard
              lowMidi={60}
              highMidi={67}
              labels={{ 60: 'C' }}
              glowMidi={r.misses >= 2 ? q.answerUI.targetMidi : undefined}
              flash={flashMidi}
              onKey={() => {}}
            />
          </div>
        )}
        <p className="muted">
          ⭐ {r.stars} this round{isMic ? ' · 🎤 listening for the real piano' : ''}
        </p>
      </main>
    </>
  );
}
