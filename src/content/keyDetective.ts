/*
 * keyDetective.ts — question CONTENT for the Key Detective game (tap variant).
 *
 * Pure data + generator functions, zero UI: the engine screen renders whatever
 * this file produces, so adding new question flavors never touches components.
 *
 * The on-screen keyboard shows one octave, C4..B4 (MIDI 60..71) — one group of
 * 2 black keys and one group of 3, which is exactly the vocabulary Stages 1
 * and 3 teach.
 */

export const KB_LOW = 60; // C4
export const KB_HIGH = 71; // B4

/** One tap-the-key question, ready for the engine to present. */
export interface KDQuestion {
  /**
   * Mic rounds set this: any octave of the right letter counts. On a real
   * piano the child roams the whole keyboard, and finding "a C" in any octave
   * is the actual skill being taught.
   */
  matchPitchClass?: boolean;
  stageId: number;
  /** Short prompt line (icons + few words — minimal reading load). */
  prompt: string;
  /** Fuller sentence for narration (Junior hears this automatically). */
  narration: string;
  /** Tapping any of these MIDI notes counts as correct. */
  accept: number[];
  /** Spoken/shown after a wrong answer — always a nudge, never a scold. */
  hint: string;
  /** Key to decorate with a star marker (for higher/lower questions). */
  markedMidi?: number;
}

const BLACK_PAIR = [61, 63]; // C#4 D#4
const BLACK_TRIO = [66, 68, 70]; // F#4 G#4 A#4
const WHITE = [60, 62, 64, 65, 67, 69, 71];

// Where each white-key letter lives in our octave, plus its landmark story.
const WHITE_INFO: Record<string, { midi: number; hint: string }> = {
  C: { midi: 60, hint: 'C hides just LEFT of the 2 black keys.' },
  D: { midi: 62, hint: 'D sits right in the MIDDLE of the 2 black keys.' },
  E: { midi: 64, hint: 'E is just RIGHT of the 2 black keys.' },
  F: { midi: 65, hint: 'F hides just LEFT of the 3 black keys.' },
  G: { midi: 67, hint: 'G is inside the 3 black keys, on the left side.' },
  A: { midi: 69, hint: 'A is inside the 3 black keys, on the right side.' },
  B: { midi: 71, hint: 'B is just RIGHT of the 3 black keys.' },
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ---- Stage 1: Black Key Neighborhoods ---------------------------------------

function stage1Question(): KDQuestion {
  const flavor = pick(['pair', 'trio', 'higher', 'lower'] as const);
  switch (flavor) {
    case 'pair':
      return {
        stageId: 1,
        prompt: 'Tap the group of 2 black keys',
        narration: 'Can you tap the group of TWO black keys? They live side by side.',
        accept: BLACK_PAIR,
        hint: 'Look for just two black friends together, near the left.',
      };
    case 'trio':
      return {
        stageId: 1,
        prompt: 'Tap the group of 3 black keys',
        narration: 'Can you tap the group of THREE black keys?',
        accept: BLACK_TRIO,
        hint: 'Look for three black keys together, near the right.',
      };
    case 'higher': {
      // Mark a key in the lower half so higher answers always exist.
      const marked = pick(WHITE.filter((m) => m <= 65));
      return {
        stageId: 1,
        prompt: 'Tap a key HIGHER than the ⭐ key',
        narration: 'Tap any key that sounds HIGHER than the star key. Higher means to the right!',
        accept: WHITE.concat(BLACK_PAIR, BLACK_TRIO).filter((m) => m > marked),
        hint: 'Higher notes live to the RIGHT of the star.',
        markedMidi: marked,
      };
    }
    case 'lower': {
      const marked = pick(WHITE.filter((m) => m >= 65));
      return {
        stageId: 1,
        prompt: 'Tap a key LOWER than the ⭐ key',
        narration: 'Tap any key that sounds LOWER than the star key. Lower means to the left!',
        accept: WHITE.concat(BLACK_PAIR, BLACK_TRIO).filter((m) => m < marked),
        hint: 'Lower notes live to the LEFT of the star.',
        markedMidi: marked,
      };
    }
  }
}

// ---- Stage 3: White Key Names -----------------------------------------------

function stage3Question(letter: string): KDQuestion {
  const info = WHITE_INFO[letter];
  return {
    stageId: 3,
    prompt: `Find ${letter}`,
    narration: `Can you find ${letter}? ${info.hint}`,
    accept: [info.midi],
    hint: info.hint,
  };
}

// ---- Session builder --------------------------------------------------------

/**
 * Builds a round of questions for one stage. Stage 3 guarantees each letter
 * appears before any repeats (so a round actually covers the alphabet instead
 * of asking for G five times by luck).
 */
export function makeRound(stageId: number, count: number, micMode = false): KDQuestion[] {
  if (stageId === 3) {
    const letters = shuffle(Object.keys(WHITE_INFO));
    return Array.from({ length: count }, (_, i) => ({
      ...stage3Question(letters[i % letters.length]),
      matchPitchClass: micMode,
    }));
  }
  // Stage 1: random flavors, but never the same flavor 3x in a row by
  // regenerating on immediate repeats (cheap variety guard). Mic rounds skip
  // the higher/lower questions — the ⭐ reference key is on screen, not on
  // the real piano, so the comparison doesn't translate.
  const round: KDQuestion[] = [];
  while (round.length < count) {
    const q = stage1Question();
    if (micMode && q.markedMidi !== undefined) continue;
    const prev = round[round.length - 1];
    if (prev && prev.prompt === q.prompt && Math.random() < 0.7) continue;
    round.push({ ...q, matchPitchClass: micMode });
  }
  return round;
}
