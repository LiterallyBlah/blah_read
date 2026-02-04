// __tests__/lib/storage/sessionRecovery.test.ts

// Mock timerPersistence and storage modules before importing
const mockTimerPersistence = {
  load: jest.fn(),
  isInterrupted: jest.fn(),
  clear: jest.fn(),
};

const mockStorage = {
  getBooks: jest.fn(),
};

// Mock the internal dependencies of sessionRecovery
jest.mock('@/lib/storage/timerPersistence', () => ({
  timerPersistence: mockTimerPersistence,
}));

jest.mock('@/lib/storage/storage', () => ({
  storage: mockStorage,
}));

import { checkForInterruptedSession, buildRecoveryData, PersistedTimerState } from '@/lib/storage';

describe('sessionRecovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkForInterruptedSession', () => {
    it('returns null when no interrupted session', async () => {
      mockTimerPersistence.isInterrupted.mockResolvedValue(false);

      const result = await checkForInterruptedSession();

      expect(result).toBeNull();
    });

    it('returns recovery data when session was interrupted', async () => {
      const savedState: PersistedTimerState = {
        bookId: 'book-123',
        startTimestamp: Date.now() - 3600000, // 1 hour ago
        pausedElapsed: 0,
        isRunning: true,
        lastHeartbeat: Date.now() - 120000, // 2 minutes ago
      };
      mockTimerPersistence.isInterrupted.mockResolvedValue(true);
      mockTimerPersistence.load.mockResolvedValue(savedState);
      mockStorage.getBooks.mockResolvedValue([
        { id: 'book-123', title: 'Test Book' },
      ]);

      const result = await checkForInterruptedSession();

      expect(result).not.toBeNull();
      expect(result?.bookId).toBe('book-123');
      expect(result?.bookTitle).toBe('Test Book');
    });

    it('returns null when book not found', async () => {
      const savedState: PersistedTimerState = {
        bookId: 'nonexistent',
        startTimestamp: Date.now() - 3600000,
        pausedElapsed: 0,
        isRunning: true,
        lastHeartbeat: Date.now() - 120000,
      };
      mockTimerPersistence.isInterrupted.mockResolvedValue(true);
      mockTimerPersistence.load.mockResolvedValue(savedState);
      mockStorage.getBooks.mockResolvedValue([]);

      const result = await checkForInterruptedSession();

      expect(result).toBeNull();
      expect(mockTimerPersistence.clear).toHaveBeenCalled();
    });
  });

  describe('buildRecoveryData', () => {
    it('calculates elapsed times correctly', () => {
      const now = Date.now();
      const startTimestamp = now - 3600000; // 1 hour ago
      const lastHeartbeat = now - 300000; // 5 minutes ago

      const state: PersistedTimerState = {
        bookId: 'book-123',
        startTimestamp,
        pausedElapsed: 0,
        isRunning: true,
        lastHeartbeat,
      };

      const result = buildRecoveryData(state, 'Test Book');

      expect(result.elapsedAtInterruption).toBe(3300); // 55 minutes in seconds
      expect(result.totalElapsedIfContinued).toBeGreaterThan(3500); // ~60 minutes
    });
  });
});
