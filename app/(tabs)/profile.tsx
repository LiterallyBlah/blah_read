import { useCallback, useState } from 'react';
import { View, Text, ScrollView, Image, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { storage } from '@/lib/storage';
import { calculateLevel, xpProgress, getStreakMultiplierInfo } from '@/lib/xp';
import { Book, UserProgress, Companion } from '@/lib/types';
import { FONTS } from '@/lib/theme';
import { useTheme } from '@/lib/ThemeContext';
import { GENRES, GENRE_DISPLAY_NAMES, Genre } from '@/lib/genres';
import { getConsumableById, formatDuration } from '@/lib/consumables';
import { DungeonBar, DungeonCard, ConsumableIcon } from '@/components/dungeon';
import { ReadingMilestones } from '@/components/Milestones';
import { SlotProgress } from '@/components/SlotProgress';

export default function ProfileScreen() {
  const { colors, spacing, fontSize, letterSpacing } = useTheme();
  const insets = useSafeAreaInsets();
  const [progress, setProgress] = useState<UserProgress | null>(null);
  const [books, setBooks] = useState<Book[]>([]);
  const [genresExpanded, setGenresExpanded] = useState(false);

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
  const streakInfo = getStreakMultiplierInfo(progress?.currentStreak || 0);
  const companions = books.flatMap(b => b.companions?.unlockedCompanions || []);
  const totalTime = books.reduce((sum, b) => sum + b.totalReadingTime, 0);
  const hours = Math.floor(totalTime / 3600);

  // Calculate loot box counts
  const v2BoxCount = progress?.lootBoxes?.availableBoxes?.length || 0;
  const v3Boxes = progress?.lootBoxesV3 || [];
  const totalBoxCount = v2BoxCount + v3Boxes.length;
  const woodCount = v3Boxes.filter(b => b.tier === 'wood').length;
  const silverCount = v3Boxes.filter(b => b.tier === 'silver').length;
  const goldCount = v3Boxes.filter(b => b.tier === 'gold').length;

  // Sort genres by level (highest first)
  const sortedGenres = GENRES
    .map(genre => ({ genre, level: progress?.genreLevels?.[genre] || 0 }))
    .sort((a, b) => b.level - a.level);
  const topGenre = sortedGenres[0];
  const remainingGenres = sortedGenres.slice(1);

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
            <Text style={styles.statLabel}>streak ({streakInfo.current}x)</Text>
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

        {/* Streak multiplier progress */}
        {streakInfo.next && (
          <Text style={styles.streakProgress}>
            {streakInfo.daysToNext} more day{streakInfo.daysToNext !== 1 ? 's' : ''} for {streakInfo.next}x xp
          </Text>
        )}

        {/* XP progress */}
        <View style={styles.xpSection}>
          <DungeonBar
            value={xp.current}
            max={xp.needed}
            color="amber"
            showText
          />
          <Text style={styles.xpText}>xp to next level</Text>
        </View>
      </View>

      {/* Loadout section - moved to top */}
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

      {/* Active Effects section - right after loadout */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>active effects_</Text>
        {progress?.activeConsumables && progress.activeConsumables.length > 0 ? (
          <View style={styles.consumablesList}>
            {progress.activeConsumables.map((ac, index) => {
              const consumable = getConsumableById(ac.consumableId);
              if (!consumable) return null;

              return (
                <DungeonCard key={`${ac.consumableId}-${index}`} variant="default" style={styles.consumableItem}>
                  <View style={styles.consumableRow}>
                    <ConsumableIcon effectType={consumable.effectType} tier={consumable.tier} size={48} />
                    <View style={styles.consumableInfo}>
                      <Text style={styles.consumableName}>{consumable.name.toLowerCase()}</Text>
                      <Text style={styles.consumableDesc}>{consumable.description}</Text>
                      <DungeonBar
                        value={ac.remainingDuration}
                        max={consumable.duration}
                        color="green"
                        height={4}
                      />
                      <Text style={styles.consumableDuration}>
                        {formatDuration(ac.remainingDuration)} remaining
                      </Text>
                    </View>
                  </View>
                </DungeonCard>
              );
            })}
          </View>
        ) : (
          <Text style={styles.emptyText}>no active effects_</Text>
        )}
      </View>

      {/* Pending Instant Effects section */}
      {(progress?.streakShieldExpiry || progress?.pendingBoxUpgrade ||
        progress?.pendingGuaranteedCompanion || (progress?.pendingInstantLevels ?? 0) > 0) && (
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>pending effects_</Text>
          <View style={styles.consumablesList}>
            {progress?.streakShieldExpiry && progress.streakShieldExpiry > Date.now() && (
              <DungeonCard variant="default" style={styles.consumableItem}>
                <View style={styles.consumableRow}>
                  <ConsumableIcon effectType="streak_shield" tier="weak" size={48} />
                  <View style={styles.consumableInfo}>
                    <Text style={styles.consumableName}>streak shield</Text>
                    <Text style={styles.consumableDesc}>
                      {Math.ceil((progress.streakShieldExpiry - Date.now()) / (60 * 60 * 1000))}h protection remaining
                    </Text>
                  </View>
                </View>
              </DungeonCard>
            )}
            {progress?.pendingBoxUpgrade && (
              <DungeonCard variant="default" style={styles.consumableItem}>
                <View style={styles.consumableRow}>
                  <ConsumableIcon effectType="box_upgrade" tier="medium" size={48} />
                  <View style={styles.consumableInfo}>
                    <Text style={styles.consumableName}>polish kit</Text>
                    <Text style={styles.consumableDesc}>next box tier upgraded</Text>
                  </View>
                </View>
              </DungeonCard>
            )}
            {progress?.pendingGuaranteedCompanion && (
              <DungeonCard variant="default" style={styles.consumableItem}>
                <View style={styles.consumableRow}>
                  <ConsumableIcon effectType="guaranteed_companion" tier="strong" size={48} />
                  <View style={styles.consumableInfo}>
                    <Text style={styles.consumableName}>companion summon</Text>
                    <Text style={styles.consumableDesc}>next box guarantees companion</Text>
                  </View>
                </View>
              </DungeonCard>
            )}
            {(progress?.pendingInstantLevels ?? 0) > 0 && (
              <DungeonCard variant="default" style={styles.consumableItem}>
                <View style={styles.consumableRow}>
                  <ConsumableIcon effectType="instant_level" tier="strong" size={48} />
                  <View style={styles.consumableInfo}>
                    <Text style={styles.consumableName}>time warp x{progress?.pendingInstantLevels}</Text>
                    <Text style={styles.consumableDesc}>start a session to level up book</Text>
                  </View>
                </View>
              </DungeonCard>
            )}
          </View>
        </View>
      )}

      {/* Loot Boxes section - shows unopened boxes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>loot_</Text>
        {totalBoxCount > 0 ? (
          <Pressable
            style={styles.lootBoxLink}
            onPress={() => router.push('/collection')}
          >
            <Text style={styles.lootBoxCount}>{totalBoxCount}</Text>
            <View style={styles.lootBoxDetails}>
              <Text style={styles.lootBoxLabel}>
                box{totalBoxCount !== 1 ? 'es' : ''} to open
              </Text>
              {v3Boxes.length > 0 && (
                <Text style={styles.lootBoxBreakdown}>
                  {goldCount > 0 && <Text style={styles.goldText}>{goldCount} gold </Text>}
                  {silverCount > 0 && <Text style={styles.silverText}>{silverCount} silver </Text>}
                  {woodCount > 0 && <Text style={styles.woodText}>{woodCount} wood</Text>}
                  {v2BoxCount > 0 && <Text> +{v2BoxCount} classic</Text>}
                </Text>
              )}
            </View>
            <Text style={styles.lootBoxArrow}>[open]</Text>
          </Pressable>
        ) : (
          <Text style={styles.emptyText}>no loot boxes - keep reading!_</Text>
        )}
      </View>

      {/* Reading Milestones section */}
      <ReadingMilestones currentReadingMinutes={Math.floor(totalTime / 60)} />

      {/* Genre Levels section - collapsible */}
      <View style={styles.section}>
        <Pressable
          style={styles.genreHeader}
          onPress={() => setGenresExpanded(!genresExpanded)}
        >
          <Text style={[styles.sectionTitle, { marginBottom: 0 }]}>genre levels_</Text>
          <Text style={styles.expandIcon}>{genresExpanded ? '[-]' : '[+]'}</Text>
        </Pressable>

        {/* Always show top genre */}
        {topGenre && (
          <View style={styles.genreItem}>
            <Text style={styles.genreLevel}>{topGenre.level}</Text>
            <Text style={styles.genreName}>{GENRE_DISPLAY_NAMES[topGenre.genre].toLowerCase()}</Text>
          </View>
        )}

        {/* Show remaining genres when expanded */}
        {genresExpanded && (
          <View style={styles.genreGrid}>
            {remainingGenres.map(({ genre, level: genreLevel }) => (
              <View key={genre} style={styles.genreItem}>
                <Text style={styles.genreLevel}>{genreLevel}</Text>
                <Text style={styles.genreName}>{GENRE_DISPLAY_NAMES[genre].toLowerCase()}</Text>
              </View>
            ))}
          </View>
        )}
      </View>

      {/* Slot Unlock Progress section */}
      {progress?.slotProgress && (
        <SlotProgress
          slotProgress={progress.slotProgress}
          unlockedSlots={progress.loadout?.unlockedSlots || 1}
        />
      )}
    </ScrollView>
  );
}

type FontSize = 'micro' | 'small' | 'body' | 'large' | 'title' | 'hero';
type LetterSpacingSize = 'tight' | 'normal' | 'wide' | 'hero';

function createStyles(colors: any, spacing: (n: number) => number, fontSize: (size: FontSize) => number, letterSpacing: (size: LetterSpacingSize) => number) {
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
    streakProgress: {
      color: colors.textMuted,
      fontFamily: FONTS.mono,
      fontSize: fontSize('micro'),
      letterSpacing: letterSpacing('tight'),
      textAlign: 'center',
      marginTop: spacing(1),
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
    // Loot box styles
    lootBoxLink: {
      flexDirection: 'row',
      alignItems: 'center',
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing(3),
      gap: spacing(3),
    },
    lootBoxCount: {
      color: colors.text,
      fontFamily: FONTS.mono,
      fontWeight: FONTS.monoBold,
      fontSize: fontSize('title'),
    },
    lootBoxDetails: {
      flex: 1,
    },
    lootBoxLabel: {
      color: colors.textSecondary,
      fontFamily: FONTS.mono,
      fontSize: fontSize('small'),
    },
    lootBoxBreakdown: {
      color: colors.textMuted,
      fontFamily: FONTS.mono,
      fontSize: fontSize('micro'),
      marginTop: spacing(1),
    },
    goldText: {
      color: '#FFD700',
    },
    silverText: {
      color: '#C0C0C0',
    },
    woodText: {
      color: '#8B4513',
    },
    lootBoxArrow: {
      color: colors.textSecondary,
      fontFamily: FONTS.mono,
      fontSize: fontSize('small'),
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
    genreHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: spacing(2),
    },
    expandIcon: {
      color: colors.textSecondary,
      fontFamily: FONTS.mono,
      fontSize: fontSize('small'),
    },
    genreGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: spacing(2),
      marginTop: spacing(2),
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
    // Active consumables styles
    consumablesList: {
      gap: spacing(3),
    },
    consumableItem: {
      borderWidth: 1,
      borderColor: colors.border,
      padding: spacing(3),
    },
    consumableRow: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: spacing(3),
    },
    consumableInfo: {
      flex: 1,
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
