import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { DesktopOverlay } from './components/mini/DesktopOverlay.tsx';
import { installAuthDiagnostics } from './services/authDiagnostics.ts';

installAuthDiagnostics();

const route = window.location.hash.replace(/^#\//, '');
const overlayMode = route === 'companion' || route === 'xtreme-small' ? route : null;

createRoot(document.getElementById('root')!).render(
  overlayMode ? <DesktopOverlay mode={overlayMode} /> : <App />
);
