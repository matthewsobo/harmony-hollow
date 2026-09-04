/*
 * stages.ts — the full curriculum skeleton (see the project brief, Section 7).
 * All 16 stages are declared now even though only 1 and 3 have content, so
 * progress tracking, the map, and "This Week's Focus" always have the real
 * list to point at. All names are original.
 */
import type { Stage } from '../types';

export const STAGES: Stage[] = [
  { id: 0, name: 'Welcome & Hand Position', tiers: ['junior', 'explorer', 'adventurer'], concepts: ['left/right hand', 'finger numbers'] },
  { id: 1, name: 'Black Key Neighborhoods', tiers: ['junior', 'explorer', 'adventurer'], concepts: ['groups of 2 and 3', 'up/down', 'higher/lower'] },
  { id: 2, name: 'Reading Up, Down & Same', tiers: ['junior', 'explorer', 'adventurer'], concepts: ['pre-staff direction'] },
  { id: 3, name: 'White Key Names', tiers: ['junior', 'explorer', 'adventurer'], concepts: ['C D E', 'F G A B'] },
  { id: 4, name: 'Middle C Position', tiers: ['junior', 'explorer', 'adventurer'], concepts: ['five-finger position', 'pre-staff reading'] },
  { id: 5, name: 'Steps & Skips', tiers: ['junior', 'explorer', 'adventurer'], concepts: ['2nds and 3rds off-staff'] },
  { id: 6, name: 'Meeting the Bass Staff', tiers: ['explorer', 'adventurer'], concepts: ['F line', 'Middle C landmark'] },
  { id: 7, name: 'Meeting the Treble Staff', tiers: ['explorer', 'adventurer'], concepts: ['G line', 'Middle C landmark'] },
  { id: 8, name: 'The Grand Staff', tiers: ['explorer', 'adventurer'], concepts: ['both staves together'] },
  { id: 9, name: 'Full Middle C Position on the Staff', tiers: ['explorer', 'adventurer'], concepts: ['all ten notes around Middle C'] },
  { id: 10, name: 'Intervals: 2nds to 5ths', tiers: ['explorer', 'adventurer'], concepts: ['interval reading', 'interval feel'] },
  { id: 11, name: 'Dynamics & Articulation', tiers: ['explorer', 'adventurer'], concepts: ['forte/piano', 'legato/staccato', 'ties vs slurs'] },
  { id: 12, name: 'Sharps & Flats', tiers: ['explorer', 'adventurer'], concepts: ['nearest black key'] },
  { id: 13, name: 'Chords & Rests I', tiers: ['explorer', 'adventurer'], concepts: ['C chord', 'whole/half/quarter rests'] },
  { id: 14, name: 'G Position', tiers: ['explorer', 'adventurer'], concepts: ['G five-finger position', 'G chord'] },
  { id: 15, name: 'Review Arena', tiers: ['explorer', 'adventurer'], concepts: ['mixed review', 'graduation'] },
];

export function stageName(id: number): string {
  return STAGES.find((s) => s.id === id)?.name ?? `Stage ${id}`;
}
