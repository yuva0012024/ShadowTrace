import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

const STORAGE_KEY = 'shadowtrace_theme';

export function ThemeProvider({ children }) {
  // Saved mode preference: 'dark' | 'light' | 'system'
  const [themeMode, setThemeModeState] = useState(() => {
    return localStorage.getItem(STORAGE_KEY) || 'dark';
  });

  // Resolved actual theme applied to DOM: 'dark' | 'light'
  const [resolvedTheme, setResolvedTheme] = useState('dark');

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const applyTheme = () => {
      let activeTheme = 'dark';
      if (themeMode === 'system') {
        activeTheme = mediaQuery.matches ? 'dark' : 'light';
      } else {
        activeTheme = themeMode === 'light' ? 'light' : 'dark';
      }

      setResolvedTheme(activeTheme);
      document.documentElement.setAttribute('data-theme', activeTheme);
      document.documentElement.classList.remove('theme-dark', 'theme-light');
      document.documentElement.classList.add(`theme-${activeTheme}`);
    };

    applyTheme();

    const listener = (e) => {
      if (themeMode === 'system') {
        const newTheme = e.matches ? 'dark' : 'light';
        setResolvedTheme(newTheme);
        document.documentElement.setAttribute('data-theme', newTheme);
        document.documentElement.classList.remove('theme-dark', 'theme-light');
        document.documentElement.classList.add(`theme-${newTheme}`);
      }
    };

    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, [themeMode]);

  const setThemeMode = (mode) => {
    if (!['dark', 'light', 'system'].includes(mode)) return;
    setThemeModeState(mode);
    localStorage.setItem(STORAGE_KEY, mode);
  };

  const value = {
    themeMode,
    resolvedTheme,
    setThemeMode
  };

  return (
    <ThemeContext.Provider value={value}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
