/*
 * echoKeys.ts — pattern CONTENT for Echo Keys (listen, then play it back on
 * the real piano). Patterns draw from the Middle C five-finger position
 * (C4–G4), the notes the curriculum has taught by the time mic play unlocks.
 *
 * Matching note: the game compares PITCH CLASS (letter), not octave — a child
 * who plays the right note an octave off has understood the exercise, and
 * home pianos plus small hands make octave-exactness a frustration machine.
 */
import type { Tier } from '../types';

export interface EchoChallenge {
  /** The pattern to play back, in order. Shown+sounded on the on-screen keys. */
  midis: number[];
}

const POOL = [60, 62, 64, 65, 67]; // C D E F G around Middle C

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function makeEchoRound(tier: Tier, count: number): EchoChallenge[] {
  const round: EchoChallenge[] = [];
  for (let i = 0; i < count; i++) {
    // Junior: always a single note. Others: singles first, then pairs — the
    // round ramps up instead of front-loading the hard ones.
    const len = tier === 'junior' ? 1 : i < count / 2 ? 1 : 2;
    const midis: number[] = [pick(POOL)];
    while (midis.length < len) {
      const next = pick(POOL);
      if (next !== midis[midis.length - 1]) midis.push(next); // no repeats back-to-back
    }
    round.push({ midis });
  }
  return round;
}
