import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { LocaleProvider } from './hooks/LocaleProvider';
import { ThemeProvider } from './hooks/ThemeProvider';
import './styles/app.css';
import { initializeLocale } from './lib/i18n';

void initializeLocale().then(locale => {
  document.documentElement.lang = locale;
  ReactDOM.createRoot(document.getElementById('root')!).render(
    <React.StrictMode><LocaleProvider><ThemeProvider><App /></ThemeProvider></LocaleProvider></React.StrictMode>,
  );
});
