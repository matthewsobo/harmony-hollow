import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import './styles.css';

// The service worker (offline support + auto-update) is registered
// automatically by vite-plugin-pwa's injected script — nothing to do here.

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
