# Timer Back Button & Edit Functionality Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Add a back button to the timer page that auto-pauses the session when leaving, plus time editing capability with +/- buttons.

**Architecture:** Modify timer page to include back button at top and edit mode toggle with adjustment buttons. Home page checks for paused sessions on focus and updates button text accordingly.

**Tech Stack:** React Native, Expo Router, AsyncStorage (via existing timerPersistence)

---

### Task 1: Add Back Button to Timer Page

**Files:**
- Modify: `app/timer/[bookId].tsx`

**Step 1: Add Alert import**

At the top of the file, add `Alert` to the React Native imports:

```tsx
import { View, Text, Pressable, StyleSheet, Image, Alert } from 'react-native';
```

**Step 2: Add handleBack function**

Add this function after `handleEnd` (around line 318), before `formatActiveEffects`:

```tsx
function handleBack() {
  if (isRunning) {
    pause();
    Alert.alert(
      'Timer paused',
      'Return from home to resume.',
      [
        { text: 'Stay', style: 'cancel' },
        { text: 'Got it', onPress: () => router.back() },
      ]
    );
  } else {
    router.back();
  }
}
```

**Step 3: Add back button JSX**

Inside the return statement, add the back button as the first child of the container View (after `<View style={styles.container}>`):

```tsx
{/* Back button */}
<Pressable style={styles.backButton} onPress={handleBack}>
  <Text style={styles.backText}>{'<'} back</Text>
</Pressable>
```

**Step 4: Add back button styles**

Add these styles to the `createStyles` function (after `container`):

```tsx
backButton: {
  position: 'absolute',
  top: spacing(16),
  left: spacing(6),
},
backText: {
  color: colors.textSecondary,
  fontFamily: FONTS.mono,
  fontSize: fontSize('body'),
},
```

**Step 5: Test manually**

- Navigate to timer page
- Verify back button appears at top left
- With timer stopped: tap back → should navigate immediately
- With timer running: tap back → should pause timer, show dialog
- Tap "Stay" → dialog dismisses, stay on page
- Tap "Got it" → navigates to home

**Step 6: Commit**

```bash
git add app/timer/[bookId].tsx
git commit -m "feat(timer): add back button with auto-pause dialog"
```

---

### Task 2: Add Edit Mode State and Toggle

**Files:**
- Modify: `app/timer/[bookId].tsx`

**Step 1: Add edit mode state**

After the existing useState declarations (around line 34), add:

```tsx
const [editMode, setEditMode] = useState(false);
const [timeAdjustment, setTimeAdjustment] = useState(0);
```

**Step 2: Calculate display time**

After the `formatTime` function, add a computed value for display time:

```tsx
const displayTime = Math.max(0, elapsed + timeAdjustment);
```

**Step 3: Update timer display to use displayTime**

Change the timer text (around line 369) from:

```tsx
{formatTime(elapsed)}
```

To:

```tsx
{formatTime(displayTime)}
```

**Step 4: Add edit toggle link below timer**

After the timer Text element, add:

```tsx
{/* Edit toggle */}
<Pressable onPress={() => setEditMode(!editMode)}>
  <Text style={styles.editLink}>{editMode ? 'done' : 'edit'}</Text>
</Pressable>
```

**Step 5: Add edit link style**

Add this style to `createStyles`:

```tsx
editLink: {
  color: colors.textMuted,
  fontFamily: FONTS.mono,
  fontSize: fontSize('small'),
  marginTop: spacing(2),
},
```

**Step 6: Test manually**

- Verify "edit" link appears below timer
- Tap "edit" → text changes to "done"
- Tap "done" → text changes back to "edit"

**Step 7: Commit**

```bash
git add app/timer/[bookId].tsx
git commit -m "feat(timer): add edit mode toggle"
```

---

### Task 3: Add Time Adjustment Buttons

**Files:**
- Modify: `app/timer/[bookId].tsx`

**Step 1: Add adjustment handler functions**

After the `displayTime` calculation, add:

```tsx
function adjustTime(seconds: number) {
  setTimeAdjustment(prev => {
    const newAdjustment = prev + seconds;
    // Ensure total time doesn't go below 0
    if (elapsed + newAdjustment < 0) {
      return -elapsed;
    }
    return newAdjustment;
  });
}
```

**Step 2: Add adjustment buttons JSX**

After the edit toggle Pressable, add the adjustment buttons (only visible in edit mode):

```tsx
{/* Adjustment buttons - only visible in edit mode */}
{editMode && (
  <View style={styles.adjustmentContainer}>
    <View style={styles.adjustmentRow}>
      <Pressable style={styles.adjustButton} onPress={() => adjustTime(-3600)}>
        <Text style={styles.adjustButtonText}>[-1h]</Text>
      </Pressable>
      <Pressable style={styles.adjustButton} onPress={() => adjustTime(-300)}>
        <Text style={styles.adjustButtonText}>[-5m]</Text>
      </Pressable>
      <Pressable style={styles.adjustButton} onPress={() => adjustTime(300)}>
        <Text style={styles.adjustButtonText}>[+5m]</Text>
      </Pressable>
      <Pressable style={styles.adjustButton} onPress={() => adjustTime(3600)}>
        <Text style={styles.adjustButtonText}>[+1h]</Text>
      </Pressable>
    </View>
  </View>
)}
```

