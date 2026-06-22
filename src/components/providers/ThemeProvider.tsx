'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';

export type AccentColor = 'purple' | 'blue' | 'cyan' | 'green' | 'pink' | 'orange';

export const ACCENT_COLORS: Record<AccentColor, { hex: string; name: string; dim: string; border: string; glow: string }> = {
  purple: {
    hex: '#7c3aed',
    name: 'Purple',
    dim: 'rgba(124, 58, 237, 0.1)',
    border: 'rgba(124, 58, 237, 0.2)',
    glow: 'rgba(124, 58, 237, 0.25)',
  },
  blue: {
    hex: '#2563eb',
    name: 'Blue',
    dim: 'rgba(37, 99, 235, 0.1)',
    border: 'rgba(37, 99, 235, 0.2)',
    glow: 'rgba(37, 99, 235, 0.25)',
  },
  cyan: {
    hex: '#0891b2',
    name: 'Cyan',
    dim: 'rgba(8, 145, 178, 0.1)',
    border: 'rgba(8, 145, 178, 0.2)',
    glow: 'rgba(8, 145, 178, 0.25)',
  },
  green: {
    hex: '#059669',
    name: 'Green',
    dim: 'rgba(5, 150, 105, 0.1)',
    border: 'rgba(5, 150, 105, 0.2)',
    glow: 'rgba(5, 150, 105, 0.25)',
  },
  pink: {
    hex: '#db2777',
    name: 'Pink',
    dim: 'rgba(219, 39, 119, 0.1)',
    border: 'rgba(219, 39, 119, 0.2)',
    glow: 'rgba(219, 39, 119, 0.25)',
  },
  orange: {
    hex: '#ea580c',
    name: 'Orange',
    dim: 'rgba(234, 88, 12, 0.1)',
    border: 'rgba(234, 88, 12, 0.2)',
    glow: 'rgba(234, 88, 12, 0.25)',
  },
};

interface ThemeContextType {
  theme: 'dark' | 'light';
  setTheme: (theme: 'dark' | 'light') => void;
  toggleTheme: () => void;
  accentColor: AccentColor;
  setAccentColor: (color: AccentColor) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<'dark' | 'light'>('dark');
  const [accentColor, setAccentColorState] = useState<AccentColor>('purple');

  // Load from localStorage on mount
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('tradiary_theme') as 'dark' | 'light';
      if (savedTheme) {
        setThemeState(savedTheme);
      } else {
        localStorage.setItem('tradiary_theme', 'dark');
      }
      
      const savedAccent = localStorage.getItem('tradiary_accent') as AccentColor;
      if (savedAccent && ACCENT_COLORS[savedAccent]) {
        setAccentColorState(savedAccent);
      } else {
        localStorage.setItem('tradiary_accent', 'purple');
      }
    }
  }, []);

  // Sync variables to document head/documentElement root style
  useEffect(() => {
    const root = window.document.documentElement;
    
    // Apply standard tailwind data-theme or class
    if (theme === 'light') {
      root.classList.remove('dark');
      root.classList.add('light');
      root.setAttribute('data-theme', 'light');
      
      root.style.setProperty('--bg-primary', '#fafafa');
      root.style.setProperty('--bg-card', '#ffffff');
      root.style.setProperty('--border', '#e4e4e7');
      root.style.setProperty('--border-subtle', 'rgba(228, 228, 231, 0.5)');
      root.style.setProperty('--text-primary', '#09090b');
      root.style.setProperty('--text-secondary', '#4b5563');
      root.style.setProperty('--text-muted', '#6b7280');
    } else {
      root.classList.remove('light');
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
      
      root.style.setProperty('--bg-primary', '#09090b');
      root.style.setProperty('--bg-card', '#0f0f11');
      root.style.setProperty('--border', '#1c1c1e');
      root.style.setProperty('--border-subtle', 'rgba(28, 28, 30, 0.5)');
      root.style.setProperty('--text-primary', '#fafafa');
      root.style.setProperty('--text-secondary', '#cbd5e1');
      root.style.setProperty('--text-muted', '#94a3b8');
    }

    const colors = ACCENT_COLORS[accentColor] || ACCENT_COLORS.purple;
    root.style.setProperty('--accent', colors.hex);
    root.style.setProperty('--accent-dim', colors.dim);
    root.style.setProperty('--accent-border', colors.border);
    root.style.setProperty('--accent-glow', colors.glow);
  }, [theme, accentColor]);

  const setTheme = useCallback((newTheme: 'dark' | 'light') => {
    setThemeState(newTheme);
    localStorage.setItem('tradiary_theme', newTheme);
  }, []);

  const toggleTheme = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === 'dark' ? 'light' : 'dark';
      localStorage.setItem('tradiary_theme', next);
      return next;
    });
  }, []);

  const setAccentColor = useCallback((color: AccentColor) => {
    setAccentColorState(color);
    localStorage.setItem('tradiary_accent', color);
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, setTheme, toggleTheme, accentColor, setAccentColor }}>
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
