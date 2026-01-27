import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { COLORS, COLORS_LIGHT, FONTS, spacing as baseSpacing, fontSize as baseFontSize, letterSpacing } from './theme';
import { settings, Settings } from './settings';

interface ThemeContextValue {
  colors: typeof COLORS;
  fonts: typeof FONTS;
  spacing: typeof baseSpacing;
  fontSize: (size: 'micro' | 'small' | 'body' | 'large' | 'title' | 'hero') => number;
  letterSpacing: typeof letterSpacing;
  isDark: boolean;
  fontScale: number;
  reload: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [theme, setTheme] = useState<'auto' | 'dark' | 'light'>('auto');
  const [fontScale, setFontScale] = useState<number>(1);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    const s = await settings.get();
    setTheme(s.theme);
    setFontScale(s.fontScale);
  }

  const isDark = theme === 'auto' ? systemScheme !== 'light' : theme === 'dark';
  const colors = isDark ? COLORS : COLORS_LIGHT;

  const scaledFontSize = (size: 'micro' | 'small' | 'body' | 'large' | 'title' | 'hero') => {
    return Math.round(baseFontSize(size) * fontScale);
  };

  return (
    <ThemeContext.Provider value={{
      colors,
      fonts: FONTS,
      spacing: baseSpacing,
      fontSize: scaledFontSize,
      letterSpacing,
      isDark,
      fontScale,
      reload: loadSettings,
    }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within ThemeProvider');
  return ctx;
}
