import { useState } from 'react';
import { View, Text, TextInput, Pressable, StyleSheet, Alert } from 'react-native';
import { useLocalSearchParams, router } from 'expo-router';
import { storage } from '@/lib/storage';
import { calculateXp } from '@/lib/rewards';
import { updateStreak, getDateString, ReadingSession, LootItem } from '@/lib/shared';
import { FONTS, useTheme } from '@/lib/ui';

// Inlined from deprecated lib/loot.ts
const LOOT_INTERVAL = 3600;
const LOOT_TABLE: Omit<LootItem, 'id' | 'earnedAt'>[] = [
  { name: 'Hourglass', icon: 'hourglass', rarity: 'common' },
  { name: 'Scroll', icon: 'scroll', rarity: 'common' },
  { name: 'Quill', icon: 'quill', rarity: 'common' },
  { name: 'Bookmark', icon: 'bookmark', rarity: 'rare' },
  { name: 'Tome', icon: 'book', rarity: 'rare' },
  { name: 'Crystal', icon: 'crystal', rarity: 'epic' },
  { name: 'Crown', icon: 'crown', rarity: 'epic' },
  { name: 'Dragon Scale', icon: 'dragon', rarity: 'legendary' },
];
const RARITY_WEIGHTS = { common: 60, rare: 25, epic: 12, legendary: 3 };

function shouldTriggerLoot(previousTime: number, newTime: number): boolean {
  const previousMilestones = Math.floor(previousTime / LOOT_INTERVAL);
  const newMilestones = Math.floor(newTime / LOOT_INTERVAL);
  return newMilestones > previousMilestones;
}

function rollLoot(): LootItem {
  const roll = Math.random() * 100;
  let rarity: LootItem['rarity'];
  if (roll < RARITY_WEIGHTS.legendary) rarity = 'legendary';
  else if (roll < RARITY_WEIGHTS.legendary + RARITY_WEIGHTS.epic) rarity = 'epic';
  else if (roll < RARITY_WEIGHTS.legendary + RARITY_WEIGHTS.epic + RARITY_WEIGHTS.rare) rarity = 'rare';
  else rarity = 'common';
  let pool = LOOT_TABLE.filter(item => item.rarity === rarity);
  if (pool.length === 0) pool = LOOT_TABLE.filter(item => item.rarity === 'common');
  if (pool.length === 0) throw new Error(`[loot] No items available for rarity: ${rarity}`);
  const item = pool[Math.floor(Math.random() * pool.length)];
  return { ...item, id: `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`, earnedAt: Date.now() };
}

type Colors = ReturnType<typeof useTheme>['colors'];
type Spacing = ReturnType<typeof useTheme>['spacing'];
type FontSize = ReturnType<typeof useTheme>['fontSize'];
type LetterSpacing = ReturnType<typeof useTheme>['letterSpacing'];

function createStyles(
  colors: Colors,
  spacing: Spacing,
  fontSize: FontSize,
  letterSpacing: LetterSpacing
) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
      padding: spacing(6),
      paddingTop: spacing(16),
    },
    backButton: {
      marginBottom: spacing(6),
    },
    backText: {
      color: colors.textSecondary,
      fontFamily: FONTS.mono,
      fontSize: fontSize('body'),
      letterSpacing: letterSpacing('tight'),
    },
    title: {
      color: colors.text,
      fontFamily: FONTS.mono,
      fontWeight: FONTS.monoBold,
      fontSize: fontSize('title'),
      letterSpacing: letterSpacing('normal'),
      marginBottom: spacing(2),
    },
    subtitle: {
      color: colors.textMuted,
      fontFamily: FONTS.mono,
      fontSize: fontSize('body'),
      letterSpacing: letterSpacing('tight'),
      marginBottom: spacing(10),
    },
    inputRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      marginBottom: spacing(8),
    },
    inputGroup: {
      alignItems: 'center',
    },
    input: {
      width: 80,
      height: 80,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.backgroundCard,
      color: colors.text,
      fontFamily: FONTS.mono,
      fontWeight: FONTS.monoBold,
      fontSize: 36,
      textAlign: 'center',
    },
    inputLabel: {
      color: colors.textMuted,
      fontFamily: FONTS.mono,
      fontSize: fontSize('micro'),
      letterSpacing: letterSpacing('tight'),
      marginTop: spacing(1),
    },
    separator: {
      color: colors.text,
      fontFamily: FONTS.mono,
      fontSize: 36,
      marginHorizontal: spacing(3),
    },
    presets: {
      flexDirection: 'row',
      justifyContent: 'center',
      gap: spacing(2),
      marginBottom: spacing(10),
    },
    presetButton: {
      paddingVertical: spacing(2),
      paddingHorizontal: spacing(3),
      borderWidth: 1,
      borderColor: colors.border,
    },
    presetText: {
      color: colors.textSecondary,
      fontFamily: FONTS.mono,
      fontSize: fontSize('small'),
      letterSpacing: letterSpacing('tight'),
    },
    submitButton: {
      borderWidth: 1,
      borderColor: colors.text,
      paddingVertical: spacing(5),
      alignItems: 'center',
    },
    submitText: {
      color: colors.text,
      fontFamily: FONTS.mono,
      fontWeight: FONTS.monoBold,
      fontSize: fontSize('large'),
      letterSpacing: letterSpacing('hero'),
    },
  });
}

