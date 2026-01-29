// Clean OLED-black focus screen per spec - monochrome typewriter aesthetic
import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Image } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { activateKeepAwakeAsync, deactivateKeepAwake } from 'expo-keep-awake';
import { useTimer } from '@/hooks/useTimer';
import { storage } from '@/lib/storage';
import { updateStreak, getDateString } from '@/lib/streak';
import { Book, ReadingSession, Companion, UserProgress } from '@/lib/types';
import { processReadingSession } from '@/lib/companionUnlock';
import { checkLootBoxRewards } from '@/lib/lootBox';
import { maybeGenerateImages } from '@/lib/companionImageQueue';
import { generateImageForCompanion } from '@/lib/imageGen';
import { settings } from '@/lib/settings';
import { debug, setDebugEnabled } from '@/lib/debug';
import { FONTS } from '@/lib/theme';
import { useTheme } from '@/lib/ThemeContext';
// V3 Reward System imports
import { processSessionEnd } from '@/lib/sessionRewards';
import { getEquippedCompanionIds } from '@/lib/loadout';
import { calculateActiveEffects, ActiveEffects } from '@/lib/companionEffects';
import { getActiveEffects as getConsumableEffects } from '@/lib/consumableManager';
import { buildSessionResultsData } from '@/lib/sessionResultsData';

