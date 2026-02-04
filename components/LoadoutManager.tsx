import React from 'react';
import { View, Text, Image, Pressable, StyleSheet } from 'react-native';
import { useTheme, FONTS } from '@/lib/ui';
import {
  type Companion,
  type CompanionLoadout,
  type SlotUnlockProgress,
  calculateSlot2Progress,
  calculateSlot3Progress,
  SLOT_2_POINTS,
  SLOT_3_POINTS,
} from '@/lib/shared';
import { isSlotUnlocked } from '@/lib/shared/loadout';

export interface LoadoutManagerProps {
  loadout: CompanionLoadout;
  companions: Companion[]; // Available companions to equip
  slotProgress: SlotUnlockProgress;
  onEquip: (slotIndex: number, companionId: string) => void;
  onUnequip: (slotIndex: number) => void;
  onSlotPress?: (slotIndex: number) => void; // Tap slot to open companion selector
}

/**
 * Reusable component for managing the 3-slot companion loadout system.
 * Displays equipped companions, locked/unlocked states, and progress bars.
 */
export function LoadoutManager({
  loadout,
  companions,
  slotProgress,
  onUnequip,
  onSlotPress,
}: LoadoutManagerProps) {
  const { colors, spacing, fontSize, letterSpacing } = useTheme();
  const styles = createStyles(colors, spacing, fontSize, letterSpacing);

  // Get companion by ID from the available companions list
  const getCompanionById = (id: string | null): Companion | undefined => {
    if (!id) return undefined;
    return companions.find((c) => c.id === id);
  };

  // Get rarity color
  const getRarityColor = (rarity: string): string => {
    const rarityColors: Record<string, string> = {
      common: colors.rarityCommon,
      rare: colors.rarityRare,
      legendary: colors.rarityLegendary,
    };
    return rarityColors[rarity] || colors.text;
  };

  // Calculate progress percentage for a locked slot
  const getSlotProgress = (slotIndex: number): { current: number; required: number } => {
    if (slotIndex === 1) {
      return { current: calculateSlot2Progress(slotProgress), required: SLOT_2_POINTS };
    }
    if (slotIndex === 2) {
      return { current: calculateSlot3Progress(slotProgress), required: SLOT_3_POINTS };
    }
    return { current: 0, required: 0 };
  };

  const renderSlot = (slotIndex: number) => {
    const unlocked = isSlotUnlocked(loadout, slotIndex);
    const companionId = loadout.slots[slotIndex];
    const companion = getCompanionById(companionId);
    const { current, required } = getSlotProgress(slotIndex);
    const progressPercentage = required > 0 ? Math.min((current / required) * 100, 100) : 0;

    if (!unlocked) {
      // Locked slot
      return (
        <View key={slotIndex} style={styles.slotContainer}>
          <View style={[styles.slot, styles.slotLocked]}>
            <Text style={styles.lockIcon}>locked</Text>
            <Text style={styles.slotNumber}>slot {slotIndex + 1}</Text>
          </View>
          {/* Progress bar for locked slots */}
          <View style={styles.progressContainer}>
            <View style={styles.progressTrack}>
              <View
                style={[
                  styles.progressFill,
                  { width: `${progressPercentage}%` },
                ]}
              />
            </View>
            <Text style={styles.progressText}>
              {current}/{required}
            </Text>
          </View>
        </View>
      );
    }

    if (companion) {
      // Equipped companion
      const rarityColor = getRarityColor(companion.rarity);
      return (
        <View key={slotIndex} style={styles.slotContainer}>
          <Pressable
            style={[styles.slot, styles.slotEquipped, { borderColor: rarityColor }]}
            onPress={() => onSlotPress?.(slotIndex)}
            onLongPress={() => onUnequip(slotIndex)}
          >
            {companion.imageUrl ? (
              <Image
                source={{ uri: companion.imageUrl }}
                style={styles.companionImage}
                resizeMode="cover"
              />
            ) : (
              <View style={[styles.imagePlaceholder]}>
                <Text style={styles.placeholderText}>?</Text>
              </View>
            )}
          </Pressable>
          <Text style={[styles.companionName, { color: rarityColor }]} numberOfLines={1}>
            {companion.name.toLowerCase()}
          </Text>
          <Text style={styles.rarityLabel}>[{companion.rarity}]</Text>
        </View>
      );
    }

    // Empty unlocked slot
    return (
      <View key={slotIndex} style={styles.slotContainer}>
        <Pressable
          style={[styles.slot, styles.slotEmpty]}
          onPress={() => onSlotPress?.(slotIndex)}
        >
          <Text style={styles.emptyText}>+</Text>
          <Text style={styles.slotNumber}>slot {slotIndex + 1}</Text>
        </Pressable>
        <Text style={styles.emptyLabel}>empty</Text>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>loadout</Text>
      <View style={styles.slotsRow}>
        {[0, 1, 2].map((slotIndex) => renderSlot(slotIndex))}
      </View>
      <Text style={styles.hint}>tap to equip / hold to unequip</Text>
    </View>
  );
}

const createStyles = (
  colors: ReturnType<typeof useTheme>['colors'],
  spacing: ReturnType<typeof useTheme>['spacing'],
  fontSize: ReturnType<typeof useTheme>['fontSize'],
  letterSpacing: ReturnType<typeof useTheme>['letterSpacing']
) =>
  StyleSheet.create({
    container: {
      padding: spacing(4),
    },
    title: {
      fontFamily: FONTS.mono,
      fontSize: fontSize('body'),
      letterSpacing: letterSpacing('wide'),
      color: colors.text,
      marginBottom: spacing(4),
    },
    slotsRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: spacing(3),
    },
    slotContainer: {
      flex: 1,
      alignItems: 'center',
    },
    slot: {
      width: '100%',
      aspectRatio: 1,
      justifyContent: 'center',
      alignItems: 'center',
      borderWidth: 1,
    },
    slotLocked: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      opacity: 0.5,
    },
    slotEquipped: {
      backgroundColor: colors.surface,
      borderWidth: 2,
    },
    slotEmpty: {
      backgroundColor: colors.surface,
      borderColor: colors.border,
      borderStyle: 'dashed',
    },
    lockIcon: {
      fontFamily: FONTS.mono,
      fontSize: fontSize('small'),
      color: colors.textMuted,
      letterSpacing: letterSpacing('tight'),
    },
    slotNumber: {
      fontFamily: FONTS.mono,
      fontSize: fontSize('micro'),
      color: colors.textMuted,
      marginTop: spacing(1),
    },
    companionImage: {
      width: '100%',
      height: '100%',
    },
    imagePlaceholder: {
      width: '100%',
      height: '100%',
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: colors.surface,
    },
    placeholderText: {
      fontFamily: FONTS.mono,
      fontSize: 32,
      color: colors.textMuted,
    },
    companionName: {
      fontFamily: FONTS.mono,
      fontSize: fontSize('small'),
      letterSpacing: letterSpacing('tight'),
      marginTop: spacing(2),
      textAlign: 'center',
    },
    rarityLabel: {
      fontFamily: FONTS.mono,
      fontSize: fontSize('micro'),
      color: colors.textSecondary,
      marginTop: spacing(1),
    },
    emptyText: {
      fontFamily: FONTS.mono,
      fontSize: 24,
      color: colors.textMuted,
    },
    emptyLabel: {
      fontFamily: FONTS.mono,
      fontSize: fontSize('micro'),
      color: colors.textMuted,
      marginTop: spacing(2),
    },
    progressContainer: {
      width: '100%',
      marginTop: spacing(2),
      alignItems: 'center',
    },
    progressTrack: {
      width: '100%',
      height: 4,
      backgroundColor: colors.border,
      borderRadius: 2,
      overflow: 'hidden',
    },
    progressFill: {
      height: '100%',
      backgroundColor: colors.success,
    },
    progressText: {
      fontFamily: FONTS.mono,
      fontSize: fontSize('micro'),
      color: colors.textMuted,
      marginTop: spacing(1),
    },
    hint: {
      fontFamily: FONTS.mono,
      fontSize: fontSize('micro'),
      color: colors.textMuted,
      textAlign: 'center',
      marginTop: spacing(4),
    },
  });
