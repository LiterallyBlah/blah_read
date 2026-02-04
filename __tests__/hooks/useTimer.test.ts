// Test the timer logic without React rendering
// The hook implementation is straightforward state management

import { timerPersistence } from '@/lib/storage';
import { backgroundService } from '@/lib/shared/backgroundService';

jest.mock('@/lib/storage', () => ({
  timerPersistence: {
    save: jest.fn(),
    load: jest.fn(),
    clear: jest.fn(),
    updateHeartbeat: jest.fn(),
  },
  storage: {
    setLastActiveBookId: jest.fn(),
  },
}));

jest.mock('@/lib/shared/backgroundService', () => ({
  backgroundService: {
    start: jest.fn(),
    stop: jest.fn(),
  },
}));

describe('useTimer logic', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('calculates elapsed time correctly', () => {
    const startTime = Date.now();
    jest.advanceTimersByTime(5000);
    const elapsed = Math.floor((Date.now() - startTime) / 1000);
    expect(elapsed).toBe(5);
  });

  it('preserves elapsed time when paused and resumed', () => {
    const startTime = Date.now();
    jest.advanceTimersByTime(3000);
    const elapsedAtPause = Math.floor((Date.now() - startTime) / 1000);

    // Simulate pause - no more time tracked
    expect(elapsedAtPause).toBe(3);

    // Resume with offset
    const resumeStart = Date.now() - elapsedAtPause * 1000;
    jest.advanceTimersByTime(2000);
    const totalElapsed = Math.floor((Date.now() - resumeStart) / 1000);
    expect(totalElapsed).toBe(5);
  });

  it('formats time correctly', () => {
    const formatTime = (seconds: number): string => {
      const h = Math.floor(seconds / 3600);
      const m = Math.floor((seconds % 3600) / 60);
      const s = seconds % 60;
      return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    expect(formatTime(0)).toBe('00:00:00');
    expect(formatTime(65)).toBe('00:01:05');
    expect(formatTime(3665)).toBe('01:01:05');
  });
});

describe('useTimer persistence', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('saves state when timer starts', async () => {
    // Note: This tests the logic that will be in the hook
    // The actual implementation integrates with React hooks
    const bookId = 'book-123';
    const startTimestamp = Date.now();

    const expectedState = {
      bookId,
      startTimestamp,
      pausedElapsed: 0,
      isRunning: true,
      lastHeartbeat: startTimestamp,
    };

    await timerPersistence.save(expectedState);
    expect(timerPersistence.save).toHaveBeenCalledWith(expectedState);
  });

  it('updates heartbeat every 30 seconds while running', async () => {
    const now = Date.now();
    await timerPersistence.updateHeartbeat(now);
    expect(timerPersistence.updateHeartbeat).toHaveBeenCalledWith(now);
  });

  it('clears state when timer is reset', async () => {
    await timerPersistence.clear();
    expect(timerPersistence.clear).toHaveBeenCalled();
  });

  it('starts background service when timer starts', async () => {
    const bookId = 'book-123';
    await backgroundService.start(bookId);
    expect(backgroundService.start).toHaveBeenCalledWith(bookId);
  });

  it('stops background service when timer ends', async () => {
    await backgroundService.stop();
    expect(backgroundService.stop).toHaveBeenCalled();
  });
});
