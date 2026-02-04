import { useCallback, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, Pressable } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, router } from 'expo-router';
import { storage } from '@/lib/storage';
import { calculateLevel, xpProgress, getStreakMultiplierInfo } from '@/lib/xp';
import { Book, UserProgress } from '@/lib/shared';
import { FONTS, useTheme } from '@/lib/ui';
import { getConsumableById, formatDuration } from '@/lib/consumables';
import { DungeonBar, DungeonCard, ConsumableIcon } from '@/components/dungeon';
import { SlotProgress } from '@/components/SlotProgress';
import { GenreProgress } from '@/components/GenreProgress';

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
  const streakInfo = getStreakMultiplierInfo(progress?.currentStreak || 0);
  const totalTime = books.reduce((sum, b) => sum + b.totalReadingTime, 0);
  const hours = Math.floor(totalTime / 3600);

  // Calculate loot box counts
  const v2BoxCount = progress?.lootBoxes?.availableBoxes?.length || 0;
  const v3Boxes = progress?.lootBoxesV3 || [];
  const totalBoxCount = v2BoxCount + v3Boxes.length;
  const woodCount = v3Boxes.filter(b => b.tier === 'wood').length;
  const silverCount = v3Boxes.filter(b => b.tier === 'silver').length;
  const goldCount = v3Boxes.filter(b => b.tier === 'gold').length;

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

      {/* Active Effects section */}
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

      {/* Genre Levels section with threshold markers */}
      {progress?.genreLevels && (
        <GenreProgress genreLevels={progress.genreLevels} />
      )}

      {/* Slot Unlock Progress section */}
      {progress?.slotProgress && (
        <SlotProgress
          slotProgress={progress.slotProgress}
          unlockedSlots={(() => {
            // Derive unlocked slots from slotProgress
            const sp = progress.slotProgress;
            if (!sp) return 1;
            if (sp.slot2Points >= 100 && sp.slot3Points >= 300) return 3;
            if (sp.slot2Points >= 100) return 2;
            return 1;
          })()}
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
