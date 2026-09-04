# Harmony Hollow

A piano practice game for kids, built as a Progressive Web App (PWA): tap-based
note-reading quizzes plus microphone listen-and-play challenges against a real
acoustic piano. No Mac, no App Store — installs via Safari's "Add to Home
Screen" and runs full-screen, offline.

## Current status

**Phase 0** — microphone de-risking. The [phase0-mic-test/](phase0-mic-test/)
folder holds a throwaway test page that must be verified on a real iPad against
the real piano before any game features get built. See
[phase0-mic-test/PHASE0-TESTING.md](phase0-mic-test/PHASE0-TESTING.md) for the
test checklist.

## Hosting & deploys (GitHub Pages)

The site deploys automatically: every push to `main` runs
[.github/workflows/deploy-pages.yml](.github/workflows/deploy-pages.yml), which
publishes the repo to GitHub Pages over HTTPS (required for both the microphone
API and the service worker).

- Live site: `https://<your-username>.github.io/harmony-hollow/`
- Mic test page: `https://<your-username>.github.io/harmony-hollow/phase0-mic-test/`

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
npx -y serve phase0-mic-test -l 4173
```

Then open http://localhost:4173. The mic works on localhost without HTTPS in
desktop browsers; testing on the iPad requires the deployed HTTPS site.
