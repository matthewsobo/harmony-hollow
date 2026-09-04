# Phase 0 — Mic Test: How to Run It on the iPad

This folder is a **throwaway** test page (no framework, no build step). Its only
job is to answer the five Phase 0 questions before we build anything real.

## Step 1 — Open the deployed site on the iPad

The mic API (`getUserMedia`) only works over HTTPS, which is why the app is
hosted on GitHub Pages (see the root README for how deploys work). Open this
URL in **Safari on the iPad**:

`https://matthewsobo.github.io/harmony-hollow/phase0-mic-test/`

## Step 2 — Install to the home screen

1. Open the URL in Safari on the iPad.
2. Tap the **Share** button → **Add to Home Screen** → Add.
3. **Close Safari** and launch from the new home-screen icon.
4. The "Environment" panel should now say **standalone (home screen) ✅**.
   If it says "browser tab", you're still in Safari — use the icon.

## Step 3 — The five questions (put iPad on the music stand, at the piano)

Tap **Start Listening**, allow the microphone, then check:

| # | Question | How to check |
|---|----------|--------------|
| 1 | Does the mic work in standalone mode? | Environment panel says "standalone" AND notes register when you play. |
| 2 | Does permission persist across launches? | Fully close the app (swipe up), relaunch from the icon, tap Start Listening again. Note whether iOS re-prompts. Repeat after a device restart if you're patient. |
| 3 | Is detection accurate C3–C6? | Play every C, E and G from C3 up to C6, one at a time, moderate volume. The big note display should match. Watch the low ones (C3, E3, G3) especially — that's where naive detectors fail. Note any wrong octaves. |
| 4 | Does it work at music-stand distance? | Do the same test with the iPad where it would actually live, not next to the strings. If soft notes don't register, lower the gate slider and note what value works. |
| 5 | Does household noise cause false notes? | Stop playing, leave it listening with normal house noise (TV, kids talking). Watch the "Confirmed notes" log for a minute or two — anything that appears is a false positive. Raise the gate slider and see if a value exists that blocks noise but still hears the piano. |

Also worth noting:

- The **cents** readout: if your piano consistently reads e.g. −20 cents on
  every note, that's normal drift and exactly what the calibration step will
  absorb. If it reads −60 or worse, tell Claude — that changes the tolerance design.
- The **Echo/Noise/Auto-gain** rows: ✅ means iOS honored our request to turn
  off voice-call processing. ⚠️ means it didn't — report that.
- If anything looks broken, tap **Run Built-in Self-Test**: if that passes but
  live detection fails, the problem is the mic path, not the algorithm.

## Step 4 — Report back

Tell Claude the answers to the five questions (a photo/screenshot of the
Environment panel + Confirmed-notes log helps). That decides whether mic play
is a core feature or an optional bonus layer, and then Phase 1 (the real app
scaffold) starts.
