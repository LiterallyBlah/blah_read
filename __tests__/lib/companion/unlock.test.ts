import {
  READING_TIME_MILESTONES,
  checkReadingTimeUnlocks,
  getNextMilestone,
} from '@/lib/companion';

describe('companionUnlock', () => {
  describe('READING_TIME_MILESTONES', () => {
    it('starts at 30 minutes', () => {
      expect(READING_TIME_MILESTONES[0]).toBe(30 * 60); // 30 min in seconds
    });

    it('has 7 milestones', () => {
      expect(READING_TIME_MILESTONES).toHaveLength(7);
    });

    it('milestones are in ascending order', () => {
      for (let i = 1; i < READING_TIME_MILESTONES.length; i++) {
        expect(READING_TIME_MILESTONES[i]).toBeGreaterThan(READING_TIME_MILESTONES[i - 1]);
      }
    });
  });

  describe('checkReadingTimeUnlocks', () => {
    it('returns empty array when no milestones crossed', () => {
      const result = checkReadingTimeUnlocks(0, 15 * 60); // 0 to 15 min
      expect(result).toEqual([]);
    });

    it('returns milestone index when first milestone crossed', () => {
      const result = checkReadingTimeUnlocks(0, 35 * 60); // 0 to 35 min
      expect(result).toContain(0); // First milestone (30 min)
    });

    it('returns multiple indices when multiple milestones crossed', () => {
      const result = checkReadingTimeUnlocks(0, 3 * 60 * 60); // 0 to 3 hours
      expect(result).toContain(0); // 30 min
      expect(result).toContain(1); // 1 hour
      expect(result).toContain(2); // 2 hours
    });

    it('does not return already-passed milestones', () => {
      const result = checkReadingTimeUnlocks(2 * 60 * 60, 4 * 60 * 60); // 2hr to 4hr
      expect(result).not.toContain(0); // 30 min already passed
      expect(result).not.toContain(1); // 1 hour already passed
      expect(result).toContain(3); // 3.5 hours
    });
  });

  describe('getNextMilestone', () => {
    it('returns first milestone when no time read', () => {
      const result = getNextMilestone(0);
      expect(result).toEqual({
        index: 0,
        timeSeconds: 30 * 60,
        timeRemaining: 30 * 60,
      });
    });

    it('returns next milestone based on current time', () => {
      const result = getNextMilestone(45 * 60); // 45 min read
      expect(result?.index).toBe(1); // Next is 1 hour
      expect(result?.timeRemaining).toBe(15 * 60); // 15 min to go
    });

    it('returns null when all milestones passed', () => {
      const result = getNextMilestone(15 * 60 * 60); // 15 hours
      expect(result).toBeNull();
    });
  });
});