export default function TimerScreen() {
  const { colors, spacing, fontSize, letterSpacing } = useTheme();
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const [book, setBook] = useState<Book | null>(null);
  const [equippedCompanions, setEquippedCompanions] = useState<Companion[]>([]);
  const [activeEffects, setActiveEffects] = useState<ActiveEffects | null>(null);
  const { elapsed, isRunning, start, pause, reset } = useTimer();
  const styles = createStyles(colors, spacing, fontSize, letterSpacing);

  useEffect(() => {
    loadBookAndCompanions();
    activateKeepAwakeAsync();
    return () => {
      deactivateKeepAwake();
    };
  }, []);

  async function loadBookAndCompanions() {
    const books = await storage.getBooks();
    const foundBook = books.find(b => b.id === bookId) || null;
    setBook(foundBook);

    // Load equipped companions and calculate active effects
    const progress = await storage.getProgress();
    const loadout = progress.loadout || { slots: [null, null, null], unlockedSlots: 1 };
    const equippedIds = getEquippedCompanionIds(loadout);

    // Gather all companions from all books
    const allCompanions: Companion[] = [];
    for (const b of books) {
      if (b.companions?.unlockedCompanions) {
        allCompanions.push(...b.companions.unlockedCompanions);
      }
    }

    // Resolve equipped companion IDs to actual companion objects
    const equipped = equippedIds
      .map(id => allCompanions.find(c => c.id === id))
      .filter((c): c is Companion => c !== undefined);
    setEquippedCompanions(equipped);

    // Calculate combined active effects (companion + consumable)
    const bookGenres = foundBook?.normalizedGenres || [];
    const companionEffects = calculateActiveEffects(equipped, bookGenres);
    const consumableEffects = getConsumableEffects(progress.activeConsumables || []);

    const combined: ActiveEffects = {
      xpBoost: companionEffects.xpBoost + consumableEffects.xpBoost,
      luck: companionEffects.luck + consumableEffects.luck,
      rareLuck: companionEffects.rareLuck + consumableEffects.rareLuck,
      legendaryLuck: companionEffects.legendaryLuck + consumableEffects.legendaryLuck,
      dropRateBoost: companionEffects.dropRateBoost + consumableEffects.dropRateBoost,
      completionBonus: companionEffects.completionBonus,
    };
    setActiveEffects(combined);

    debug.log('timer', 'Active effects calculated', combined);
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
    const previousStreak = progress.currentStreak;

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

    // Process V3 session rewards (book levels, XP, loot boxes)
    const sessionResult = processSessionEnd(
      book,
      progress,
      equippedCompanions,
      elapsed,
      false // isCompletion - timer screen doesn't handle book completion
    );

    debug.log('timer', 'V3 Session rewards processed', {
      xpGained: sessionResult.xpGained,
      bookLevelsGained: sessionResult.bookLevelsGained,
      newBookLevel: sessionResult.newBookLevel,
      lootBoxesEarned: sessionResult.lootBoxes.length,
      bonusDrop: sessionResult.bonusDropTriggered,
    });

    // Use the updated book and progress from session processor
    let updatedBook = sessionResult.updatedBook;
    let updatedProgress = sessionResult.updatedProgress;

    // Merge streak updates into the progress (sessionRewards doesn't handle streaks)
    updatedProgress = {
      ...updatedProgress,
      currentStreak: progress.currentStreak,
      longestStreak: progress.longestStreak,
      lastReadDate: progress.lastReadDate,
    };

    // Update slot progress for session completed milestone
    if (updatedProgress.slotProgress) {
      updatedProgress.slotProgress = {
        ...updatedProgress.slotProgress,
        sessionsCompleted: (updatedProgress.slotProgress.sessionsCompleted || 0) + 1,
      };
      debug.log('timer', 'Slot progress updated', {
        sessionsCompleted: updatedProgress.slotProgress.sessionsCompleted,
      });
    }

    // Save session record
    const session: ReadingSession = {
      id: Date.now().toString(),
      bookId: book.id,
      startTime: Date.now() - elapsed * 1000,
      endTime: Date.now(),
      duration: elapsed,
      xpEarned: sessionResult.xpGained,
    };
    await storage.saveSession(session);
    debug.log('timer', 'Session saved');

    // Update book status
    updatedBook.status = 'reading';

    // Process companion unlocks (legacy system - still needed for unlocking companions)
    let unlockedCompanions: Companion[] = [];
    if (updatedBook.companions) {
      debug.log('timer', 'Processing companion unlocks...');
      const result = processReadingSession(updatedBook, elapsed);
      updatedBook.companions = result.updatedCompanions;
      unlockedCompanions = result.unlockedCompanions;

      if (unlockedCompanions.length > 0) {
        debug.log('timer', `Unlocked ${unlockedCompanions.length} companions!`, {
          names: unlockedCompanions.map(c => c.name),
        });
      }

      // Add any loot boxes earned from reading time (legacy loot boxes)
      if (result.earnedLootBoxes.length > 0) {
        updatedProgress.lootBoxes.availableBoxes.push(...result.earnedLootBoxes);
        debug.log('timer', `Earned ${result.earnedLootBoxes.length} legacy loot boxes`);
      }
    }

    await storage.saveBook(updatedBook);

    // Update total hours read for legacy achievements
    const allBooks = await storage.getBooks();
    updatedProgress.totalHoursRead = Math.floor(
      allBooks.reduce((sum, b) => sum + b.totalReadingTime, 0) / 3600
    );

    // Check for achievement-based loot boxes (legacy)
    const previousProgress = { ...progress, totalXp: progress.totalXp };
    const newLootBoxes = checkLootBoxRewards(previousProgress, updatedProgress);
    if (newLootBoxes.length > 0) {
      updatedProgress.lootBoxes.availableBoxes.push(...newLootBoxes);
      debug.log('timer', `Achievement loot boxes earned: ${newLootBoxes.length}`);
    }

    await storage.saveProgress(updatedProgress);
    debug.log('timer', 'Progress saved', {
      totalXp: updatedProgress.totalXp,
      level: updatedProgress.level,
    });

    // Trigger background image generation for next unlocks
    if (updatedBook.companions && config.apiKey) {
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
      maybeGenerateImages(updatedBook, generateImage).then(async finalBook => {
        await storage.saveBook(finalBook);
        debug.log('timer', 'Background image generation complete');
      });
    }

    // Build session results data and navigate to results screen
    const resultsData = buildSessionResultsData(
      sessionResult,
      elapsed,
      unlockedCompanions,
      previousStreak,
      updatedProgress.currentStreak
    );

    debug.log('timer', 'Session end complete, navigating to results screen');
    router.push({
      pathname: '/session-results',
      params: {
        data: JSON.stringify(resultsData),
        bookTitle: book.title,
      },
    });
  }

  // Format active effects for display
  function formatActiveEffects(): string[] {
    if (!activeEffects) return [];
    const effects: string[] = [];

    if (activeEffects.xpBoost > 0) {
      effects.push(`+${Math.round(activeEffects.xpBoost * 100)}% xp`);
    }
    if (activeEffects.luck > 0) {
      effects.push(`+${Math.round(activeEffects.luck * 100)}% luck`);
    }
    if (activeEffects.dropRateBoost > 0) {
      effects.push(`+${Math.round(activeEffects.dropRateBoost * 100)}% drops`);
    }
    if (activeEffects.completionBonus > 0) {
      effects.push(`+${Math.round(activeEffects.completionBonus * 100)}% completion`);
    }

    return effects;
  }

  const displayEffects = formatActiveEffects();
  const hasActiveEffects = displayEffects.length > 0;

  return (
    <View style={styles.container}>
      {/* Book cover (optional) */}
      {book?.coverUrl && (
        <Image source={{ uri: book.coverUrl }} style={styles.cover} resizeMode="contain" />
      )}

      {/* Book title */}
      <Text style={styles.title}>{book?.title.toLowerCase() || 'loading...'}_</Text>

      {/* Active modifiers display */}
      {hasActiveEffects && (
        <View style={styles.modifiersContainer}>
          <Text style={styles.modifiersLabel}>active bonuses:</Text>
          <Text style={styles.modifiersText}>{displayEffects.join(' | ')}</Text>
        </View>
      )}

      {/* Large timer display */}
      <Text style={styles.timer} numberOfLines={1} adjustsFontSizeToFit>
        {formatTime(elapsed)}
      </Text>

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
    marginBottom: spacing(4),
    textAlign: 'center',
  },
  modifiersContainer: {
    marginBottom: spacing(6),
    alignItems: 'center',
  },
  modifiersLabel: {
    color: colors.textMuted,
    fontFamily: FONTS.mono,
    fontSize: fontSize('small'),
    letterSpacing: letterSpacing('tight'),
    marginBottom: spacing(1),
  },
  modifiersText: {
    color: colors.accent,
    fontFamily: FONTS.mono,
    fontSize: fontSize('small'),
    letterSpacing: letterSpacing('tight'),
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
