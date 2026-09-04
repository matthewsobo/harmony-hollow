/*
 * speech.ts — narration via the Web Speech API.
 *
 * Junior tier (pre-reader) hears every prompt read aloud; other tiers get a
 * speaker button to replay it. Built-in synthesis costs nothing to ship; if
 * it sounds too robotic on the family devices, the upgrade path is bundled
 * audio clips behind this same narrate() call.
 */

export function speechAvailable(): boolean {
  return typeof window !== 'undefined' && 'speechSynthesis' in window;
}

export function narrate(text: string): void {
  try {
    if (!speechAvailable()) return;
    // One voice at a time: a new prompt always cancels the old one.
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.95; // a touch slower for young ears
    window.speechSynthesis.speak(u);
  } catch {
    /* narration is optional — never break the game over it */
  }
}

export function stopNarration(): void {
  try {
    if (speechAvailable()) window.speechSynthesis.cancel();
  } catch { /* ignore */ }
}
