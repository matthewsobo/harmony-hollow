/*
 * KeyDetective — the game ENGINE for tap-the-key questions. It renders
 * whatever content/keyDetective.ts generates; it knows nothing about what any
 * stage teaches. Feedback pacing (stars, misses, praise, advance timing)
 * lives in the shared useRound hook so every game mode feels identical.
 */
import { useEffect, useMemo, useState } from 'react';
import { ensureAudio, playNote } from '../audio';
import { narrate, stopNarration } from '../speech';
import { Keyboard } from '../components/Keyboard';
import { TopBar } from '../components/TopBar';
import { Tempo } from '../components/Tempo';
import { KB_HIGH, KB_LOW, makeRound } from '../content/keyDetective';
import { stageName } from '../content/stages';
import { useRound } from '../game/useRound';
import type { Profile } from '../types';

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
  const r = useRound(round.length, (stars) => onFinish(stageId, stars));
  const [hint, setHint] = useState<string | null>(null);

  const q = round[r.qIndex];

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

        {/* Feedback line: praise or hint, never both, never scolding. */}
        <p className={'feedback' + (r.praise ? ' feedback--praise' : '')} aria-live="polite">
          {r.praise ?? hint ?? ' '}
        </p>

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
        <p className="muted">⭐ {r.stars} this round</p>
      </main>
    </>
  );
}
