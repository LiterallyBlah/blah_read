// Clean OLED-black focus screen per spec - monochrome typewriter aesthetic
import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useTimer } from '@/hooks/useTimer';
import { storage } from '@/lib/storage';
import { calculateXp } from '@/lib/xp';
import { shouldTriggerLoot, rollLoot } from '@/lib/loot';
import { updateStreak, getDateString } from '@/lib/streak';
import { Book, ReadingSession } from '@/lib/types';
import { COLORS, FONTS, spacing, fontSize, letterSpacing } from '@/lib/theme';

export default function TimerScreen() {
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const [book, setBook] = useState<Book | null>(null);
  const { elapsed, isRunning, start, pause, reset } = useTimer();

  useEffect(() => {
    loadBook();
    activateKeepAwakeAsync();
    return () => deactivateKeepAwake();
  }, []);

  async function loadBook() {
    const books = await storage.getBooks();
    setBook(books.find(b => b.id === bookId) || null);
  }

  function formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }

  async function handleEnd() {
    if (!book || elapsed === 0) return;

    const progress = await storage.getProgress();
    const previousTime = book.totalReadingTime;
    const newTime = previousTime + elapsed;

    // Update streak
    const today = getDateString();
    const streakUpdate = updateStreak(
      progress.lastReadDate,
      today,
      progress.currentStreak,
      progress.longestStreak
    );
    progress.currentStreak = streakUpdate.currentStreak;
    progress.longestStreak = streakUpdate.longestStreak;
    progress.lastReadDate = streakUpdate.lastReadDate;

    // Calculate XP with streak multiplier
    const xp = calculateXp(elapsed, progress.currentStreak);

    // Check for loot (every 60 minutes)
    if (shouldTriggerLoot(previousTime, newTime)) {
      const loot = rollLoot();
      progress.lootItems.push(loot);
    }

    // Save session
    const session: ReadingSession = {
      id: Date.now().toString(),
      bookId: book.id,
      startTime: Date.now() - elapsed * 1000,
      endTime: Date.now(),
      duration: elapsed,
      xpEarned: xp,
    };
    await storage.saveSession(session);

    // Update book
    book.totalReadingTime = newTime;
    book.status = 'reading';
    await storage.saveBook(book);

    // Update progress
    progress.totalXp += xp;
    await storage.saveProgress(progress);

    router.back();
  }

  return (
    <View style={styles.container}>
      {/* Book cover (optional) */}
      {book?.coverUrl && (
        <Image source={{ uri: book.coverUrl }} style={styles.cover} resizeMode="contain" />
      )}

      {/* Book title */}
      <Text style={styles.title}>{book?.title.toLowerCase() || 'loading...'}_</Text>

      {/* Large timer display */}
      <Text style={styles.timer}>{formatTime(elapsed)}</Text>

      {/* Control buttons */}
      <View style={styles.buttons}>
        {!isRunning ? (
          <Pressable style={styles.primaryButton} onPress={start}>
            <Text style={styles.primaryButtonText}>[ start ]</Text>
          </Pressable>
        ) : (
          <Pressable style={styles.secondaryButton} onPress={pause}>
            <Text style={styles.secondaryButtonText}>[pause]</Text>
          </Pressable>
        )}

        <Pressable style={styles.secondaryButton} onPress={handleEnd}>
          <Text style={styles.secondaryButtonText}>[end]</Text>
        </Pressable>
      </View>

      {/* Manual entry link */}
      <Pressable onPress={() => router.push(`/manual-entry?bookId=${bookId}`)}>
        <Text style={styles.manualLink}>forgot to track?</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing(6),
  },
  cover: {
    width: 120,
    height: 180,
    marginBottom: spacing(6),
    opacity: 0.8,
  },
  title: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.mono,
    fontSize: fontSize('body'),
    letterSpacing: letterSpacing('tight'),
    marginBottom: spacing(8),
    textAlign: 'center',
  },
  timer: {
    color: COLORS.text,
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: 72, // Large display per spec
    letterSpacing: letterSpacing('hero'),
  },
  buttons: {
    marginTop: spacing(12),
    gap: spacing(3),
    width: '100%',
    maxWidth: 280,
  },
  // Primary CTA button (from design system CommandButton)
  primaryButton: {
    borderWidth: 1,
    borderColor: COLORS.text,
    paddingVertical: spacing(5), // 20px
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  primaryButtonText: {
    color: COLORS.text,
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: fontSize('large'),
    letterSpacing: letterSpacing('hero'),
  },
  // Secondary button (compact inline control)
  secondaryButton: {
    borderWidth: 1,
    borderColor: COLORS.border,
    paddingVertical: spacing(4), // 16px
    alignItems: 'center',
    backgroundColor: COLORS.background,
  },
  secondaryButtonText: {
    color: COLORS.textSecondary,
    fontFamily: FONTS.mono,
    fontSize: fontSize('body'),
    letterSpacing: letterSpacing('tight'),
  },
  manualLink: {
    color: COLORS.textMuted,
    fontFamily: FONTS.mono,
    fontSize: fontSize('small'),
    letterSpacing: letterSpacing('tight'),
    marginTop: spacing(8),
  },
});
