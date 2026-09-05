/*
 * StaffReader — the game engine for staff-reading questions. Presents
 * whatever content/staffReader.ts generates: a display (pre-staff, staff,
 * grand staff, or lone note) plus one of two answer UIs (keyboard or
 * multiple-choice buttons). All feedback pacing comes from useRound, so it
 * feels identical to Key Detective.
 */
import { useEffect, useMemo, useState } from 'react';
import { ensureAudio, playNote } from '../audio';
import { narrate, stopNarration } from '../speech';
import { Keyboard } from '../components/Keyboard';
import { GrandStaff, LoneNote, PreStaff, SingleStaff } from '../components/Staff';
import { TopBar } from '../components/TopBar';
import { Tempo } from '../components/Tempo';
import { makeStaffRound, type SRQuestion } from '../content/staffReader';
import { stageName } from '../content/stages';
import { useRound } from '../game/useRound';
import type { Profile } from '../types';

function Display({ q }: { q: SRQuestion }) {
  const d = q.display;
  switch (d.kind) {
    case 'prestaff':
      return <PreStaff steps={d.steps} guideLabel={d.guideLabel} />;
    case 'staff':
      return <SingleStaff clef={d.clef} midis={d.midis} duration={d.duration} />;
    case 'grand':
      return <GrandStaff midis={d.midis} />;
    case 'duration':
      return <LoneNote duration={d.duration} />;
  }
}

export function StaffReader({
  profile,
  stageId,
  onFinish,
  onExit,
}: {
  profile: Profile;
  stageId: number;
  onFinish: (stageId: number, stars: number) => void;
  onExit: () => void;
}) {
  const questionCount = profile.tier === 'junior' ? 6 : 8;
  const round = useMemo(() => makeStaffRound(stageId, questionCount), [stageId, questionCount]);
  const r = useRound(round.length, (stars) => onFinish(stageId, stars));
  const [hint, setHint] = useState<string | null>(null);

  const q = round[r.qIndex];

  useEffect(() => {
    setHint(null);
    if (!r.done && profile.tier === 'junior') narrate(q.narration);
    return stopNarration;
  }, [q, r.done, profile.tier]);

  function miss() {
    setHint(q.hint);
    if (profile.tier === 'junior') narrate(q.hint);
  }

  function handleKey(midi: number) {
    if (q.answerUI.kind !== 'key') return;
    ensureAudio();
    playNote(midi);
    const correct = q.answerUI.accept.includes(midi);
    if (r.answer(correct, midi) && !correct) miss();
  }

  function handleChoice(option: string) {
    if (q.answerUI.kind !== 'choice') return;
    ensureAudio();
    const correct = option === q.answerUI.correct;
    if (r.answer(correct, option) && !correct) miss();
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
            Back to the shop
          </button>
        </main>
      </>
    );
  }

  return (
    <>
      <TopBar title={stageName(stageId)} onBack={onExit} />
      <main className="screen">
        <div className="dots" aria-label={`Question ${r.qIndex + 1} of ${round.length}`}>
          {round.map((_, i) => (
            <span key={i} className={'dot' + (i < r.qIndex ? ' dot--done' : i === r.qIndex ? ' dot--now' : '')} />
          ))}
        </div>

        <div className="prompt-card card">
          <span className="prompt-text">{q.prompt}</span>
          <button className="topbar__btn" aria-label="Read the question aloud" onClick={() => narrate(q.narration)}>
            🔊
          </button>
        </div>

        <div className="card staff-card">
          <Display q={q} />
        </div>

        <p className={'feedback' + (r.praise ? ' feedback--praise' : '')} aria-live="polite">
          {r.praise ?? hint ?? ' '}
        </p>

        {q.answerUI.kind === 'key' ? (
          <Keyboard
            lowMidi={q.answerUI.low}
            highMidi={q.answerUI.high}
            labels={q.answerUI.middleCLabel ? { 60: 'C' } : undefined}
            glowMidi={r.misses >= 2 ? q.answerUI.accept[0] : undefined}
            flash={
              r.flash && typeof r.flash.id === 'number'
                ? { midi: r.flash.id, kind: r.flash.kind }
                : null
            }
            onKey={handleKey}
          />
        ) : (
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
        )}
        <p className="muted">⭐ {r.stars} this round</p>
      </main>
    </>
  );
}
