/*
 * keyboardLayout.ts — which of the 12 pitch classes are black keys, and their
 * display names. Kept out of the component so content files can use it too.
 */
export const NOTE_INFO: { name: string; black: boolean }[] = [
  { name: 'C', black: false },
  { name: 'C sharp', black: true },
  { name: 'D', black: false },
  { name: 'D sharp', black: true },
  { name: 'E', black: false },
  { name: 'F', black: false },
  { name: 'F sharp', black: true },
  { name: 'G', black: false },
  { name: 'G sharp', black: true },
  { name: 'A', black: false },
  { name: 'A sharp', black: true },
  { name: 'B', black: false },
];
