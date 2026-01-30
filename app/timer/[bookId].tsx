// Clean OLED-black focus screen per spec - monochrome typewriter aesthetic
import { useEffect, useState } from 'react';
import { View, Text, Pressable, StyleSheet, Image, Alert } from 'react-native';
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
import { timerPersistence } from '@/lib/timerPersistence';
import { backgroundService } from '@/lib/backgroundService';
// V3 Reward System imports
import { processSessionEnd } from '@/lib/sessionRewards';
import { getEquippedCompanionIds } from '@/lib/loadout';
import { calculateActiveEffects, ActiveEffects } from '@/lib/companionEffects';
import { getActiveEffects as getConsumableEffects } from '@/lib/consumableManager';
import { buildSessionResultsData } from '@/lib/sessionResultsData';
import { shouldUnlockSlot2, shouldUnlockSlot3 } from '@/lib/slotProgress';
import { getBookTier, getTierColorKey } from '@/lib/bookTier';

export default function TimerScreen() {
  const { colors, spacing, fontSize, letterSpacing } = useTheme();
  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const [book, setBook] = useState<Book | null>(null);
  const [equippedCompanions, setEquippedCompanions] = useState<Companion[]>([]);
  const [activeEffects, setActiveEffects] = useState<ActiveEffects | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [timeAdjustment, setTimeAdjustment] = useState(0);
  const { elapsed, isRunning, start, pause, reset } = useTimer({ bookId });
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

  const displayTime = Math.max(0, elapsed + timeAdjustment);

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

  async function handleEnd() {
    // Require actual timer activity - can't create sessions from adjustment alone
    if (!book || elapsed === 0) return;
    const finalTime = Math.max(0, elapsed + timeAdjustment);

    // Clear timer persistence and stop background service
    await timerPersistence.clear();
    await backgroundService.stop();

    // Initialize debug mode
    const config = await settings.get();
    setDebugEnabled(config.debugMode);

    debug.log('timer', 'Ending reading session', {
      bookTitle: book.title,
      finalTime,
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
      finalTime,
      false // isCompletion - timer screen doesn't handle book completion
    );

    debug.log('timer', 'V3 Session rewards processed', {
      xpGained: sessionResult.xpGained,
      bookLevelsGained: sessionResult.bookLevelsGained,
      newBookLevel: sessionResult.newBookLevel,
      lootBoxesEarned: sessionResult.lootBoxes.length,
      bonusDrop: sessionResult.bonusDropCount,
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

    // Update slot progress - track cumulative hours instead of sessions
    if (updatedProgress.slotProgress) {
      // Calculate total hours from all books (will be updated after saveBook)
      const allBooks = await storage.getBooks();
      const totalSeconds = allBooks.reduce((sum, b) => {
        // Use updated book's time if it's the current book
        if (b.id === updatedBook.id) {
          return sum + updatedBook.totalReadingTime;
        }
        return sum + b.totalReadingTime;
      }, 0);
      const totalHours = Math.floor(totalSeconds / 3600);

      updatedProgress.slotProgress = {
        ...updatedProgress.slotProgress,
        hoursLogged: totalHours,
      };

      // Check if slots should be unlocked
      const currentUnlocked = updatedProgress.loadout?.unlockedSlots || 1;
      let newUnlocked = currentUnlocked;

      if (currentUnlocked < 2 && shouldUnlockSlot2(updatedProgress.slotProgress)) {
        newUnlocked = 2;
        debug.log('timer', 'Slot 2 unlocked!');
      }
      if (newUnlocked >= 2 && currentUnlocked < 3 && shouldUnlockSlot3(updatedProgress.slotProgress)) {
        newUnlocked = 3;
        debug.log('timer', 'Slot 3 unlocked!');
      }

      if (newUnlocked > currentUnlocked && updatedProgress.loadout) {
        updatedProgress.loadout = {
          ...updatedProgress.loadout,
          unlockedSlots: newUnlocked,
        };
      }

      debug.log('timer', 'Slot progress updated', {
        hoursLogged: updatedProgress.slotProgress.hoursLogged,
        unlockedSlots: updatedProgress.loadout?.unlockedSlots,
      });
    }

    // Save session record
    const session: ReadingSession = {
      id: Date.now().toString(),
      bookId: book.id,
      startTime: Date.now() - finalTime * 1000,
      endTime: Date.now(),
      duration: finalTime,
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
      const result = processReadingSession(updatedBook, finalTime);
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

    // Build session results data
    const resultsData = buildSessionResultsData(
      sessionResult,
      finalTime,
      unlockedCompanions,
      previousStreak,
      updatedProgress.currentStreak
    );

    debug.log('timer', 'Session end complete, navigating to rewards reveal');

    // Navigate to reveal screen if there are rewards, otherwise straight to results
    const hasRewardsToReveal = unlockedCompanions.length > 0 || sessionResult.lootBoxes.length > 0;

    if (hasRewardsToReveal) {
      router.replace({
        pathname: '/session-rewards-reveal',
        params: {
          companions: JSON.stringify(resultsData.unlockedCompanions),
          lootBoxes: JSON.stringify(resultsData.lootBoxesEarned),
          resultsData: JSON.stringify(resultsData),
          bookTitle: book.title,
        },
      });
    } else {
      router.replace({
        pathname: '/session-results',
        params: {
          data: JSON.stringify(resultsData),
          bookTitle: book.title,
        },
      });
    }
  }

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

  const level = book?.progression?.level || 1;
  const tier = getBookTier(level);
  const tierColor = colors[getTierColorKey(tier)];

  return (
    <View style={styles.container}>
      {/* Back button */}
      <Pressable style={styles.backButton} onPress={handleBack}>
        <Text style={styles.backText}>{'<'} back</Text>
      </Pressable>

      {/* Book cover (optional) */}
      {book?.coverUrl && (
        <View style={{ borderWidth: 1, borderColor: tierColor, marginBottom: spacing(6) }}>
          <Image source={{ uri: book.coverUrl }} style={styles.coverImage} resizeMode="contain" />
        </View>
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
        {formatTime(displayTime)}
      </Text>

      {/* Edit toggle */}
      <Pressable onPress={() => setEditMode(!editMode)}>
        <Text style={styles.editLink}>{editMode ? 'done' : 'edit'}</Text>
      </Pressable>

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
  coverImage: {
    width: 118,
    height: 178,
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
  editLink: {
    color: colors.textMuted,
    fontFamily: FONTS.mono,
    fontSize: fontSize('small'),
    marginTop: spacing(2),
  },
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
});
