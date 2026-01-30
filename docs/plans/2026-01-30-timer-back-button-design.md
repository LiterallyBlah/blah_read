# Timer Back Button & Edit Functionality Design

## Overview

Add a back button to the timer page that auto-pauses the session when leaving, with a dialog informing the user. Also add the ability to edit/adjust the elapsed time directly on the timer page.

## Problem

1. Timer page has no back button - users are stuck until they end the session
2. If users could leave with timer running, they might forget and accumulate incorrect time
3. No way to correct elapsed time if user left timer running too long

## Solution

### Back Button & Auto-Pause

When user taps the back button on the timer page:
1. Timer automatically pauses
2. Dialog appears: "Timer paused. Return from home to resume."
3. Buttons: "Stay" / "Got it"
4. If "Got it": Navigate back to home
5. Home page shows "[ resume session ]" instead of "[ start reading ]"

**Navigation Flow:**
```
Timer Page (running)
  → User taps "< back"
  → Timer auto-pauses
  → Dialog shown
  → "Got it" → Navigate home
  → Home shows "[ resume session ]"
  → Tap → Returns to paused timer
```

### Timer Edit Functionality

Allow users to adjust elapsed time with simple +/- buttons:

**UI:**
- "edit" link below timer display (toggles edit mode)
- When in edit mode, show adjustment buttons: `[-1h]` `[-5m]` `[+5m]` `[+1h]`
- "done" link to exit edit mode
- Time cannot go below 0:00

**Layout:**
```
[book cover]

book title_

active bonuses: ...

    01:23:45          <-- large timer display
      edit            <-- toggles edit mode

[-1h] [-5m]  [+5m] [+1h]   <-- only visible in edit mode
         done              <-- only visible in edit mode

  [ start ]   [ end ]

  forgot to track?
```

## Files Affected

- `app/timer/[bookId].tsx` - Back button, dialog, edit mode UI
- `app/(tabs)/index.tsx` - Check for paused session, update button text
- `hooks/useTimer.ts` - Minor adjustments if needed for pause-on-leave

## Implementation Details

### Timer Page Changes

**Back button:**
- Add `< back` Pressable at top, matching existing pattern from book detail page
- On press: if timer running, pause and show dialog
- If already paused or at 0:00, navigate immediately

**Dialog:**
- Use React Native Alert
- Title: "Timer paused"
- Message: "Return from home to resume."
- Buttons: "Stay" (dismiss), "Got it" (router.back())

**Edit mode state:**
```tsx
const [editMode, setEditMode] = useState(false);
const [timeAdjustment, setTimeAdjustment] = useState(0); // seconds
```

**Displayed time:** `elapsed + timeAdjustment`

**Adjustment logic:**
- `[-1h]` → `setTimeAdjustment(prev => Math.max(-elapsed, prev - 3600))`
- `[-5m]` → `setTimeAdjustment(prev => Math.max(-elapsed, prev - 300))`
- `[+5m]` → `setTimeAdjustment(prev => prev + 300)`
- `[+1h]` → `setTimeAdjustment(prev => prev + 3600)`

Clamping ensures `elapsed + timeAdjustment >= 0`.

### Home Page Changes

**On mount/focus:**
```tsx
const [pausedSession, setPausedSession] = useState<PersistedTimerState | null>(null);

useFocusEffect(
  useCallback(() => {
    async function checkPausedSession() {
      const state = await timerPersistence.load();
      if (state && !state.isRunning && state.pausedElapsed > 0) {
        setPausedSession(state);
      } else {
        setPausedSession(null);
      }
    }
    checkPausedSession();
  }, [])
);
```

**Button text:**
```tsx
<Text style={styles.startButton}>
  {pausedSession && pausedSession.bookId === currentBook.id
    ? '[ resume session ]'
    : '[ start reading ]'}
</Text>
```

### Background Service

- Remains unchanged
- Still useful when user stays on timer page but locks phone
- Auto-pause on leave means background service is less critical for navigation scenarios

## Edge Cases

1. **Timer at 0:00, user taps back** - Navigate immediately, no dialog needed
2. **Timer paused, user taps back** - Navigate immediately, no dialog needed
3. **Edit brings time below 0** - Clamp to 0:00
4. **Paused session for different book** - Home shows "start reading" for current book, paused session ignored
5. **User force-quits app while on timer** - Existing session recovery handles this
