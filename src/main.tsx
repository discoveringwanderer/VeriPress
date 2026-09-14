import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './index.css'
import { veriPressApi } from './api/veriPressApi'

// One-time data reset — bumping the version below triggers a full wipe on next load.
const RESET_VERSION = import.meta.env.VITE_RESET_VERSION ?? "v1";
const RESET_KEY = "veripress.reset-version";
try {
  if (window.localStorage.getItem(RESET_KEY) !== RESET_VERSION) {
    veriPressApi.nukeAllData();
    window.localStorage.setItem(RESET_KEY, RESET_VERSION);
  }
} catch {
  // Storage unavailable — skip reset.
}

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
