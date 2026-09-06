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

let lastText = '';
let lastSpokenAt = 0;

export function narrate(text: string, opts: { force?: boolean } = {}): void {
  try {
    if (!speechAvailable()) return;
    // Repeat-loop guard (real-device bug): identical text requested again
    // while still speaking, or within a short window, is skipped — e.g. a
    // ringing note re-firing the same miss hint over and over. The 🔊 replay
    // button passes force:true because there a repeat IS the point.
    const now = Date.now();
    if (
      !opts.force &&
      text === lastText &&
      (window.speechSynthesis.speaking || now - lastSpokenAt < 2500)
    ) {
      return;
    }
    lastText = text;
    lastSpokenAt = now;
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
