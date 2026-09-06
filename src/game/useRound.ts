/*
 * useRound — the shared heartbeat of every quiz-style game mode.
 *
 * One place owns the feedback rules from the brief so every mode feels
 * identical:
 *  - correct: flash + praise, 2⭐ first-try / 1⭐ after retries, auto-advance
 *    after 900ms (long enough to enjoy, short enough to keep momentum)
 *  - wrong: brief flash, misses counted (screens reveal the answer at 2),
 *    nothing lost, try again immediately
 *
 * The hook is agnostic about WHAT was tapped: `id` is a MIDI number for
 * keyboard answers or an option string for multiple choice — it only exists
 * so the screen can flash the right thing.
 */
import { useEffect, useRef, useState } from 'react';
import { playCorrectJingle, playFanfare } from '../audio';

const ENCOURAGEMENTS = ['Nice!', 'You got it!', 'Yes!', 'Woohoo!', 'Great job!', 'Found it!'];

export interface RoundFlash {
  id: string | number;
  kind: 'good' | 'bad';
}

export function useRound(total: number, onFinish: (stars: number) => void) {
  const [qIndex, setQIndex] = useState(0);
  const [misses, setMisses] = useState(0);
  const [stars, setStars] = useState(0);
  const [flash, setFlash] = useState<RoundFlash | null>(null);
  const [praise, setPraise] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  // The decision state lives in REFS, mirrored to state for rendering. This
  // matters because mic-based modes register their note callback ONCE — it
  // captures the first render's `answer` forever, so reading `misses` or
  // `done` from state closures would always see stale values (a real bug we
  // hit: mic rounds scored every answer as first-try).
  const lockedRef = useRef(false);
  const missesRef = useRef(0);
  const doneRef = useRef(false);
  const qIndexRef = useRef(0);

  // Fire the finish callback exactly once, with the fanfare.
  useEffect(() => {
    if (done) {
      playFanfare();
      onFinish(stars);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  /** Report an answer. Returns true if it was accepted (not locked). */
  function answer(correct: boolean, id: string | number): boolean {
    if (lockedRef.current || doneRef.current) return false;
    if (correct) {
      lockedRef.current = true;
      setFlash({ id, kind: 'good' });
      setPraise(ENCOURAGEMENTS[Math.floor(Math.random() * ENCOURAGEMENTS.length)]);
      setStars((s) => s + (missesRef.current === 0 ? 2 : 1));
      setTimeout(() => playCorrectJingle(), 150);
      setTimeout(() => {
        lockedRef.current = false;
        setFlash(null);
        setPraise(null);
        missesRef.current = 0;
        setMisses(0);
        if (qIndexRef.current + 1 >= total) {
          doneRef.current = true;
          setDone(true);
        } else {
          qIndexRef.current++;
          setQIndex(qIndexRef.current);
        }
      }, 900);
    } else {
      setFlash({ id, kind: 'bad' });
      missesRef.current++;
      setMisses(missesRef.current);
      setTimeout(() => setFlash(null), 350);
    }
    return true;
  }

  return { qIndex, misses, stars, flash, praise, done, answer };
}
