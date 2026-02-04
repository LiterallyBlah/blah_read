import { useState, useRef, useCallback, useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { timerPersistence, PersistedTimerState } from '@/lib/timerPersistence';
import { backgroundService } from '@/lib/shared/backgroundService';
import { storage } from '@/lib/storage';

const HEARTBEAT_INTERVAL = 30000; // 30 seconds

interface UseTimerOptions {
  bookId?: string;
}

export function useTimer(options: UseTimerOptions = {}) {
  const { bookId } = options;
  const [elapsed, setElapsed] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const heartbeatRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(0);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);
  // Use ref to avoid stale closure in AppState handler
  const isRunningRef = useRef(isRunning);
  isRunningRef.current = isRunning;

  // Persist state whenever running state changes
  const persistState = useCallback(async (running: boolean, currentElapsed: number) => {
    if (!bookId) return;

    if (running) {
      const state: PersistedTimerState = {
        bookId,
        startTimestamp: startTimeRef.current,
        pausedElapsed: 0,
        isRunning: true,
        lastHeartbeat: Date.now(),
      };
      await timerPersistence.save(state);
      await backgroundService.start(bookId);
    } else if (currentElapsed > 0) {
      // Paused with time accumulated
      const state: PersistedTimerState = {
        bookId,
        startTimestamp: startTimeRef.current,
        pausedElapsed: currentElapsed,
        isRunning: false,
        lastHeartbeat: Date.now(),
      };
      await timerPersistence.save(state);
    }
  }, [bookId]);

  const start = useCallback(() => {
    if (isRunning) return;
    startTimeRef.current = Date.now() - elapsed * 1000;
    setIsRunning(true);
    persistState(true, elapsed);
    // Track this as the last active book for home screen card deck ordering
    if (bookId) {
      storage.setLastActiveBookId(bookId);
    }
  }, [isRunning, elapsed, persistState, bookId]);

  const pause = useCallback(() => {
    setIsRunning(false);
    persistState(false, elapsed);
  }, [elapsed, persistState]);

  const reset = useCallback(async () => {
    setIsRunning(false);
    setElapsed(0);
    await timerPersistence.clear();
    await backgroundService.stop();
  }, []);

  // Restore state from persistence on mount
  useEffect(() => {
    async function restoreState() {
      if (!bookId) return;

      const saved = await timerPersistence.load();
      if (saved && saved.bookId === bookId) {
        if (saved.isRunning) {
          // Calculate elapsed from saved start timestamp
          const currentElapsed = Math.floor((Date.now() - saved.startTimestamp) / 1000);
          setElapsed(currentElapsed);
          startTimeRef.current = saved.startTimestamp;
          setIsRunning(true);
        } else if (saved.pausedElapsed > 0) {
          setElapsed(saved.pausedElapsed);
        }
      }
    }
    restoreState();
  }, [bookId]);

  // Timer tick interval
  useEffect(() => {
    if (isRunning) {
      intervalRef.current = setInterval(() => {
        setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
      }, 1000);
    } else if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [isRunning]);

  // Heartbeat interval for persistence
  useEffect(() => {
    if (isRunning) {
      heartbeatRef.current = setInterval(() => {
        timerPersistence.updateHeartbeat(Date.now());
      }, HEARTBEAT_INTERVAL);
    } else if (heartbeatRef.current) {
      clearInterval(heartbeatRef.current);
    }
    return () => {
      if (heartbeatRef.current) clearInterval(heartbeatRef.current);
    };
  }, [isRunning]);

  // Handle app state changes - uses isRunningRef to avoid stale closure
  useEffect(() => {
    const subscription = AppState.addEventListener('change', async (nextAppState) => {
      if (appStateRef.current === 'active' && nextAppState.match(/inactive|background/)) {
        // App going to background - save current state
        if (isRunningRef.current) {
          await timerPersistence.updateHeartbeat(Date.now());
        }
      } else if (appStateRef.current.match(/inactive|background/) && nextAppState === 'active') {
        // App coming to foreground - recalculate elapsed if running
        if (isRunningRef.current && startTimeRef.current > 0) {
          setElapsed(Math.floor((Date.now() - startTimeRef.current) / 1000));
        }
      }
      appStateRef.current = nextAppState;
    });

    return () => {
      subscription.remove();
    };
  }, []); // No isRunning dependency - using ref instead

  return { elapsed, isRunning, start, pause, reset };
}
