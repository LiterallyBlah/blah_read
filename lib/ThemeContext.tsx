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
  // Use typeof COLORS as base, with flexibility for theme variants that may have extra properties
  type ThemeColors = typeof COLORS & Record<string, string>;
  let colors: ThemeColors;
  let isDark: boolean;

  if (theme === 'dungeon') {
    colors = COLORS_DUNGEON as unknown as ThemeColors;
    isDark = true;
  } else if (theme === 'auto') {
    isDark = systemScheme !== 'light';
    colors = (isDark ? COLORS : COLORS_LIGHT) as unknown as ThemeColors;
  } else if (theme === 'dark') {
    isDark = true;
    colors = COLORS as unknown as ThemeColors;
  } else {
    isDark = false;
    colors = COLORS_LIGHT as unknown as ThemeColors;
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
