/*
 * soundDetective.ts — question CONTENT for Sound Detective (ear training).
 *
 * Same contract as the other content files: pure data + generators, zero UI.
 * Every question carries `tones` — the notes the engine plays — and one of
 * two answer UIs (choice buttons, or the microphone for match-it-on-piano).
 *
 * Difficulty scales by TIER, not by stage: ear questions get harder by
 * shrinking the pitch gap. Junior hears wide, obvious gaps (a 5-year-old can
 * win these); Adventurer gets narrow ones. Replay is always unlimited — ear
 * training is uniquely frustrating when a child feels rushed.
 *
 * Stars bank into the curriculum stage each skill aligns with (Section 7 of
 * the brief): higher/lower→1, same/different→2, direction→5, match→9,
 * intervals→10.
 */
import type { Tier } from '../types';

export type SDKind = 'higherLower' | 'sameDifferent' | 'direction' | 'interval' | 'matchPiano';

export interface SDQuestion {
  kind: SDKind;
  stageId: number;
  prompt: string;
  narration: string;
  hint: string;
  /** Notes the engine plays: midi + start time in seconds. */
  tones: { midi: number; at: number }[];
  answerUI:
    | { kind: 'choice'; options: string[]; correct: string }
    | { kind: 'mic'; targetMidi: number };
}

export const SD_INFO: Record<SDKind, { title: string; emoji: string; stageId: number; tiers: Tier[]; mic?: boolean }> = {
  higherLower: { title: 'Higher or Lower', emoji: '🐦', stageId: 1, tiers: ['junior', 'explorer', 'adventurer'] },
  sameDifferent: { title: 'Same or Different', emoji: '👯', stageId: 2, tiers: ['junior', 'explorer', 'adventurer'] },
  direction: { title: 'Which Way Did It Go?', emoji: '🎢', stageId: 5, tiers: ['junior', 'explorer', 'adventurer'] },
  matchPiano: { title: 'Match It on the Piano', emoji: '🎯', stageId: 9, tiers: ['explorer', 'adventurer'], mic: true },
  interval: { title: 'Name That Interval', emoji: '📏', stageId: 10, tiers: ['explorer', 'adventurer'] },
};

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randInt(lo: number, hi: number): number {
  return lo + Math.floor(Math.random() * (hi - lo + 1));
}

/** Smallest pitch gap (semitones) per tier — the difficulty dial. */
function minGap(tier: Tier): number {
  return tier === 'junior' ? 5 : tier === 'adventurer' ? 2 : 3;
}

const LO = 55; // G3
const HI = 79; // G5 — mid-range where the synth voice sounds decent

// ---- Higher or lower --------------------------------------------------------

function higherLower(tier: Tier): SDQuestion {
  const gap = randInt(minGap(tier), minGap(tier) + 7);
  // Choose the direction first so the gap is always exactly as intended.
  const secondHigher = Math.random() < 0.5;
  const first = secondHigher ? randInt(LO, HI - gap) : randInt(LO + gap, HI);
  const second = secondHigher ? first + gap : first - gap;
  return {
    kind: 'higherLower',
    stageId: SD_INFO.higherLower.stageId,
    prompt: 'Which note was HIGHER?',
    narration: 'Two notes are coming. Which one was higher — the first or the second?',
    hint: 'Higher sounds like a little bird 🐦 — lower like a big bear 🐻. Tap replay to hear it again!',
    tones: [
      { midi: first, at: 0 },
      { midi: second, at: 0.8 },
    ],
    answerUI: {
      kind: 'choice',
      options: ['1️⃣ The first', '2️⃣ The second'],
      correct: second > first ? '2️⃣ The second' : '1️⃣ The first',
    },
  };
}

// ---- Same or different ------------------------------------------------------

