import { useCallback, useState } from 'react';
import { View, Text, ScrollView, Image, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { storage } from '@/lib/storage';
import { calculateLevel, xpProgress } from '@/lib/xp';
import { Book, UserProgress, LootItem, Companion } from '@/lib/types';
import { FONTS } from '@/lib/theme';
import { useTheme } from '@/lib/ThemeContext';
import { GENRES, GENRE_DISPLAY_NAMES, Genre } from '@/lib/genres';
import { getActiveEffects as getConsumableEffects } from '@/lib/consumableManager';
import { getConsumableById } from '@/lib/consumables';
import { calculateSlot2Progress, calculateSlot3Progress, SLOT_2_POINTS, SLOT_3_POINTS } from '@/lib/slotProgress';

export default function ProfileScreen() {
  const { colors, spacing, fontSize, letterSpacing } = useTheme();
  const insets = useSafeAreaInsets();
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [books, setBooks] = useState<Book[]>([]);

  const styles = createStyles(colors, spacing, fontSize, letterSpacing);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    setProgress(await storage.getProgress());
    setBooks(await storage.getBooks());
  }

  const level = progress ? calculateLevel(progress.totalXp) : 1;
  const xp = progress ? xpProgress(progress.totalXp) : { current: 0, needed: 1000 };
  const companions = books.flatMap(b => b.companions?.unlockedCompanions || []);
  const totalTime = books.reduce((sum, b) => sum + b.totalReadingTime, 0);
  const hours = Math.floor(totalTime / 3600);

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.contentContainer, { paddingBottom: spacing(6) + insets.bottom }]}>
      <Text style={styles.title}>profile_</Text>

      <Pressable style={styles.configLink} onPress={() => router.push('/config')}>
        <Text style={styles.configLinkText}>[config]</Text>
      </Pressable>

      {/* Stats section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>stats_</Text>
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{level}</Text>
            <Text style={styles.statLabel}>level</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{progress?.currentStreak || 0}</Text>
            <Text style={styles.statLabel}>streak</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{progress?.longestStreak || 0}</Text>
            <Text style={styles.statLabel}>best</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statValue}>{hours}</Text>
            <Text style={styles.statLabel}>hours</Text>
          </View>
        </View>

        {/* XP progress */}
        <View style={styles.xpSection}>
          <View style={styles.xpBar}>
            <View style={[styles.xpFill, { width: `${(xp.current / xp.needed) * 100}%` }]} />
          </View>
          <Text style={styles.xpText}>{xp.current} / {xp.needed} xp to next level</Text>
        </View>
      </View>

      {/* Loot section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>loot_</Text>
        {progress?.lootItems && progress.lootItems.length > 0 ? (
          <View style={styles.lootGrid}>
            {progress.lootItems.map((item: LootItem) => (
              <View key={item.id} style={[styles.lootItem, styles[`rarity_${item.rarity}` as keyof typeof styles]]}>
                <Text style={styles.lootIcon}>{item.icon}</Text>
                <Text style={styles.lootName}>{item.name.toLowerCase()}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>no loot yet - keep reading!_</Text>
        )}
      </View>

      {/* Companions section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>companions_</Text>
        {companions.length > 0 ? (
          <View style={styles.companionGrid}>
            {companions.map((c: Companion) => (
              <View key={c.id} style={styles.companionCard}>
                <Image source={{ uri: c.imageUrl }} style={styles.companionImage} />
                <Text style={styles.companionName}>{c.creature?.toLowerCase() || c.name?.toLowerCase()}</Text>
              </View>
            ))}
          </View>
        ) : (
          <Text style={styles.emptyText}>finish a book to unlock companions_</Text>
        )}
      </View>

      {/* Genre Levels section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>genre levels_</Text>
        <View style={styles.genreGrid}>
          {GENRES.map((genre: Genre) => {
            const genreLevel = progress?.genreLevels?.[genre] || 0;
            return (
              <View key={genre} style={styles.genreItem}>
                <Text style={styles.genreLevel}>{genreLevel}</Text>
                <Text style={styles.genreName}>{GENRE_DISPLAY_NAMES[genre].toLowerCase()}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {/* Loadout section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>loadout_</Text>
        {progress?.loadout ? (
          <View style={styles.loadoutContainer}>
            {progress.loadout.slots.map((companionId, index) => {
              const isUnlocked = index < (progress.loadout?.unlockedSlots || 1);
              const equippedCompanion = companionId
                ? companions.find(c => c.id === companionId)
                : null;

              return (
                <View
                  key={index}
                  style={[
                    styles.slotBox,
                    !isUnlocked && styles.slotLocked
                  ]}
                >
                  {isUnlocked ? (
                    equippedCompanion ? (
                      <>
                        {equippedCompanion.imageUrl ? (
                          <Image
                            source={{ uri: equippedCompanion.imageUrl }}
                            style={styles.slotImage}
                          />
                        ) : (
                          <Text style={styles.slotIcon}>?</Text>
                        )}
                        <Text style={styles.slotName} numberOfLines={1}>
                          {equippedCompanion.name?.toLowerCase() || 'companion'}
                        </Text>
                      </>
                    ) : (
                      <Text style={styles.slotEmpty}>empty</Text>
                    )
                  ) : (
                    <Text style={styles.slotLockText}>locked</Text>
                  )}
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.emptyText}>loadout not initialized_</Text>
        )}
      </View>

      {/* Slot Unlock Progress section */}
      {progress?.slotProgress && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>slot progress_</Text>

          {/* Slot 2 progress */}
          {(progress.loadout?.unlockedSlots || 1) < 2 && (
            <View style={styles.progressItem}>
              <Text style={styles.progressLabel}>slot 2</Text>
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBar,
                    { width: `${Math.min(100, (calculateSlot2Progress(progress.slotProgress) / SLOT_2_POINTS) * 100)}%` }
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {calculateSlot2Progress(progress.slotProgress)} / {SLOT_2_POINTS}
              </Text>
            </View>
          )}

          {/* Slot 3 progress */}
          {(progress.loadout?.unlockedSlots || 1) < 3 && (
            <View style={styles.progressItem}>
              <Text style={styles.progressLabel}>slot 3</Text>
              <View style={styles.progressBarContainer}>
                <View
                  style={[
                    styles.progressBar,
                    { width: `${Math.min(100, (calculateSlot3Progress(progress.slotProgress) / SLOT_3_POINTS) * 100)}%` }
                  ]}
                />
              </View>
              <Text style={styles.progressText}>
                {calculateSlot3Progress(progress.slotProgress)} / {SLOT_3_POINTS}
              </Text>
            </View>
          )}

          {(progress.loadout?.unlockedSlots || 1) >= 3 && (
            <Text style={styles.emptyText}>all slots unlocked_</Text>
          )}
        </View>
      )}

      {/* Active Consumables section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>active effects_</Text>
        {progress?.activeConsumables && progress.activeConsumables.length > 0 ? (
          <View style={styles.consumablesList}>
            {progress.activeConsumables.map((ac, index) => {
              const consumable = getConsumableById(ac.consumableId);
              if (!consumable) return null;

              return (
                <View key={`${ac.consumableId}-${index}`} style={styles.consumableItem}>
                  <Text style={styles.consumableName}>{consumable.name.toLowerCase()}</Text>
                  <Text style={styles.consumableDesc}>{consumable.description}</Text>
                  <Text style={styles.consumableDuration}>
                    {ac.remainingDuration} session{ac.remainingDuration !== 1 ? 's' : ''} remaining
                  </Text>
                </View>
              );
            })}
          </View>
        ) : (
          <Text style={styles.emptyText}>no active effects_</Text>
        )}
      </View>
    </ScrollView>
  );
}

function createStyles(colors: any, spacing: (n: number) => number, fontSize: (size: string) => number, letterSpacing: (size: string) => number) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    contentContainer: {
      padding: spacing(6),
      paddingTop: spacing(16),
    },
    title: {
      color: colors.text,
      fontFamily: FONTS.mono,
      fontWeight: FONTS.monoBold,
      fontSize: fontSize('title'),
      letterSpacing: letterSpacing('normal'),
      marginBottom: spacing(8),
    },
    section: {
      marginBottom: spacing(8),
    },
    sectionTitle: {
      color: colors.textSecondary,
      fontFamily: FONTS.mono,
      fontSize: fontSize('body'),
      letterSpacing: letterSpacing('tight'),
      marginBottom: spacing(4),
    },
    statsGrid: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: spacing(4),
    },
    statBox: {
      alignItems: 'center',
      flex: 1,
    },
    statValue: {
      color: colors.text,
      fontFamily: FONTS.mono,
      fontWeight: FONTS.monoBold,
      fontSize: fontSize('title'),
      letterSpacing: letterSpacing('tight'),
    },
    statLabel: {
      color: colors.textMuted,
      fontFamily: FONTS.mono,
      fontSize: fontSize('micro'),
      letterSpacing: letterSpacing('tight'),
    },
    xpSection: {
      marginTop: spacing(2),
    },
    xpBar: {
      height: 4,
      backgroundColor: colors.backgroundCard,
      borderWidth: 1,
      borderColor: colors.border,
    },
    xpFill: {
      height: '100%',
      backgroundColor: colors.success,
    },
    xpText: {
      color: colors.textMuted,
      fontFamily: FONTS.mono,
      fontSize: fontSize('micro'),
      letterSpacing: letterSpacing('tight'),
      marginTop: spacing(1),
    },
    lootGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing(2),
    },
    lootItem: {
      padding: spacing(2),
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      minWidth: 60,
    },
    lootIcon: {
      fontSize: 20,
      marginBottom: spacing(1),
    },
    lootName: {
      color: colors.textSecondary,
      fontFamily: FONTS.mono,
      fontSize: fontSize('micro'),
      letterSpacing: letterSpacing('tight'),
    },
    rarity_common: { borderColor: colors.rarityCommon },
    rarity_rare: { borderColor: colors.rarityRare },
    rarity_epic: { borderColor: colors.rarityEpic },
    rarity_legendary: { borderColor: colors.rarityLegendary },
    companionGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing(3),
    },
    companionCard: {
      alignItems: 'center',
    },
    companionImage: {
      width: 64,
      height: 64,
      backgroundColor: colors.backgroundCard,
      marginBottom: spacing(1),
    },
    companionName: {
      color: colors.textSecondary,
      fontFamily: FONTS.mono,
      fontSize: fontSize('micro'),
      letterSpacing: letterSpacing('tight'),
    },
    emptyText: {
      color: colors.textMuted,
      fontFamily: FONTS.mono,
      fontSize: fontSize('small'),
      letterSpacing: letterSpacing('tight'),
    },
    configLink: {
      position: 'absolute',
      top: spacing(14),
      right: spacing(4),
      padding: spacing(3),
    },
    configLinkText: {
      color: colors.textSecondary,
      fontFamily: FONTS.mono,
      fontSize: fontSize('small'),
    },
    // Genre levels styles
    genreGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing(2),
    },
    genreItem: {
      width: '30%',
      flexDirection: 'row',
      alignItems: 'center',
      gap: spacing(2),
      marginBottom: spacing(2),
    },
    genreLevel: {
      color: colors.text,
      fontFamily: FONTS.mono,
      fontWeight: FONTS.monoBold,
      fontSize: fontSize('body'),
      minWidth: 24,
      textAlign: 'right',
    },
    genreName: {
      color: colors.textSecondary,
      fontFamily: FONTS.mono,
      fontSize: fontSize('micro'),
      letterSpacing: letterSpacing('tight'),
      flex: 1,
    },
    // Loadout styles
    loadoutContainer: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing(3),
    },
    slotBox: {
      flex: 1,
      aspectRatio: 1,
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      justifyContent: 'center',
      padding: spacing(2),
    },
    slotLocked: {
      backgroundColor: colors.backgroundCard,
      opacity: 0.5,
    },
    slotImage: {
      width: 40,
      height: 40,
      marginBottom: spacing(1),
    },
    slotIcon: {
      fontSize: 24,
      color: colors.textMuted,
    },
    slotName: {
      color: colors.textSecondary,
      fontFamily: FONTS.mono,
      fontSize: fontSize('micro'),
      textAlign: 'center',
    },
    slotEmpty: {
      color: colors.textMuted,
      fontFamily: FONTS.mono,
      fontSize: fontSize('micro'),
    },
    slotLockText: {
      color: colors.textMuted,
      fontFamily: FONTS.mono,
      fontSize: fontSize('micro'),
    },
    // Slot progress styles
    progressItem: {
      marginBottom: spacing(3),
    },
    progressLabel: {
      color: colors.textSecondary,
      fontFamily: FONTS.mono,
      fontSize: fontSize('small'),
      marginBottom: spacing(1),
    },
    progressBarContainer: {
      height: 6,
      backgroundColor: colors.backgroundCard,
      borderWidth: 1,
      borderColor: colors.border,
      marginBottom: spacing(1),
    },
    progressBar: {
      height: '100%',
      backgroundColor: colors.success,
    },
    progressText: {
      color: colors.textMuted,
      fontFamily: FONTS.mono,
      fontSize: fontSize('micro'),
    },
    // Active consumables styles
    consumablesList: {
      gap: spacing(3),
    },
    consumableItem: {
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing(3),
    },
    consumableName: {
      color: colors.text,
      fontFamily: FONTS.mono,
      fontWeight: FONTS.monoBold,
      fontSize: fontSize('small'),
      marginBottom: spacing(1),
    },
    consumableDesc: {
      color: colors.textSecondary,
      fontFamily: FONTS.mono,
      fontSize: fontSize('micro'),
      marginBottom: spacing(1),
    },
    consumableDuration: {
      color: colors.textMuted,
      fontFamily: FONTS.mono,
      fontSize: fontSize('micro'),
    },
  });
}
