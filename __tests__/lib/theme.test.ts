import { COLORS, COLORS_LIGHT, FONTS, spacing, fontSize, letterSpacing } from '@/lib/theme';

describe('theme', () => {
  it('exports COLORS matching design system', () => {
    expect(COLORS.background).toBe('#0a0a0a');
    expect(COLORS.backgroundCard).toBe('#1a1a1a');
    expect(COLORS.text).toBe('#ffffff');
    expect(COLORS.textSecondary).toBe('#888888');
    expect(COLORS.textMuted).toBe('#555555');
    expect(COLORS.border).toBe('#2a2a2a');
    expect(COLORS.success).toBe('#00ff88');
    expect(COLORS.surface).toBe('#1a1a1a');
  });

  it('exports COLORS_LIGHT with inverted palette', () => {
    expect(COLORS_LIGHT.background).toBe('#ffffff');
    expect(COLORS_LIGHT.text).toBe('#0a0a0a');
    expect(COLORS_LIGHT.success).toBe(COLORS.success); // Status colors unchanged
  });

  it('exports FONTS with Courier', () => {
    expect(FONTS.mono).toBe('Courier');
    expect(FONTS.monoBold).toBe('700');
  });

  it('spacing returns 4px base unit', () => {
    expect(spacing(1)).toBe(4);
    expect(spacing(6)).toBe(24); // contentPadding on compact
  });

  it('fontSize returns design system values', () => {
    expect(fontSize('body')).toBe(14);
    expect(fontSize('title')).toBe(28);
  });

  it('letterSpacing returns design system values', () => {
    expect(letterSpacing('tight')).toBe(1);
    expect(letterSpacing('hero')).toBe(4);
  });
});
