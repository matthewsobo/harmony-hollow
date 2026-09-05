/*
 * staffReader.ts — question CONTENT for the Staff Reader game.
 *
 * Same contract as keyDetective.ts: pure data + generators, zero UI. The
 * engine renders whatever this produces. Two answer styles exist:
 *  - 'choice': big multiple-choice buttons (up/down/same, step/skip, beats …)
 *  - 'key':    tap the matching key on an on-screen keyboard whose range is
 *              chosen per stage so keys stay big (5 white keys where we can)
 *
 * Stage design notes:
 *  - Stages 2/5 are pre-staff (floating note heads) — direction and distance
 *    before lines, the order beginner methods use.
 *  - Stages 6/7 hang everything off the landmark lines (bass F line, treble
 *    G line) plus Middle C, mirroring how the staves are introduced.
 *  - Duration ("how many beats?") questions are sprinkled into stages 4+ at
 *    ~1 in 4, matching the rhythm-curriculum alignment in the brief.
 */
import type { Clef, Duration } from '../components/Staff';

export interface SRQuestion {
  stageId: number;
  prompt: string;
  narration: string;
  hint: string;
  display:
    | { kind: 'prestaff'; steps: number[]; guideLabel?: string }
    | { kind: 'staff'; clef: Clef; midis: number[]; duration?: Duration }
    | { kind: 'grand'; midis: number[] }
    | { kind: 'duration'; duration: Duration };
  answerUI:
    | { kind: 'choice'; options: string[]; correct: string }
    | { kind: 'key'; accept: number[]; low: number; high: number; middleCLabel?: boolean };
}

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

const LETTER: Record<number, string> = {
  53: 'F', 55: 'G', 57: 'A', 59: 'B', 60: 'C', 62: 'D', 64: 'E', 65: 'F', 67: 'G',
};

// ---- Stage 2: Reading Up, Down & Same (pre-staff) ---------------------------

function stage2(): SRQuestion {
  const dir = pick(['up', 'down', 'same'] as const);
  const first = pick([-1, 0, 1]);
  const dist = pick([1, 2]);
  const second = dir === 'up' ? first + dist : dir === 'down' ? first - dist : first;
  const correct = dir === 'up' ? '⬆️ Up' : dir === 'down' ? '⬇️ Down' : '🟰 Same';
  return {
    stageId: 2,
    prompt: 'Which way did it go?',
    narration: 'Look at the two notes. Did the second one go up, down, or stay the same?',
    hint: 'Follow the note heads: climbing means up, falling means down.',
    display: { kind: 'prestaff', steps: [first, second] },
    answerUI: { kind: 'choice', options: ['⬆️ Up', '⬇️ Down', '🟰 Same'], correct },
  };
}

// ---- Stage 4: Middle C Position (pre-staff → keyboard) ----------------------

function stage4(): SRQuestion {
  const midi = pick([60, 62, 64, 65, 67]); // C D E F G
  const stepsAbove = { 60: 0, 62: 1, 64: 2, 65: 3, 67: 4 }[midi]!;
  return {
    stageId: 4,
    prompt: 'Tap this note on the keyboard',
    narration:
      stepsAbove === 0
        ? 'This note sits right on the Middle C line. Tap it!'
        : `This note is ${stepsAbove} step${stepsAbove > 1 ? 's' : ''} above Middle C. Tap it!`,
    hint:
      stepsAbove === 0
        ? 'On the line means Middle C itself.'
        : `Count up from Middle C: ${stepsAbove} step${stepsAbove > 1 ? 's' : ''}.`,
    display: { kind: 'prestaff', steps: [stepsAbove], guideLabel: 'Middle C' },
    answerUI: { kind: 'key', accept: [midi], low: 60, high: 67, middleCLabel: true },
  };
}

// ---- Stage 5: Steps & Skips (pre-staff) -------------------------------------

function stage5(): SRQuestion {
  const isSkip = Math.random() < 0.5;
  const first = pick([-2, -1, 0, 1]);
  const gap = isSkip ? 2 : 1;
  const second = first + (Math.random() < 0.5 ? gap : -gap);
  return {
    stageId: 5,
    prompt: 'Step or skip?',
    narration: 'Is that a step to the very next note, or a skip over one?',
    hint: 'A step touches the next-door note. A skip jumps over one.',
    display: { kind: 'prestaff', steps: [first, second] },
    answerUI: {
      kind: 'choice',
      options: ['🚶 Step', '🐰 Skip'],
      correct: isSkip ? '🐰 Skip' : '🚶 Step',
    },
  };
}

// ---- Stages 6/7: single staves via landmarks (keyboard answer) --------------

function stage6(): SRQuestion {
  const midi = pick([53, 55, 57, 59, 60]); // F3..C4 on the bass staff
  return {
    stageId: 6,
    prompt: 'Tap this bass note',
    narration: 'A note on the bass staff! Find it on the keyboard.',
    hint:
      midi === 53
        ? 'That note sits on the orange F line — the line the bass clef points at.'
        : midi === 60
          ? 'One little line above the bass staff is Middle C.'
          : `Count steps up from the orange F line: F, G, A, B… this one is ${LETTER[midi]}.`,
    display: { kind: 'staff', clef: 'bass', midis: [midi] },
    answerUI: { kind: 'key', accept: [midi], low: 53, high: 60, middleCLabel: true },
  };
}