export default function ManualEntryScreen() {
  const { colors, spacing, fontSize, letterSpacing } = useTheme();
  const styles = createStyles(colors, spacing, fontSize, letterSpacing);

  const { bookId } = useLocalSearchParams<{ bookId: string }>();
  const [hours, setHours] = useState('0');
  const [minutes, setMinutes] = useState('30');

  async function handleSubmit() {
    const h = parseInt(hours, 10) || 0;
    const m = parseInt(minutes, 10) || 0;
    const totalSeconds = h * 3600 + m * 60;

    if (totalSeconds === 0) {
      Alert.alert('Invalid Time', 'Please enter a valid reading time.');
      return;
    }

    const books = await storage.getBooks();
    const book = books.find(b => b.id === bookId);
    if (!book) {
      Alert.alert('Error', 'Book not found.');
      return;
    }

    const progress = await storage.getProgress();
    const previousTime = book.totalReadingTime;
    const newTime = previousTime + totalSeconds;

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

    // Calculate XP
    const xp = calculateXp(totalSeconds, progress.currentStreak);

    // Check for loot
    if (shouldTriggerLoot(previousTime, newTime)) {
      const loot = rollLoot();
      progress.lootItems.push(loot);
    }

    // Save session
    const session: ReadingSession = {
      id: Date.now().toString(),
      bookId: book.id,
      startTime: Date.now() - totalSeconds * 1000,
      endTime: Date.now(),
      duration: totalSeconds,
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

    Alert.alert(
      'Time Added',
      `+${xp} XP earned!`,
      [{ text: 'OK', onPress: () => router.back() }]
    );
  }

  return (
    <View style={styles.container}>
      {/* Back button */}
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>{'<'} back</Text>
      </Pressable>

      <Text style={styles.title}>manual entry_</Text>
      <Text style={styles.subtitle}>forgot to track? add time here.</Text>

      {/* Time inputs */}
      <View style={styles.inputRow}>
        <View style={styles.inputGroup}>
          <TextInput
            style={styles.input}
            value={hours}
            onChangeText={setHours}
            keyboardType="number-pad"
            maxLength={2}
            selectTextOnFocus
          />
          <Text style={styles.inputLabel}>hours</Text>
        </View>
        <Text style={styles.separator}>:</Text>
        <View style={styles.inputGroup}>
          <TextInput
            style={styles.input}
            value={minutes}
            onChangeText={setMinutes}
            keyboardType="number-pad"
            maxLength={2}
            selectTextOnFocus
          />
          <Text style={styles.inputLabel}>minutes</Text>
        </View>
      </View>

      {/* Quick presets */}
      <View style={styles.presets}>
        {[15, 30, 45, 60].map(mins => (
          <Pressable
            key={mins}
            style={styles.presetButton}
            onPress={() => {
              setHours(Math.floor(mins / 60).toString());
              setMinutes((mins % 60).toString());
            }}
          >
            <Text style={styles.presetText}>[{mins}m]</Text>
          </Pressable>
        ))}
      </View>

      {/* Submit button */}
      <Pressable style={styles.submitButton} onPress={handleSubmit}>
        <Text style={styles.submitText}>[ add time ]</Text>
      </Pressable>
    </View>
  );
}
