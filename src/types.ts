/*
 * Shared types for Harmony Hollow.
 *
 * The content model (Stage / Challenge) is defined here from day one even
 * though Phase 1 has no games yet — it keeps every later phase honest about
 * the rule that challenge CONTENT lives in data files, fully separate from
 * the engine components that present it.
 */

/** The three difficulty tiers, one per kid. */
export type Tier = 'junior' | 'explorer' | 'adventurer';

export const TIER_INFO: Record<Tier, { label: string; blurb: string; emoji: string }> = {
  junior: { label: 'Junior', blurb: 'Ages ~4–6 · everything read aloud', emoji: '🐣' },
  explorer: { label: 'Explorer', blurb: 'Ages ~7–9 · the full adventure', emoji: '🦊' },
  adventurer: { label: 'Adventurer', blurb: 'Ages ~10+ · faster + trickier', emoji: '🦉' },
};

/** Progress a profile has made in one curriculum stage. */
export interface StageProgress {
  stars: number;
  completed: boolean;
}

/** One child's profile. Everything persists in IndexedDB. */
export interface Profile {
  id: string;
  name: string;
  tier: Tier;
  /** Keyed by stage id (0–15, see the curriculum). */
  stageProgress: Record<number, StageProgress>;
  starsTotal: number;
  streak: {
    /** ISO date (YYYY-MM-DD) of the last day this profile played. */
    lastPlayedDay: string | null;
    days: number;
  };
  createdISO: string;
}

/** Every kind of question the game engine will know how to present. */
export type ChallengeType =
  | 'tapNote' | 'tapKey' | 'micPlayKey' | 'micPlayPattern' | 'durationQuiz'
  | 'tapRhythm' | 'echoRhythm' | 'clapRhythm' | 'countBeats'
  | 'higherLower' | 'sameDifferent' | 'melodicDirection' | 'intervalByEar'
  | 'matchPitchOnPiano';

export interface Challenge {
  id: string;
  stageId: number;
  type: ChallengeType;
  /** Shape depends on `type`; the engine components narrow it. */
  promptData: unknown;
  correctAnswer: unknown;
  hints: string[];
}

export interface Stage {
  id: number;
  name: string;
  tiers: Tier[];
  concepts: string[];
}

/** Makes a reasonably-unique id without pulling in a library. */
export function makeId(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
}

export function newProfile(name: string, tier: Tier): Profile {
  return {
    id: makeId(),
    name,
    tier,
    stageProgress: {},
    starsTotal: 0,
    streak: { lastPlayedDay: null, days: 0 },
    createdISO: new Date().toISOString(),
  };
}
