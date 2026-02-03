import { useState, useCallback } from 'react';
import {
  useSharedValue,
  withTiming,
  withSequence,
  Easing,
} from 'react-native-reanimated';

// Timeline events in milliseconds
export const TIMELINE = {
  SHAKE_START: 0,
  SHAKE_END: 400,
  CHEST_OPEN: 400,
  PARTICLES_START: 400,
  ITEM_RISE_START: 500,
  ITEM_RISE_END: 800,
  GLOW_START: 600,
  NAME_FADE_IN: 800,
  DETAILS_FADE_IN: 1000,
  BUTTONS_FADE_IN: 1200,
  TOTAL_DURATION: 1200,
} as const;

export type RevealState = 'idle' | 'shaking' | 'revealing' | 'complete';

export function useRevealTimeline() {
  const [state, setState] = useState<RevealState>('idle');
  const progress = useSharedValue(0);

  const start = useCallback(() => {
    setState('shaking');

    // Animate progress from 0 to 1 over the total duration
    progress.value = withSequence(
      // Shake phase (0 to 0.33 over 400ms)
      withTiming(TIMELINE.SHAKE_END / TIMELINE.TOTAL_DURATION, {
        duration: TIMELINE.SHAKE_END,
        easing: Easing.linear,
      }),
      // Reveal phase (0.33 to 1 over remaining time)
      withTiming(1, {
        duration: TIMELINE.TOTAL_DURATION - TIMELINE.SHAKE_END,
        easing: Easing.out(Easing.quad),
      })
    );

    // Update state at key points
    setTimeout(() => {
      setState('revealing');
    }, TIMELINE.SHAKE_END);

    setTimeout(() => {
      setState('complete');
    }, TIMELINE.TOTAL_DURATION);
  }, []);

  const reset = useCallback(() => {
    progress.value = 0;
    setState('idle');
  }, []);

  return {
    state,
    progress,
    start,
    reset,
  };
}
