// __tests__/lib/sessionRecovery.test.ts
import { checkForInterruptedSession, buildRecoveryData } from '@/lib/sessionRecovery';
import { timerPersistence, PersistedTimerState } from '@/lib/timerPersistence';
import { storage } from '@/lib/storage';

jest.mock('@/lib/timerPersistence', () => ({
  timerPersistence: {
    load: jest.fn(),
    isInterrupted: jest.fn(),
    clear: jest.fn(),
  },
}));

jest.mock('@/lib/storage', () => ({
  storage: {
    getBooks: jest.fn(),
  },
}));

describe('sessionRecovery', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkForInterruptedSession', () => {
    it('returns null when no interrupted session', async () => {
      (timerPersistence.isInterrupted as jest.Mock).mockResolvedValue(false);

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
      (timerPersistence.isInterrupted as jest.Mock).mockResolvedValue(true);
      (timerPersistence.load as jest.Mock).mockResolvedValue(savedState);
      (storage.getBooks as jest.Mock).mockResolvedValue([
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
      (timerPersistence.isInterrupted as jest.Mock).mockResolvedValue(true);
      (timerPersistence.load as jest.Mock).mockResolvedValue(savedState);
      (storage.getBooks as jest.Mock).mockResolvedValue([]);

      const result = await checkForInterruptedSession();

      expect(result).toBeNull();
      expect(timerPersistence.clear).toHaveBeenCalled();
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
