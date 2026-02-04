import {
  SLOT_2_POINTS,
  SLOT_3_POINTS,
  createDefaultSlotProgress,
  calculateSlot2Progress,
  calculateSlot3Progress,
  shouldUnlockSlot2,
  shouldUnlockSlot3,
  SlotUnlockProgress,
} from '@/lib/shared';

describe('createDefaultSlotProgress', () => {
  it('should return default progress with all values at zero', () => {
    const progress = createDefaultSlotProgress();
    expect(progress).toEqual({
      slot2Points: 0,
      slot3Points: 0,
      booksFinished: 0,
      hoursLogged: 0,
      companionsCollected: 0,
      sessionsCompleted: 0,
      genreLevelTens: [],
      genresRead: [],
    });
  });
});

describe('calculateSlot2Progress', () => {
  it('should award 50 points for first book finished', () => {
    const progress = createDefaultSlotProgress();
    const points = calculateSlot2Progress({ ...progress, booksFinished: 1 });
    expect(points).toBe(50);
  });

  it('should only count first book for slot 2 (cap at 1)', () => {
    const progress = createDefaultSlotProgress();
    const points = calculateSlot2Progress({ ...progress, booksFinished: 5 });
    expect(points).toBe(50); // Still 50, not 250
  });

  it('should award 15 points per hour logged', () => {
    const progress = createDefaultSlotProgress();
    const points = calculateSlot2Progress({ ...progress, hoursLogged: 2 });
    expect(points).toBe(30);
  });

  it('should award 20 points per companion collected', () => {
    const progress = createDefaultSlotProgress();
    const points = calculateSlot2Progress({ ...progress, companionsCollected: 3 });
    expect(points).toBe(60);
  });

  it('should NOT award points for sessions completed (removed milestone)', () => {
    const progress = createDefaultSlotProgress();
    const points = calculateSlot2Progress({ ...progress, sessionsCompleted: 4 });
    expect(points).toBe(0); // Sessions no longer contribute to slot 2
  });

  it('should sum all milestone points (excluding sessions)', () => {
    const progress = {
      ...createDefaultSlotProgress(),
      booksFinished: 1,       // 50
      hoursLogged: 2,         // 30
      companionsCollected: 2, // 40
      sessionsCompleted: 10,  // 0 (no longer counts)
    };
    const points = calculateSlot2Progress(progress);
    expect(points).toBe(120); // 50 + 30 + 40 = 120
  });

  it('should return 0 for empty progress', () => {
    const progress = createDefaultSlotProgress();
    const points = calculateSlot2Progress(progress);
    expect(points).toBe(0);
  });
});

describe('calculateSlot3Progress', () => {
  it('should use different point values', () => {
    const progress = {
      ...createDefaultSlotProgress(),
      booksFinished: 1, // 40 for slot 3
      hoursLogged: 1,   // 10 for slot 3
    };
    const points = calculateSlot3Progress(progress);
    expect(points).toBe(50);
  });

  it('should count all books finished (not capped like slot 2)', () => {
    const progress = {
      ...createDefaultSlotProgress(),
      booksFinished: 3, // 40 * 3 = 120
    };
    const points = calculateSlot3Progress(progress);
    expect(points).toBe(120);
  });

  it('should award 15 points per companion collected', () => {
    const progress = {
      ...createDefaultSlotProgress(),
      companionsCollected: 2, // 15 * 2 = 30
    };
    const points = calculateSlot3Progress(progress);
    expect(points).toBe(30);
  });

  it('should award 50 points for reaching genre level 10', () => {
    const progress = {
      ...createDefaultSlotProgress(),
      genreLevelTens: ['fantasy'],
    };
    const points = calculateSlot3Progress(progress);
    expect(points).toBe(50);
  });

  it('should award 50 points per genre at level 10', () => {
    const progress = {
      ...createDefaultSlotProgress(),
      genreLevelTens: ['fantasy', 'scifi', 'mystery'],
    };
    const points = calculateSlot3Progress(progress);
    expect(points).toBe(150);
  });

  it('should award 30 points per new genre read', () => {
    const progress = {
      ...createDefaultSlotProgress(),
      genresRead: ['fantasy', 'scifi'],
    };
    const points = calculateSlot3Progress(progress);
    expect(points).toBe(60);
  });

  it('should sum all slot 3 milestone points', () => {
    const progress: SlotUnlockProgress = {
      slot2Points: 0,
      slot3Points: 0,
      booksFinished: 2,             // 40 * 2 = 80
      hoursLogged: 5,               // 10 * 5 = 50
      companionsCollected: 3,       // 15 * 3 = 45
      sessionsCompleted: 0,         // Not counted for slot 3
      genreLevelTens: ['fantasy'],  // 50 * 1 = 50
      genresRead: ['fantasy', 'scifi'], // 30 * 2 = 60
    };
    const points = calculateSlot3Progress(progress);
    expect(points).toBe(285);
  });

  it('should return 0 for empty progress', () => {
    const progress = createDefaultSlotProgress();
    const points = calculateSlot3Progress(progress);
    expect(points).toBe(0);
  });
});

