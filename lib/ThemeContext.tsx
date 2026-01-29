import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useColorScheme } from 'react-native';
import { COLORS, COLORS_LIGHT, COLORS_DUNGEON, FONTS, spacing as baseSpacing, fontSize as baseFontSize, letterSpacing } from './theme';
import { settings, Settings } from './settings';

interface ThemeContextValue {
  colors: typeof COLORS;
  fonts: typeof FONTS;
  spacing: typeof baseSpacing;
  fontSize: (size: 'micro' | 'small' | 'body' | 'large' | 'title' | 'hero') => number;
  letterSpacing: typeof letterSpacing;
  isDark: boolean;
  themeName: Settings['theme'];
  fontScale: number;
  reload: () => Promise<void>;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const systemScheme = useColorScheme();
  const [theme, setTheme] = useState<Settings['theme']>('dungeon');
  const [fontScale, setFontScale] = useState<number>(1);

  useEffect(() => {
    loadSettings();
  }, []);

  async function loadSettings() {
    const s = await settings.get();
    setTheme(s.theme);
    setFontScale(s.fontScale);
  }

  // Determine colors based on theme
  let colors: typeof COLORS;
  let isDark: boolean;

  if (theme === 'dungeon') {
    colors = COLORS_DUNGEON as typeof COLORS;
    isDark = true;
  } else if (theme === 'auto') {
    isDark = systemScheme !== 'light';
    colors = isDark ? COLORS : COLORS_LIGHT;
  } else if (theme === 'dark') {
    isDark = true;
    colors = COLORS;
  } else {
    isDark = false;
    colors = COLORS_LIGHT;
  }

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
      themeName: theme,
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
