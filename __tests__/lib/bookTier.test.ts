import { getBookTier, getTierGlow, getTierColorKey } from '@/lib/bookTier';

describe('getBookTier', () => {
  it('returns common for levels 1-3', () => {
    expect(getBookTier(1)).toBe('common');
    expect(getBookTier(2)).toBe('common');
    expect(getBookTier(3)).toBe('common');
  });

  it('returns rare for levels 4-6', () => {
    expect(getBookTier(4)).toBe('rare');
    expect(getBookTier(5)).toBe('rare');
    expect(getBookTier(6)).toBe('rare');
  });

  it('returns legendary for level 7+', () => {
    expect(getBookTier(7)).toBe('legendary');
    expect(getBookTier(10)).toBe('legendary');
    expect(getBookTier(99)).toBe('legendary');
  });

  it('handles edge case of level 0 as common', () => {
    expect(getBookTier(0)).toBe('common');
  });
});

describe('getTierGlow', () => {
  it('returns no glow for common tier', () => {
    const glow = getTierGlow('common');
    expect(glow.shadowRadius).toBe(0);
    expect(glow.shadowOpacity).toBe(0);
    expect(glow.elevation).toBe(0);
  });

  it('returns medium glow for rare tier', () => {
    const glow = getTierGlow('rare');
    expect(glow.shadowRadius).toBe(8);
    expect(glow.shadowOpacity).toBe(0.5);
    expect(glow.elevation).toBe(4);
  });

  it('returns strong glow for legendary tier', () => {
    const glow = getTierGlow('legendary');
    expect(glow.shadowRadius).toBe(12);
    expect(glow.shadowOpacity).toBe(0.8);
    expect(glow.elevation).toBe(8);
  });
});

describe('getTierColorKey', () => {
  it('returns rarityCommon for common tier', () => {
    expect(getTierColorKey('common')).toBe('rarityCommon');
  });

  it('returns rarityRare for rare tier', () => {
    expect(getTierColorKey('rare')).toBe('rarityRare');
  });

  it('returns rarityLegendary for legendary tier', () => {
    expect(getTierColorKey('legendary')).toBe('rarityLegendary');
  });
});