function stage7(): SRQuestion {
  const midi = pick([60, 62, 64, 65, 67]); // C4..G4 on the treble staff
  return {
    stageId: 7,
    prompt: 'Tap this treble note',
    narration: 'A note on the treble staff! Find it on the keyboard.',
    hint:
      midi === 67
        ? 'That note sits on the orange G line — the line the treble clef curls around.'
        : midi === 60
          ? 'One little line below the treble staff is Middle C.'
          : `Count steps up from Middle C: C, D, E… this one is ${LETTER[midi]}.`,
    display: { kind: 'staff', clef: 'treble', midis: [midi] },
    answerUI: { kind: 'key', accept: [midi], low: 60, high: 67, middleCLabel: true },
  };
}

// ---- Stage 8: The Grand Staff (higher/lower across staves) ------------------

function stage8(): SRQuestion {
  const treble = pick([62, 64, 65, 67]);
  const bass = pick([53, 55, 57, 59]);
  const trebleFirst = Math.random() < 0.5;
  const midis = trebleFirst ? [treble, bass] : [bass, treble];
  const correct = midis[0] > midis[1] ? '1️⃣ The first' : '2️⃣ The second';
  return {
    stageId: 8,
    prompt: 'Which note is HIGHER?',
    narration: 'Two notes on the grand staff. Which one sounds higher — the first or the second?',
    hint: 'Treble staff notes live up high; bass staff notes live down low.',
    display: { kind: 'grand', midis },
    answerUI: { kind: 'choice', options: ['1️⃣ The first', '2️⃣ The second'], correct },
  };
}

// ---- Stage 9: Full Middle C Position (grand staff → wide keyboard) ----------

function stage9(): SRQuestion {
  const midi = pick([53, 55, 57, 59, 60, 62, 64, 65, 67]); // F3..G4
  return {
    stageId: 9,
    prompt: 'Tap this note',
    narration: 'Find this note on the keyboard. Middle C is your anchor!',
    hint:
      midi === 60
        ? 'Middle C sits between the staves — the C key has a little label.'
        : midi > 60
          ? `It lives above Middle C — count up: this one is ${LETTER[midi]}.`
          : `It lives below Middle C — count down: this one is ${LETTER[midi]}.`,
    display: { kind: 'grand', midis: [midi] },
    answerUI: { kind: 'key', accept: [midi], low: 53, high: 67, middleCLabel: true },
  };
}

// ---- Stage 10: Intervals (2nds–5ths on the treble staff) --------------------

function stage10(): SRQuestion {
  const size = pick([2, 3, 4, 5]);
  const NAMES: Record<number, string> = { 2: '2nd', 3: '3rd', 4: '4th', 5: '5th' };
  const SCALE = [60, 62, 64, 65, 67, 69, 71]; // C4..B4
  const startIdx = Math.floor(Math.random() * (SCALE.length - (size - 1)));
  const up = Math.random() < 0.5;
  const a = SCALE[startIdx];
  const b = SCALE[startIdx + size - 1];
  return {
    stageId: 10,
    prompt: 'How big is the jump?',
    narration: 'Two notes! Count the lines and spaces from the first to the second — is it a 2nd, 3rd, 4th, or 5th?',
    hint: `Count BOTH notes and everything between: line-space-line… this one spans ${size}.`,
    display: { kind: 'staff', clef: 'treble', midis: up ? [a, b] : [b, a] },
    answerUI: { kind: 'choice', options: ['2nd', '3rd', '4th', '5th'], correct: NAMES[size] },
  };
}

// ---- Duration questions (mixed into stages 4+) ------------------------------

const DUR_INFO: Record<Duration, { beats: number; say: string }> = {
  quarter: { beats: 1, say: 'A quarter note gets ONE beat.' },
  half: { beats: 2, say: 'A half note is hollow with a stem — TWO beats.' },
  dottedHalf: { beats: 3, say: 'A dotted half note — the dot adds a beat: THREE beats.' },
  whole: { beats: 4, say: 'A whole note is hollow with no stem — FOUR whole beats.' },
};

function durationQuestion(stageId: number): SRQuestion {
  // Stage 4 sticks to quarter/half; stage 5+ adds dotted half and whole.
  const pool: Duration[] =
    stageId <= 4 ? ['quarter', 'half'] : ['quarter', 'half', 'dottedHalf', 'whole'];
  const dur = pick(pool);
  const info = DUR_INFO[dur];
  return {
    stageId,
    prompt: 'How many beats?',
    narration: 'How many beats does this note get?',
    hint: info.say,
    display: { kind: 'duration', duration: dur },
    answerUI: {
      kind: 'choice',
      options: pool.length === 2 ? ['1', '2'] : ['1', '2', '3', '4'],
      correct: String(info.beats),
    },
  };
}

// ---- Round builder ----------------------------------------------------------

const GENERATORS: Record<number, () => SRQuestion> = {
  2: stage2, 4: stage4, 5: stage5, 6: stage6, 7: stage7, 8: stage8, 9: stage9, 10: stage10,
};

export const STAFF_READER_STAGES = [2, 4, 5, 6, 7, 8, 9, 10];

export function makeStaffRound(stageId: number, count: number): SRQuestion[] {
  const gen = GENERATORS[stageId];
  const round: SRQuestion[] = [];
  while (round.length < count) {
    // Mix in a beats question ~1 in 4 for stages that have learned durations.
    const q = stageId >= 4 && Math.random() < 0.25 ? durationQuestion(stageId) : gen();
    const prev = round[round.length - 1];
    // Variety guard: avoid identical consecutive questions.
    if (prev && prev.prompt === q.prompt && JSON.stringify(prev.display) === JSON.stringify(q.display)) continue;
    round.push(q);
  }
  return round;
}
