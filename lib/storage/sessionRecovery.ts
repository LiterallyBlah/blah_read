// lib/storage/sessionRecovery.ts
import { timerPersistence, PersistedTimerState } from './timerPersistence';
import { storage } from './storage';
import { TimerRecoveryData } from '../shared';

export function buildRecoveryData(
  state: PersistedTimerState,
  bookTitle: string
): TimerRecoveryData {
  const elapsedAtInterruption = Math.floor(
    (state.lastHeartbeat - state.startTimestamp) / 1000
  );
  const totalElapsedIfContinued = Math.floor(
    (Date.now() - state.startTimestamp) / 1000
  );

  return {
    bookId: state.bookId,
    bookTitle,
    elapsedAtInterruption,
    totalElapsedIfContinued,
    interruptedAt: state.lastHeartbeat,
  };
}

export async function checkForInterruptedSession(): Promise<TimerRecoveryData | null> {
  const isInterrupted = await timerPersistence.isInterrupted();
  if (!isInterrupted) {
    return null;
  }

  const state = await timerPersistence.load();
  if (!state) {
    return null;
  }

  const books = await storage.getBooks();
  const book = books.find(b => b.id === state.bookId);

  if (!book) {
    // Book was deleted, clear the stale timer state
    await timerPersistence.clear();
    return null;
  }

  return buildRecoveryData(state, book.title);
}
