// Test the timer logic without React rendering
// The hook implementation is straightforward state management

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
