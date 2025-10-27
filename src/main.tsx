import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'

// Desregistrar service workers antigos que possam interferir (ex.: cache de POST)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((regs) => {
    regs.forEach((r) => r.unregister().catch(() => {}));
  }).catch(() => {});
  // Limpar caches antigos (opcional, defensivo)
  if (typeof caches !== 'undefined') {
    caches.keys().then((keys) => {
      keys.forEach((k) => caches.delete(k).catch(() => {}));
    }).catch(() => {});
  }
}

createRoot(document.getElementById("root")!).render(<App />);