**Step 3: Add adjustment button styles**

Add these styles to `createStyles`:

```tsx
adjustmentContainer: {
  marginTop: spacing(4),
  alignItems: 'center',
},
adjustmentRow: {
  flexDirection: 'row',
  gap: spacing(2),
},
adjustButton: {
  paddingVertical: spacing(2),
  paddingHorizontal: spacing(3),
},
adjustButtonText: {
  color: colors.textSecondary,
  fontFamily: FONTS.mono,
  fontSize: fontSize('body'),
},
```

**Step 4: Test manually**

- Enter edit mode
- Verify all 4 buttons appear: [-1h] [-5m] [+5m] [+1h]
- Tap [+5m] → timer display increases by 5 minutes
- Tap [-5m] → timer display decreases by 5 minutes
- Tap [-1h] repeatedly → timer should not go below 00:00:00
- Exit edit mode → buttons disappear

**Step 5: Commit**

```bash
git add app/timer/[bookId].tsx
git commit -m "feat(timer): add time adjustment buttons"
```

---

### Task 4: Use Adjusted Time in Session End

**Files:**
- Modify: `app/timer/[bookId].tsx`

**Step 1: Update handleEnd to use adjusted time**

In the `handleEnd` function, replace all occurrences of `elapsed` with `displayTime`. The key changes:

Near the top of handleEnd (around line 96), change:

```tsx
if (!book || elapsed === 0) return;
```

To:

```tsx
const finalTime = Math.max(0, elapsed + timeAdjustment);
if (!book || finalTime === 0) return;
```

Then replace all remaining `elapsed` references in `handleEnd` with `finalTime`:

- Line ~108: `elapsed,` → `finalTime,` (in debug.log)
- Line ~133: `elapsed,` → `finalTime,` (in processSessionEnd)
- Line ~209: `duration: elapsed,` → `duration: finalTime,`
- Line ~209: `startTime: Date.now() - elapsed * 1000,` → `startTime: Date.now() - finalTime * 1000,`
- Line ~224: `elapsed` → `finalTime` (in processReadingSession)
- Line ~288: `elapsed,` → `finalTime,` (in buildSessionResultsData)

**Step 2: Test manually**

- Start a timer, let it run for 1 minute
- Enter edit mode, add +5 minutes
- Tap [end]
- Verify the session results show ~6 minutes of reading time

**Step 3: Commit**

```bash
git add app/timer/[bookId].tsx
git commit -m "feat(timer): use adjusted time for session end calculations"
```

---

### Task 5: Update Home Page to Show Resume Session

**Files:**
- Modify: `app/(tabs)/index.tsx`

**Step 1: Add timerPersistence import**

Add this import near the top:

```tsx
import { timerPersistence, PersistedTimerState } from '@/lib/timerPersistence';
```

**Step 2: Add paused session state**

After the existing useState declarations (around line 16), add:

```tsx
const [pausedSession, setPausedSession] = useState<PersistedTimerState | null>(null);
```

**Step 3: Check for paused session in loadData**

Update the `loadData` function to also check for paused sessions:

```tsx
async function loadData() {
  const books = await storage.getBooks();
  const reading = books.find(b => b.status === 'reading');
  setCurrentBook(reading || null);
  setProgress(await storage.getProgress());

  // Check for paused timer session
  const timerState = await timerPersistence.load();
  if (timerState && !timerState.isRunning && timerState.pausedElapsed > 0) {
    setPausedSession(timerState);
  } else {
    setPausedSession(null);
  }
}
```

**Step 4: Update button text**

Change the start button text (around line 97) from:

```tsx
<Text style={styles.startButton}>[ start reading ]</Text>
```

To:

```tsx
<Text style={styles.startButton}>
  {pausedSession && currentBook && pausedSession.bookId === currentBook.id
    ? '[ resume session ]'
    : '[ start reading ]'}
</Text>
```

**Step 5: Test manually**

- Start a reading session
- Tap back button, confirm with "Got it"
- Verify home page shows "[ resume session ]"
- Tap "[ resume session ]"
- Verify timer page shows the paused time
- End the session
- Verify home page shows "[ start reading ]" again

**Step 6: Commit**

```bash
git add app/(tabs)/index.tsx
git commit -m "feat(home): show resume session when timer is paused"
```

---

### Task 6: Final Testing & Polish

**Files:**
- All modified files

**Step 1: Full flow test**

1. From home, tap "[ start reading ]"
2. Tap [ start ] to begin timing
3. Let it run for 30 seconds
4. Tap back button → should see dialog
5. Tap "Stay" → should stay on timer page, timer still paused
6. Tap [ start ] to resume
7. Tap back button again
8. Tap "Got it" → should go to home
9. Verify home shows "[ resume session ]"
10. Tap "[ resume session ]" → should return to timer with time preserved
11. Enter edit mode, adjust time
12. Tap [ end ] → verify adjusted time is used

**Step 2: Edge case tests**

- Timer at 00:00:00, tap back → should navigate immediately (no dialog)
- Timer paused with time, tap back → should navigate immediately (no dialog)
- In edit mode, reduce time below 0 → should clamp to 00:00:00
- Switch to different book → home should show "[ start reading ]" not "[ resume session ]"

**Step 3: Commit any final fixes**

```bash
git add -A
git commit -m "fix(timer): polish edge cases"
```
