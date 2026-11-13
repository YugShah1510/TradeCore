import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [theme, setThemeState] = useState(() => {
    try {
      const stored = localStorage.getItem('color-scheme');
      return stored === 'light' || stored === 'dark' ? stored : 'system';
    } catch (e) {
      return 'system';
    }
  });

  const [resolvedTheme, setResolvedTheme] = useState(() => {
    try {
      const stored = localStorage.getItem('color-scheme');
      if (stored === 'light' || stored === 'dark') return stored;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    } catch (e) {
      return 'light';
    }
  });

  // Apply theme to DOM and meta tag
  const applyTheme = (targetTheme) => {
    try {
      const meta = document.querySelector('meta[name="color-scheme"]');
      const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
      let effective = targetTheme;

      if (targetTheme === 'system') {
        effective = systemDark ? 'dark' : 'light';
        if (meta) meta.content = 'light dark';
        localStorage.removeItem('color-scheme');
      } else {
        if (meta) meta.content = targetTheme;
        localStorage.setItem('color-scheme', targetTheme);
      }

      setResolvedTheme(effective);
      if (effective === 'dark') {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    } catch (e) {
      console.error('Failed to apply theme:', e);
    }
  };

  const setTheme = (newTheme) => {
    setThemeState(newTheme);
    applyTheme(newTheme);
  };

  const toggleTheme = () => {
    const nextTheme = resolvedTheme === 'dark' ? 'light' : 'dark';
    const systemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const systemScheme = systemDark ? 'dark' : 'light';

    // If nextTheme matches system, revert to system
    if (nextTheme === systemScheme) {
      setTheme('system');
    } else {
      setTheme(nextTheme);
    }
  };

  useEffect(() => {
    applyTheme(theme);

    // Listen to OS system color scheme changes
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleSystemChange = (e) => {
      const stored = localStorage.getItem('color-scheme');
      if (!stored) {
        setResolvedTheme(e.matches ? 'dark' : 'light');
        if (e.matches) {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }
      }
    };

    mediaQuery.addEventListener('change', handleSystemChange);

    // Listen for storage changes across browser tabs
    const handleStorage = (e) => {
      if (e.key === 'color-scheme') {
        const val = e.newValue === 'light' || e.newValue === 'dark' ? e.newValue : 'system';
        setThemeState(val);
        applyTheme(val);
      }
    };

    window.addEventListener('storage', handleStorage);

    return () => {
      mediaQuery.removeEventListener('change', handleSystemChange);
      window.removeEventListener('storage', handleStorage);
    };
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme, toggleTheme }}>
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