function sameDifferent(tier: Tier): SDQuestion {
  const same = Math.random() < 0.5;
  const first = randInt(LO + 6, HI - 6);
  const gap = randInt(minGap(tier), minGap(tier) + 5);
  const second = same ? first : first + (Math.random() < 0.5 ? gap : -gap);
  return {
    kind: 'sameDifferent',
    stageId: SD_INFO.sameDifferent.stageId,
    prompt: 'Same or different?',
    narration: 'Listen to both notes. Were they the same, or different?',
    hint: 'Close your eyes and listen again — twins sound exactly alike!',
    tones: [
      { midi: first, at: 0 },
      { midi: second, at: 0.8 },
    ],
    answerUI: {
      kind: 'choice',
      options: ['🟰 Same', '❗ Different'],
      correct: same ? '🟰 Same' : '❗ Different',
    },
  };
}

// ---- Which way did it go (3-note fragment) ----------------------------------

function direction(tier: Tier): SDQuestion {
  const dir = pick(['up', 'down', 'same'] as const);
  const step = Math.max(2, minGap(tier) - 1);
  const start = dir === 'up' ? randInt(LO, HI - 2 * step) : dir === 'down' ? randInt(LO + 2 * step, HI) : randInt(LO, HI);
  const delta = dir === 'up' ? step : dir === 'down' ? -step : 0;
  return {
    kind: 'direction',
    stageId: SD_INFO.direction.stageId,
    prompt: 'Which way did it go?',
    narration: 'A little tune is coming. Did it climb up, slide down, or stay the same?',
    hint: 'Hum along with it — did your voice climb or fall?',
    tones: [0, 1, 2].map((i) => ({ midi: start + delta * i, at: i * 0.5 })),
    answerUI: {
      kind: 'choice',
      options: ['⬆️ Up', '⬇️ Down', '🟰 Same'],
      correct: dir === 'up' ? '⬆️ Up' : dir === 'down' ? '⬇️ Down' : '🟰 Same',
    },
  };
}

// ---- Name that interval -----------------------------------------------------

const INTERVAL_SEMITONES: Record<number, number> = { 2: 2, 3: 4, 4: 5, 5: 7 }; // major 2nd/3rd, perfect 4th/5th
const INTERVAL_NAMES: Record<number, string> = { 2: '2nd', 3: '3rd', 4: '4th', 5: '5th' };

function interval(_tier: Tier, wide: boolean): SDQuestion {
  // Per the brief: start wide and obvious (5ths/4ths) before narrow (2nds/3rds) —
  // the round builder passes `wide` for its first half.
  const size = wide ? pick([5, 4]) : pick([2, 3, 4, 5]);
  const root = randInt(60, 71); // C4..B4
  return {
    kind: 'interval',
    stageId: SD_INFO.interval.stageId,
    prompt: 'How big was the jump?',
    narration: 'Two notes! Was the jump a 2nd, a 3rd, a 4th, or a 5th?',
    hint: 'A 2nd is a tiny neighbor-step. A 5th is a big leap — think of a superhero jump!',
    tones: [
      { midi: root, at: 0 },
      { midi: root + INTERVAL_SEMITONES[size], at: 0.8 },
    ],
    answerUI: {
      kind: 'choice',
      options: ['2nd', '3rd', '4th', '5th'],
      correct: INTERVAL_NAMES[size],
    },
  };
}

// ---- Match it on the piano (microphone) -------------------------------------

function matchPiano(): SDQuestion {
  const target = pick([60, 62, 64, 65, 67]); // C4..G4 — the taught hand position
  return {
    kind: 'matchPiano',
    stageId: SD_INFO.matchPiano.stageId,
    prompt: 'Find this note on the piano!',
    narration: 'Listen to my note, then hunt for it on the real piano. Take your time!',
    hint: 'Is your note higher or lower than mine? Sneak up on it one key at a time!',
    tones: [{ midi: target, at: 0 }],
    answerUI: { kind: 'mic', targetMidi: target },
  };
}

// ---- Round builder ----------------------------------------------------------

export function makeEarRound(kind: SDKind, tier: Tier, count: number): SDQuestion[] {
  const round: SDQuestion[] = [];
  for (let i = 0; i < count; i++) {
    switch (kind) {
      case 'higherLower': round.push(higherLower(tier)); break;
      case 'sameDifferent': round.push(sameDifferent(tier)); break;
      case 'direction': round.push(direction(tier)); break;
      case 'interval': round.push(interval(tier, i < count / 2)); break;
      case 'matchPiano': round.push(matchPiano()); break;
    }
  }
  return round;
}
