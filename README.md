# Harmony Hollow

A piano practice game for kids, built as a Progressive Web App (PWA): tap-based
note-reading quizzes plus microphone listen-and-play challenges against a real
acoustic piano. No Mac, no App Store — installs via Safari's "Add to Home
Screen" and runs full-screen, offline.

## Current status

**Phase 3** — Staff Reader is playable in the Music Shop: hand-rolled SVG
notation (pre-staff note heads, treble and bass staves with landmark-line
tinting, the grand staff), Stages 2 and 4–10, and "how many beats?" duration
questions mixed in from Stage 4 up. Answers are either tapped on a
range-adapting on-screen keyboard (5–9 white keys, so keys stay big) or big
multiple-choice buttons. Shared round engine keeps the feel identical to Key
Detective.

**Phase 2** — Key Detective (tap variant) is playable: an on-screen keyboard
teaching Stage 1 (Black Key Neighborhoods) and Stage 3 (White Key Names), with
synthesized key sounds, spoken narration for the Junior tier, gentle hint
progression (wrong answers cost nothing; the answer glows after two misses),
and stars persisting per stage and per profile.

**Phase 1** — app scaffold. Vite + React + TypeScript PWA with offline service
worker, profile selection (three tiers), the Harmony Hollow map shell, and
progress backup/restore.

**Phase 0 (closed)** — microphone de-risking, verified on the family iPad and
iPhone. Verdict: mic play ships as a core feature. The test page lives on at
[public/phase0-mic-test/](public/phase0-mic-test/) (still deployed at
`/phase0-mic-test/` for future mic debugging); its findings — YIN with
octave-error correction, per-device auto-gate calibration, steady-pitch
confirmation to reject speech — are the spec for the Phase 4 mic pipeline.

## Hosting & deploys (GitHub Pages)

The site deploys automatically: every push to `main` runs
[.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml), which
publishes the repo to GitHub Pages over HTTPS (required for both the microphone
API and the service worker).

- Live site: `https://matthewsobo.github.io/harmony-hollow/`
- Mic test page: `https://matthewsobo.github.io/harmony-hollow/phase0-mic-test/`

To deploy an update:

```
git add -A
git commit -m "describe the change"
git push
```

Wait ~1 minute for the Actions run to finish (green check on the repo page).

## Installing on an iPad / iPhone

1. Open the site URL in **Safari**.
2. Tap the **Share** button → **Add to Home Screen** → **Add**.
3. Launch from the home-screen icon — it opens full-screen like a native app.

Note: after deploying an update, an installed copy may show the old version
once before picking up the new one (normal service-worker behavior once the
real app ships; the Phase 0 page has no service worker and updates on reload).

## Local development

```
npm install
npm run dev
```

Then open http://localhost:5173/harmony-hollow/ (the app is served under the
same subpath as production). `npm run build` type-checks and produces `dist/`;
`npm run test:pitch` runs the pitch-detector test suite. The mic works on
localhost without HTTPS in desktop browsers; testing on the iPad requires the
deployed HTTPS site.