describe('shouldUnlockSlot2', () => {
  it('should return false when below threshold', () => {
    const progress = {
      ...createDefaultSlotProgress(),
      booksFinished: 1, // 50 points, need 100
    };
    expect(shouldUnlockSlot2(progress)).toBe(false);
  });

  it('should return true when at threshold', () => {
    const progress = {
      ...createDefaultSlotProgress(),
      booksFinished: 1,       // 50
      hoursLogged: 2,         // 30
      companionsCollected: 1, // 20
    };
    // Total: 100 points
    expect(shouldUnlockSlot2(progress)).toBe(true);
  });

  it('should return true when above threshold', () => {
    const progress = {
      ...createDefaultSlotProgress(),
      booksFinished: 1,       // 50
      hoursLogged: 4,         // 60
    };
    // Total: 110 points
    expect(shouldUnlockSlot2(progress)).toBe(true);
  });
});

describe('shouldUnlockSlot3', () => {
  it('should return false when below threshold', () => {
    const progress = {
      ...createDefaultSlotProgress(),
      booksFinished: 2, // 80 points, need 300
    };
    expect(shouldUnlockSlot3(progress)).toBe(false);
  });

  it('should return true when at threshold', () => {
    const progress: SlotUnlockProgress = {
      slot2Points: 0,
      slot3Points: 0,
      booksFinished: 3,             // 40 * 3 = 120
      hoursLogged: 5,               // 10 * 5 = 50
      companionsCollected: 4,       // 15 * 4 = 60
      sessionsCompleted: 0,
      genreLevelTens: ['fantasy'],  // 50 * 1 = 50
      genresRead: ['fantasy'],      // 30 * 1 = 30 (total = 310, but let's adjust)
    };
    // Actually: 120 + 50 + 60 + 50 + 30 = 310
    // Let's recalculate for exactly 300:
    const exactProgress: SlotUnlockProgress = {
      slot2Points: 0,
      slot3Points: 0,
      booksFinished: 5,             // 40 * 5 = 200
      hoursLogged: 10,              // 10 * 10 = 100
      companionsCollected: 0,
      sessionsCompleted: 0,
      genreLevelTens: [],
      genresRead: [],
    };
    // Total: 300 points
    expect(shouldUnlockSlot3(exactProgress)).toBe(true);
  });

  it('should return true when above threshold', () => {
    const progress: SlotUnlockProgress = {
      slot2Points: 0,
      slot3Points: 0,
      booksFinished: 5,             // 40 * 5 = 200
      hoursLogged: 10,              // 10 * 10 = 100
      companionsCollected: 2,       // 15 * 2 = 30
      sessionsCompleted: 0,
      genreLevelTens: [],
      genresRead: [],
    };
    // Total: 330 points
    expect(shouldUnlockSlot3(progress)).toBe(true);
  });
});

describe('constants', () => {
  it('should have SLOT_2_POINTS = 100', () => {
    expect(SLOT_2_POINTS).toBe(100);
  });

  it('should have SLOT_3_POINTS = 300', () => {
    expect(SLOT_3_POINTS).toBe(300);
  });
});
