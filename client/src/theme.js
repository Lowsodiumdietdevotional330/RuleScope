import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';

const THEME_STORAGE_KEY = 'app-theme-mode';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [themeMode, setThemeMode] = useState(() => localStorage.getItem(THEME_STORAGE_KEY) || 'light');

  useEffect(() => {
    localStorage.setItem(THEME_STORAGE_KEY, themeMode);
    document.body.classList.remove('theme-light', 'theme-dark');
    document.body.classList.add(themeMode === 'dark' ? 'theme-dark' : 'theme-light');
  }, [themeMode]);

  const value = useMemo(() => ({
    themeMode,
    isDarkMode: themeMode === 'dark',
    toggleTheme: () => setThemeMode((prev) => (prev === 'dark' ? 'light' : 'dark')),
    setThemeMode,
  }), [themeMode]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeMode() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useThemeMode must be used within ThemeProvider');
  }
  return context;
}
