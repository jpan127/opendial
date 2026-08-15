import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App.tsx';
import { browser } from 'wxt/browser';
import { STORAGE_KEYS } from '@/src/lib/storage';
import '@/src/theme/tokens.css';
import './style.css';

document.documentElement.dataset.theme = 'dark';
void browser.storage.local.get(STORAGE_KEYS.theme).then((result) => {
  const theme = result[STORAGE_KEYS.theme];
  if (theme === 'light' || theme === 'dark') {
    document.documentElement.dataset.theme = theme;
  }
});

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
);
