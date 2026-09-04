import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  // The app lives at https://matthewsobo.github.io/harmony-hollow/ — a
  // subpath, not a domain root — so every asset URL must be prefixed.
  base: '/harmony-hollow/',
  plugins: [
    react(),
    // vite-plugin-pwa generates both the web app manifest and a service
    // worker that precaches the whole build, which is what makes the app
    // work fully offline after the first load (a hard requirement: practice
    // happens at the piano, not near good WiFi).
    VitePWA({
      // autoUpdate: when a new version is deployed, the service worker
      // fetches it in the background and it's used on the next launch —
      // no "update available" prompts for the kids to be confused by.
      registerType: 'autoUpdate',
      includeAssets: ['icon-180.png'],
      manifest: {
        name: 'Harmony Hollow',
        short_name: 'Harmony',
        description: 'Piano practice game for kids',
        display: 'standalone',
        background_color: '#fdf6ec',
        theme_color: '#fdf6ec',
        icons: [
          { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
          { src: 'icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
        ],
      },
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,webmanifest}'],
        // The Phase 0 mic test page lives alongside the app but is NOT part
        // of the SPA — navigations to it must hit the real files, not be
        // rewritten to the app shell.
        navigateFallbackDenylist: [/phase0-mic-test/],
      },
    }),
  ],
});
