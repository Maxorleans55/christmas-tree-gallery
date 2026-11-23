import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

const root = createRoot(rootElement);
root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

// Register the service worker (production only, so local development is never cached)
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

// Hide the launch splash once the 3D scene has started (and the animation has had time to play)
(() => {
  const splash = document.getElementById('splash');
  if (!splash) return;
  const MIN_MS = 3200;   // let the animation play
  const MAX_MS = 9000;   // never block the app longer than this
  const start = performance.now();
  let done = false;
  const hide = () => {
    if (done) return;
    done = true;
    splash.classList.add('hide');
    setTimeout(() => splash.remove(), 1200);
  };
  const tryHide = () => setTimeout(hide, Math.max(0, MIN_MS - (performance.now() - start)));
  window.addEventListener('tree-ready', tryHide, { once: true });
  setTimeout(hide, MAX_MS);
})();
