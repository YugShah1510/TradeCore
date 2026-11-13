import React from 'react';
import { useTheme } from '../context/ThemeContext';
import { Sun, Moon } from 'lucide-react';

export default function ThemeToggle({ className = '', style = {} }) {
  const { resolvedTheme, toggleTheme } = useTheme();
  const isDark = resolvedTheme === 'dark';

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={`glass-pill ${className}`}
      title={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
      aria-label={isDark ? 'Switch to Light Theme' : 'Switch to Dark Theme'}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '6px',
        padding: '7px 12px',
        fontSize: '12px',
        fontWeight: '600',
        cursor: 'pointer',
        color: 'var(--text-primary)',
        transition: 'all 0.2s ease',
        ...style,
      }}
    >
      {isDark ? (
        <>
          <Sun size={15} color="#F59E0B" style={{ flexShrink: 0 }} />
          <span>Light</span>
        </>
      ) : (
        <>
          <Moon size={15} color="#6366F1" style={{ flexShrink: 0 }} />
          <span>Dark</span>
        </>
      )}
    </button>
  );
}
