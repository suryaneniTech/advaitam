import { createContext, useContext, useEffect, useState } from 'react';

const STORAGE_KEY = 'advaitam-theme';

const ThemeContext = createContext(null);

function getSystemTheme() {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

function applyTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem(STORAGE_KEY, theme);

  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) {
    meta.content = theme === 'dark' ? '#0c0f14' : '#f4f6f9';
  }
}

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(
    () => localStorage.getItem(STORAGE_KEY) || getSystemTheme()
  );

  useEffect(() => {
    applyTheme(theme);
  }, [theme]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = () => {
      if (!localStorage.getItem(STORAGE_KEY)) {
        setThemeState(getSystemTheme());
      }
    };
    mq.addEventListener('change', onChange);
    return () => mq.removeEventListener('change', onChange);
  }, []);

  const setTheme = (next) => setThemeState(next);
  const toggleTheme = () => setThemeState((t) => (t === 'dark' ? 'light' : 'dark'));

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
