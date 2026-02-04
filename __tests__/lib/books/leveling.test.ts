import {
  calculateBookLevel,
  calculatePageFloor,
  calculateCompletionBonus,
  processReadingTime,
  SECONDS_PER_LEVEL,
  PAGES_PER_LEVEL,
} from '@/lib/books';

describe('bookLeveling constants', () => {
  it('should have correct SECONDS_PER_LEVEL', () => {
    expect(SECONDS_PER_LEVEL).toBe(3600);
  });

  it('should have correct PAGES_PER_LEVEL', () => {
    expect(PAGES_PER_LEVEL).toBe(30);
  });
});

describe('calculateBookLevel', () => {
  it('should return level 0 for no reading time', () => {
    expect(calculateBookLevel(0)).toBe(0);
  });

  it('should return level 1 after 1 hour', () => {
    expect(calculateBookLevel(3600)).toBe(1);
  });

  it('should return level 5 after 5 hours', () => {
    expect(calculateBookLevel(18000)).toBe(5);
  });

  it('should not count partial hours', () => {
    expect(calculateBookLevel(3599)).toBe(0);
    expect(calculateBookLevel(7199)).toBe(1);
  });
});

describe('calculatePageFloor', () => {
  it('should calculate floor based on page count', () => {
    expect(calculatePageFloor(300)).toBe(10);
    expect(calculatePageFloor(150)).toBe(5);
  });

  it('should return 0 for null page count', () => {
    expect(calculatePageFloor(null)).toBe(0);
  });

  it('should not count partial page blocks', () => {
    expect(calculatePageFloor(29)).toBe(0);
    expect(calculatePageFloor(59)).toBe(1);
  });
});

describe('calculateCompletionBonus', () => {
  it('should award bonus when hourly levels below floor', () => {
    const bonus = calculateCompletionBonus(14400, 300); // 4 hours, 300 pages
    expect(bonus).toBe(6); // floor 10 - level 4 = 6
  });

  it('should award 0 bonus when hourly levels exceed floor', () => {
    const bonus = calculateCompletionBonus(54000, 300); // 15 hours, 300 pages
    expect(bonus).toBe(0); // 15 > 10 floor
  });

  it('should handle null page count', () => {
    const bonus = calculateCompletionBonus(14400, null);
    expect(bonus).toBe(0);
  });

  it('should award 0 bonus when hourly levels equal floor', () => {
    const bonus = calculateCompletionBonus(36000, 300); // 10 hours, 300 pages
    expect(bonus).toBe(0); // floor 10 - level 10 = 0
  });
});

describe('processReadingTime', () => {
  it('should return level change info when no level gained', () => {
    const result = processReadingTime(0, 1800); // 0 + 30 min
    expect(result).toEqual({
      previousLevel: 0,
      newLevel: 0,
      levelsGained: 0,
    });
  });

  it('should return level change info when one level gained', () => {
    const result = processReadingTime(3000, 1000); // 50 min + ~16 min = ~66 min > 60 min
    expect(result).toEqual({
      previousLevel: 0,
      newLevel: 1,
      levelsGained: 1,
    });
  });

  it('should return level change info when multiple levels gained', () => {
    const result = processReadingTime(3600, 7200); // 1 hour + 2 hours = 3 hours
    expect(result).toEqual({
      previousLevel: 1,
      newLevel: 3,
      levelsGained: 2,
    });
  });

  it('should handle starting with existing levels', () => {
    const result = processReadingTime(18000, 3600); // 5 hours + 1 hour = 6 hours
    expect(result).toEqual({
      previousLevel: 5,
      newLevel: 6,
      levelsGained: 1,
    });
  });
});
