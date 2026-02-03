import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { router } from 'expo-router';
import { Book, Companion } from '@/lib/types';
import { FONTS } from '@/lib/theme';
import { useTheme } from '@/lib/ThemeContext';
import { getBookTier, getTierColorKey, getTierGlow } from '@/lib/bookTier';
import { getBookLoadout, isSlotUnlocked } from '@/lib/loadout';

interface ReadingBookCardProps {
  book: Book;
  /** Optional: all companions for resolving loadout companion IDs to actual companions */
  allCompanions?: Companion[];
}

/**
 * A card component for displaying a currently reading book.
 * Shows cover, title, author, level/tier, mini loadout preview, and reading time.
 * Includes a "Start Reading" button that navigates to the timer.
 */
export function ReadingBookCard({ book, allCompanions = [] }: ReadingBookCardProps) {
  const { colors, spacing, fontSize, letterSpacing } = useTheme();
  const styles = createStyles(colors, spacing, fontSize, letterSpacing);

  // Book level and tier
  const level = book.progression?.level || 1;
  const tier = getBookTier(level);
  const tierColor = colors[getTierColorKey(tier)];
  const glow = getTierGlow(tier);

  // Reading time formatting
  const hours = Math.floor(book.totalReadingTime / 3600);
  const minutes = Math.floor((book.totalReadingTime % 3600) / 60);

  // Loadout for mini preview
  const loadout = getBookLoadout(book);

  // Get author string (may have multiple authors)
  const authorText = book.authors?.length
    ? book.authors.slice(0, 2).join(', ').toLowerCase()
    : null;

  // Helper to find companion by ID
  const findCompanion = (id: string | null): Companion | null => {
    if (!id) return null;
    return allCompanions.find(c => c.id === id) || null;
  };

  const handleStartReading = () => {
    router.push(`/timer/${book.id}`);
  };

  const handleCardPress = () => {
    router.push(`/book/${book.id}`);
  };

  return (
    <Pressable style={styles.card} onPress={handleCardPress}>
      {/* Cover section with tier glow */}
      <View style={styles.coverSection}>
        <View
          style={[
            styles.coverBorder,
            {
              borderColor: tierColor,
              shadowColor: tierColor,
              shadowRadius: glow.shadowRadius,
              shadowOpacity: glow.shadowOpacity,
              elevation: glow.elevation,
            },
          ]}
        >
          {book.coverUrl ? (
            <Image source={{ uri: book.coverUrl }} style={styles.coverImage} resizeMode="cover" />
          ) : (
            <View style={[styles.coverImage, styles.coverPlaceholder]}>
              <Text style={styles.coverPlaceholderText}>?</Text>
            </View>
          )}
        </View>
      </View>

      {/* Info section */}
      <View style={styles.infoSection}>
        {/* Title */}
        <Text style={styles.title} numberOfLines={2}>
          {book.title.toLowerCase()}
        </Text>

        {/* Author */}
        {authorText && (
          <Text style={styles.author} numberOfLines={1}>
            {authorText}
          </Text>
        )}

        {/* Level and tier badge */}
        <View style={styles.levelRow}>
          <Text style={[styles.levelBadge, { color: tierColor }]}>
            lv.{level}
          </Text>
          <Text style={[styles.tierBadge, { color: tierColor }]}>
            [{tier}]
          </Text>
        </View>

        {/* Mini loadout preview */}
        <View style={styles.loadoutPreview}>
          {[0, 1, 2].map((slotIndex) => {
            const unlocked = isSlotUnlocked(loadout, slotIndex);
            const companionId = loadout.slots[slotIndex];
            const companion = findCompanion(companionId);

            return (
              <View
                key={slotIndex}
                style={[
                  styles.loadoutSlot,
                  !unlocked && styles.loadoutSlotLocked,
                ]}
              >
                {!unlocked ? (
                  <Text style={styles.loadoutSlotIcon}>[ ]</Text>
                ) : companion?.imageUrl ? (
                  <Image
                    source={{ uri: companion.imageUrl }}
                    style={styles.loadoutCompanionImage}
                    resizeMode="contain"
                  />
                ) : (
                  <Text style={styles.loadoutSlotIcon}>
                    {companionId ? '?' : '+'}
                  </Text>
                )}
              </View>
            );
          })}
        </View>

        {/* Reading time */}
        <Text style={styles.readingTime}>
          {hours}h {minutes}m read
        </Text>

        {/* Start Reading button */}
        <Pressable style={styles.startButton} onPress={handleStartReading}>
          <Text style={styles.startButtonText}>[ start reading ]</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const createStyles = (
  colors: ReturnType<typeof useTheme>['colors'],
  spacing: ReturnType<typeof useTheme>['spacing'],
  fontSize: ReturnType<typeof useTheme>['fontSize'],
  letterSpacing: ReturnType<typeof useTheme>['letterSpacing']
) =>
  StyleSheet.create({
    card: {
      flexDirection: 'row',
      backgroundColor: colors.backgroundCard,
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing(3),
      marginBottom: spacing(3),
    },
    coverSection: {
      marginRight: spacing(3),
    },
    coverBorder: {
      borderWidth: 2,
      shadowOffset: { width: 0, height: 0 },
    },
    coverImage: {
      width: 80,
      height: 120,
      backgroundColor: colors.surface,
    },
    coverPlaceholder: {
      justifyContent: 'center',
      alignItems: 'center',
    },
    coverPlaceholderText: {
      color: colors.textMuted,
      fontFamily: FONTS.mono,
      fontSize: 32,
    },
    infoSection: {
      flex: 1,
      justifyContent: 'space-between',
    },
    title: {
      color: colors.text,
      fontFamily: FONTS.mono,
      fontWeight: FONTS.monoBold,
      fontSize: fontSize('body'),
      letterSpacing: letterSpacing('tight'),
      marginBottom: spacing(1),
    },
    author: {
      color: colors.textMuted,
      fontFamily: FONTS.mono,
      fontSize: fontSize('small'),
      letterSpacing: letterSpacing('tight'),
      marginBottom: spacing(2),
    },
    levelRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing(1),
      marginBottom: spacing(2),
    },
    levelBadge: {
      fontFamily: FONTS.mono,
      fontSize: fontSize('small'),
      letterSpacing: letterSpacing('tight'),
    },
    tierBadge: {
      fontFamily: FONTS.mono,
      fontSize: fontSize('small'),
      letterSpacing: letterSpacing('tight'),
    },
    loadoutPreview: {
      flexDirection: 'row',
      gap: spacing(1),
      marginBottom: spacing(2),
    },
    loadoutSlot: {
      width: 28,
      height: 28,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.surface,
    },
    loadoutSlotLocked: {
      opacity: 0.4,
    },
    loadoutSlotIcon: {
      color: colors.textMuted,
      fontFamily: FONTS.mono,
      fontSize: fontSize('micro'),
    },
    loadoutCompanionImage: {
      width: 24,
      height: 24,
    },
    readingTime: {
      color: colors.textMuted,
      fontFamily: FONTS.mono,
      fontSize: fontSize('micro'),
      letterSpacing: letterSpacing('tight'),
      marginBottom: spacing(2),
    },
    startButton: {
      borderWidth: 1,
      borderColor: colors.text,
      paddingVertical: spacing(2),
      paddingHorizontal: spacing(3),
      alignItems: 'center',
    },
    startButtonText: {
      color: colors.text,
      fontFamily: FONTS.mono,
      fontWeight: FONTS.monoBold,
      fontSize: fontSize('small'),
      letterSpacing: letterSpacing('tight'),
    },
  });
