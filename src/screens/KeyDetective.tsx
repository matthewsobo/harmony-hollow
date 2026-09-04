/*
 * KeyDetective — the game ENGINE for tap-the-key questions. It renders
 * whatever content/keyDetective.ts generates; it knows nothing about what any
 * stage teaches.
 *
 * Feedback rules (ADHD-informed, from the brief):
 *  - Instant response: sound + color the moment a key is tapped.
 *  - Wrong answers cost nothing: a gentle hint appears, try again.
 *  - After 2 misses the right key glows — tapping it still finishes the
 *    question, so nobody ever gets stuck.
 *  - Stars: 2 for first-try, 1 otherwise. Everyone always earns something.
 */
import { useEffect, useMemo, useRef, useState } from 'react';
import { ensureAudio, playCorrectJingle, playFanfare, playNote } from '../audio';
import { narrate, stopNarration } from '../speech';
import { Keyboard, type KeyFlash } from '../components/Keyboard';
import { TopBar } from '../components/TopBar';
import { Tempo } from '../components/Tempo';
import { KB_HIGH, KB_LOW, makeRound } from '../content/keyDetective';
import { stageName } from '../content/stages';
import type { Profile } from '../types';

const ENCOURAGEMENTS = ['Nice!', 'You got it!', 'Yes!', 'Woohoo!', 'Great ears!', 'Found it!'];

export function KeyDetective({
  profile,
  stageId,
  onFinish,
  onExit,
}: {
  profile: Profile;
  stageId: number;
  /** Called once with the stars earned when the round completes. */
  onFinish: (stageId: number, stars: number) => void;
  onExit: () => void;
}) {
  const questionCount = profile.tier === 'junior' ? 6 : 8;
  // useMemo so the round survives re-renders but regenerates per mount.
  const round = useMemo(() => makeRound(stageId, questionCount), [stageId, questionCount]);

  const [qIndex, setQIndex] = useState(0);
  const [misses, setMisses] = useState(0);
  const [flash, setFlash] = useState<KeyFlash | null>(null);
  const [hint, setHint] = useState<string | null>(null);
  const [praise, setPraise] = useState<string | null>(null);
  const [stars, setStars] = useState(0);
  const [done, setDone] = useState(false);
  // Locks the keyboard during the "correct!" moment so double-taps don't
  // answer the next question by accident.
  const lockedRef = useRef(false);

  const q = round[qIndex];

  // Junior tier hears every prompt automatically; everyone else has the 🔊 button.
  useEffect(() => {
    if (!done && profile.tier === 'junior') narrate(q.narration);
    return stopNarration;
  }, [q, done, profile.tier]);

  // Report the finished round exactly once.
  useEffect(() => {
    if (done) {
      playFanfare();
      onFinish(stageId, stars);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  function handleKey(midi: number) {
    if (lockedRef.current || done) return;
    ensureAudio(); // user gesture — the moment iOS lets audio through
    playNote(midi);

    if (q.accept.includes(midi)) {
      lockedRef.current = true;
      setFlash({ midi, kind: 'good' });
      setHint(null);
      setPraise(ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)]);
      const earned = misses === 0 ? 2 : 1;
      setStars((s) => s + earned);
      setTimeout(() => playCorrectJingle(), 150);
      setTimeout(() => {
        lockedRef.current = false;
        setFlash(null);
        setPraise(null);
        setMisses(0);
        if (qIndex + 1 >= round.length) setDone(true);
        else setQIndex(qIndex + 1);
      }, 900);
    } else {
      setFlash({ midi, kind: 'bad' });
      setMisses((m) => m + 1);
      setHint(q.hint);
      if (profile.tier === 'junior') narrate(q.hint);
      setTimeout(() => setFlash(null), 350);
    }
  }

  if (done) {
    return (
      <>
        <TopBar title={stageName(stageId)} />
        <main className="screen">
          <div className="bounce-in" style={{ textAlign: 'center' }}>
            <Tempo size={130} />
            <p className="praise">Round complete!</p>
            <p className="star-count">⭐ ×{stars}</p>
          </div>
          <button className="big-btn" onClick={onExit}>
            Back to town
          </button>
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar title={stageName(stageId)} onBack={onExit} />
      <main className="screen">
        {/* Progress dots: where am I in the round, no numbers to read. */}
        <div className="dots" aria-label={`Question ${qIndex + 1} of ${round.length}`}>
          {round.map((_, i) => (
            <span key={i} className={'dot' + (i < qIndex ? ' dot--done' : i === qIndex ? ' dot--now' : '')} />
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

        {/* Feedback line: praise or hint, never both, never scolding. */}
        <p className={'feedback' + (praise ? ' feedback--praise' : '')} aria-live="polite">
          {praise ?? hint ?? ' '}
        </p>

        <Keyboard
          lowMidi={KB_LOW}
          highMidi={KB_HIGH}
          markedMidi={q.markedMidi}
          glowMidi={misses >= 2 ? q.accept[0] : undefined}
          flash={flash}
          onKey={handleKey}
        />
        <p className="muted">⭐ {stars} this round</p>
      </main>
    </>
  );
}
