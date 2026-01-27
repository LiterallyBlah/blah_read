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
import { Book, ReadingSession, Companion } from '@/lib/types';
import { processReadingSession } from '@/lib/companionUnlock';
import { checkLootBoxRewards } from '@/lib/lootBox';
import { maybeGenerateImages } from '@/lib/companionImageQueue';
import { generateImageForCompanion } from '@/lib/imageGen';
import { settings } from '@/lib/settings';
import { debug, setDebugEnabled } from '@/lib/debug';
import { FONTS } from '@/lib/theme';
import { useTheme } from '@/lib/ThemeContext';

export default function TimerScreen() {
  const { colors, spacing, fontSize, letterSpacing } = useTheme();
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const [book, setBook] = useState<Book | null>(null);
  const { elapsed, isRunning, start, pause, reset } = useTimer();
  const styles = createStyles(colors, spacing, fontSize, letterSpacing);

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

    // Initialize debug mode
    const config = await settings.get();
    setDebugEnabled(config.debugMode);

    debug.log('timer', 'Ending reading session', {
      bookTitle: book.title,
      elapsed,
      previousTime: book.totalReadingTime,
    });

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
    debug.log('timer', 'Streak updated', {
      currentStreak: progress.currentStreak,
      longestStreak: progress.longestStreak,
    });

    // Calculate XP with streak multiplier
    const xp = calculateXp(elapsed, progress.currentStreak);
    debug.log('timer', 'XP calculated', { xp, streakMultiplier: progress.currentStreak });

    // Check for loot (every 60 minutes)
    if (shouldTriggerLoot(previousTime, newTime)) {
      const loot = rollLoot();
      progress.lootItems.push(loot);
      debug.log('timer', 'Loot triggered!', loot);
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
    debug.log('timer', 'Session saved');

    // Update book
    book.totalReadingTime = newTime;
    book.status = 'reading';

    // Process companion unlocks
    let unlockedCompanions: Companion[] = [];
    if (book.companions) {
      debug.log('timer', 'Processing companion unlocks...');
      const result = processReadingSession(book, elapsed);
      book.companions = result.updatedCompanions;
      unlockedCompanions = result.unlockedCompanions;

      if (unlockedCompanions.length > 0) {
        debug.log('timer', `Unlocked ${unlockedCompanions.length} companions!`, {
          names: unlockedCompanions.map(c => c.name),
        });
      }

      // Add any loot boxes earned from reading time
      if (result.earnedLootBoxes.length > 0) {
        progress.lootBoxes.availableBoxes.push(...result.earnedLootBoxes);
        debug.log('timer', `Earned ${result.earnedLootBoxes.length} loot boxes`);
      }
    }

    await storage.saveBook(book);

    // Update progress
    const previousProgress = { ...progress };
    progress.totalXp += xp;
    progress.totalHoursRead = Math.floor(
      (await storage.getBooks()).reduce((sum, b) => sum + b.totalReadingTime, 0) / 3600
    );

    // Check for achievement-based loot boxes
    const newLootBoxes = checkLootBoxRewards(previousProgress, progress);
    if (newLootBoxes.length > 0) {
      progress.lootBoxes.availableBoxes.push(...newLootBoxes);
      debug.log('timer', `Achievement loot boxes earned: ${newLootBoxes.length}`);
    }

    await storage.saveProgress(progress);
    debug.log('timer', 'Progress saved', {
      totalXp: progress.totalXp,
      level: progress.level,
    });

    // Trigger background image generation for next unlocks
    if (book.companions) {
      if (config.apiKey) {
        debug.log('timer', 'Starting background image generation...');
        const generateImage = async (companion: Companion) => {
          debug.log('timer', `Generating image for "${companion.name}"...`);
          try {
            const url = await generateImageForCompanion(companion, config.apiKey!, {
              model: config.imageModel,
            });
            debug.log('timer', `Image generated for "${companion.name}"`);
            return url;
          } catch (error) {
            debug.error('timer', `Failed to generate image for ${companion.name}`, error);
            return null;
          }
        };
        maybeGenerateImages(book, generateImage).then(async updatedBook => {
          await storage.saveBook(updatedBook);
          debug.log('timer', 'Background image generation complete');
        });
      } else {
        debug.warn('timer', 'Skipping image generation - no API key');
      }
    }

    debug.log('timer', 'Session end complete, navigating back');
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

const createStyles = (
  colors: ReturnType<typeof useTheme>['colors'],
  spacing: ReturnType<typeof useTheme>['spacing'],
  fontSize: ReturnType<typeof useTheme>['fontSize'],
  letterSpacing: ReturnType<typeof useTheme>['letterSpacing']
) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    color: colors.textSecondary,
    fontFamily: FONTS.mono,
    fontSize: fontSize('body'),
    letterSpacing: letterSpacing('tight'),
    marginBottom: spacing(8),
    textAlign: 'center',
  },
  timer: {
    color: colors.text,
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
    borderColor: colors.text,
    paddingVertical: spacing(5), // 20px
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  primaryButtonText: {
    color: colors.text,
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: fontSize('large'),
    letterSpacing: letterSpacing('hero'),
  },
  // Secondary button (compact inline control)
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing(4), // 16px
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  secondaryButtonText: {
    color: colors.textSecondary,
    fontFamily: FONTS.mono,
    fontSize: fontSize('body'),
    letterSpacing: letterSpacing('tight'),
  },
  manualLink: {
    color: colors.textMuted,
    fontFamily: FONTS.mono,
    fontSize: fontSize('small'),
    letterSpacing: letterSpacing('tight'),
    marginTop: spacing(8),
  },
});
