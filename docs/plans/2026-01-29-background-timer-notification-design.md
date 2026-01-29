# Background Timer with Persistent Notification

## Overview

Enable the reading timer to continue tracking time when the app is backgrounded, with a persistent notification on Android and graceful recovery if the app is force-killed.

## Requirements

- Timer continues tracking (via timestamp) when user switches to other apps
- Android: Persistent notification that cannot be swiped away
- iOS: Best-effort with local notification (dismissible, but timer state persists)
- Notification content: "Reading session active" with tap-to-return
- Tapping notification returns directly to timer screen
- Recovery flow when app is force-killed during active session

## Architecture

### Core Approach: Timestamp-Based Timer

The timer stores its start timestamp rather than counting seconds. Elapsed time is calculated as `now - startTimestamp + pausedElapsed`.

### Components

1. **TimerStateStorage** - Persists timer state to AsyncStorage
2. **BackgroundService (Android)** - Native foreground service with persistent notification
3. **BackgroundMode (iOS)** - State persistence only, local notification on background
4. **RecoveryDetector** - Checks for interrupted sessions on app launch

## Data Model

```typescript
interface PersistedTimerState {
  bookId: string;
  startTimestamp: number;    // Date.now() when timer started
  pausedElapsed: number;     // accumulated time if paused before backgrounding
  isRunning: boolean;
  lastHeartbeat: number;     // updated every 30s while app is foregrounded
}
```

Storage key: `blahread:timerState`

## Android Implementation

### Foreground Service

- **Channel:** "Reading Session" (created on app startup)
- **Priority:** Low (persistent but not intrusive)
- **Content:** "Reading session active"
- **Icon:** App icon
- **Tap action:** Deep link to `/timer/[bookId]`
- **Ongoing:** `true` (non-dismissible)

### Service Lifecycle

```
Timer starts → Start foreground service → Show notification
Timer pauses → Keep service running (still in session)
Timer stops/Session ends → Stop service → Dismiss notification
App backgrounded → Service keeps running (notification visible)
App returns → Service still running, UI reconnects
```

### Permissions Required

- `FOREGROUND_SERVICE`
- `POST_NOTIFICATIONS` (Android 13+)

## iOS Implementation

### Approach: Persistence Only

No background mode workarounds (silent audio, location). iOS is more restrictive, and abusing background modes risks App Store rejection.

### Behavior

1. Save timer state to AsyncStorage on `AppState` change to "background"
2. Show local notification: "Reading session active - tap to return"
3. On return, calculate elapsed time from stored timestamp

### User Experience Difference

- Android: Persistent notification in notification bar
- iOS: Notification appears but can be dismissed; timer still recovers correctly

## Recovery Flow

### Trigger Condition

On app launch: `isRunning === true && (now - lastHeartbeat) > 60 seconds`

### Recovery Modal

```
┌─────────────────────────────────────────┐
│                                         │
│   Session Interrupted                   │
│                                         │
│   You were reading "Book Title"         │
│   Last recorded: 45 minutes             │
│   Time since interrupted: 2 hours       │
│                                         │
│   ┌─────────────────────────────────┐   │
│   │  Continue Reading               │   │
│   │  (Assumes you read the full     │   │
│   │   2h 45m since starting)        │   │
│   └─────────────────────────────────┘   │
│                                         │
│   ┌─────────────────────────────────┐   │
│   │  Save 45 Minutes                │   │
│   │  (Save time at interruption)    │   │
│   └─────────────────────────────────┘   │
│                                         │
│   ┌─────────────────────────────────┐   │
│   │  Discard Session                │   │
│   └─────────────────────────────────┘   │
│                                         │
└─────────────────────────────────────────┘
```

### Option Behaviors

1. **Continue Reading** - Navigate to timer screen with full elapsed time, timer resumes
2. **Save X Minutes** - End session with cut-off duration, process rewards
3. **Discard** - Clear timer state, no session saved

## Implementation Plan

### New Files

| File | Purpose |
|------|---------|
| `lib/timerPersistence.ts` | Save/load/clear timer state from AsyncStorage |
| `lib/backgroundService.ts` | Platform-agnostic API to start/stop background service |
| `android/app/src/.../ForegroundService.java` | Native Android foreground service |
| `components/SessionRecoveryModal.tsx` | Recovery UI modal |

### Files to Modify

| File | Changes |
|------|---------|
| `hooks/useTimer.ts` | Add persistence calls, heartbeat updates |
| `app/timer/[bookId].tsx` | Start/stop background service on timer state changes |
| `app/_layout.tsx` | Check for interrupted session on app launch |
| `app.json` | Add Android foreground service permission |
| `android/app/src/main/AndroidManifest.xml` | Declare foreground service |

### Dependencies

- `react-native-foreground-service` or custom native module for Android

## Platform Behavior Summary

| Scenario | Android | iOS |
|----------|---------|-----|
| App backgrounded | Foreground service runs, persistent notification | State saved, local notification shown |
| Notification tap | Returns to timer screen | Returns to timer screen |
| Notification dismiss | Cannot dismiss | Can dismiss, timer still persists |
| Force kill | Recovery flow on next launch | Recovery flow on next launch |
| Normal session end | Service stopped, notification dismissed | Notification cleared |
