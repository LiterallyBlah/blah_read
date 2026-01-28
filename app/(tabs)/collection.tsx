import React, { useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet, Text, Pressable, Image, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect } from 'expo-router';
import { useTheme } from '@/lib/ThemeContext';
import { FONTS } from '@/lib/theme';
import { storage } from '@/lib/storage';
import { settings } from '@/lib/settings';
import type { Book, Companion, LootBoxState, CompanionLoadout, UserProgress } from '@/lib/types';
import { equipCompanion, unequipCompanion, getEquippedCompanionIds, isSlotUnlocked } from '@/lib/loadout';
import { canEquipCompanion, EFFECT_TYPES, EquipRequirements, CompanionEffect } from '@/lib/companionEffects';
import { GENRE_DISPLAY_NAMES, Genre } from '@/lib/genres';

type FilterType = 'all' | 'character' | 'creature' | 'object';
type RarityFilter = 'all' | 'common' | 'rare' | 'legendary';

interface DisplayCompanion extends Companion {
  isLocked: boolean;
  bookTitle: string;
  bookLevel: number;
  bookGenres: Genre[];
}

export default function CollectionScreen() {
  const { colors, spacing, fontSize, letterSpacing } = useTheme();
  const insets = useSafeAreaInsets();
  const [books, setBooks] = useState<Book[]>([]);
  const [lootBoxes, setLootBoxes] = useState<LootBoxState | null>(null);
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>('all');
  const [debugMode, setDebugMode] = useState(false);
  const [loadout, setLoadout] = useState<CompanionLoadout | null>(null);
  const [genreLevels, setGenreLevels] = useState<Record<Genre, number> | null>(null);
  const styles = createStyles(colors, spacing, fontSize, letterSpacing);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    const [loadedBooks, progress, config] = await Promise.all([
      storage.getBooks(),
      storage.getProgress(),
      settings.get(),
    ]);
    setBooks(loadedBooks);
    setLootBoxes(progress.lootBoxes);
    setDebugMode(config.debugMode);
    setLoadout(progress.loadout || { slots: [null, null, null], unlockedSlots: 1 });
    setGenreLevels(progress.genreLevels || null);
  }

  // Get equipped companion IDs
  const equippedIds = loadout ? getEquippedCompanionIds(loadout) : [];

  // Find which slot a companion is in (returns -1 if not equipped)
  function getEquippedSlot(companionId: string): number {
    if (!loadout) return -1;
    return loadout.slots.findIndex(id => id === companionId);
  }

  // Handle equip action - shows slot selector
  async function handleEquip(companion: DisplayCompanion) {
    if (!loadout) return;

    // Check if companion meets requirements
    const targetGenre = companion.effects?.[0]?.targetGenre;
    const genreLevel = targetGenre && genreLevels ? genreLevels[targetGenre] : 0;
    const bookLevel = companion.bookLevel;

    const requirements = canEquipCompanion(
      companion.rarity,
      targetGenre,
      genreLevel,
      bookLevel
    );

    if (!requirements.canEquip) {
      let message = 'Requirements not met:\n';
      if (requirements.missingBookLevel) {
        message += `- Book level ${requirements.requiredBookLevel} required (current: ${bookLevel})\n`;
      }
      if (requirements.missingGenreLevel && targetGenre) {
        message += `- ${GENRE_DISPLAY_NAMES[targetGenre]} level ${requirements.requiredGenreLevel} required (current: ${genreLevel})`;
      }
      Alert.alert('Cannot Equip', message);
      return;
    }

    // Build slot options
    const slotOptions: { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }[] = [];

    for (let i = 0; i < 3; i++) {
      const isUnlocked = isSlotUnlocked(loadout, i);
      const currentOccupant = loadout.slots[i];

      if (!isUnlocked) {
        slotOptions.push({
          text: `Slot ${i + 1} (locked)`,
          style: 'cancel',
        });
      } else if (currentOccupant) {
        // Find the companion name
        const occupantCompanion = allCompanions.find(c => c.id === currentOccupant);
        slotOptions.push({
          text: `Slot ${i + 1} (${occupantCompanion?.name || 'occupied'})`,
          onPress: () => confirmEquipSlot(companion.id, i, occupantCompanion?.name),
        });
      } else {
        slotOptions.push({
          text: `Slot ${i + 1} (empty)`,
          onPress: () => equipToSlot(companion.id, i),
        });
      }
    }

    slotOptions.push({ text: 'Cancel', style: 'cancel' });

    Alert.alert(
      `Equip ${companion.name}`,
      'Choose a slot:',
      slotOptions
    );
  }

  // Confirm replacing an existing companion
  function confirmEquipSlot(companionId: string, slotIndex: number, replaceName?: string) {
    Alert.alert(
      'Replace Companion',
      `Replace ${replaceName || 'current companion'} in slot ${slotIndex + 1}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Replace', onPress: () => equipToSlot(companionId, slotIndex) },
      ]
    );
  }

  // Actually equip to a slot
  async function equipToSlot(companionId: string, slotIndex: number) {
    if (!loadout) return;

    try {
      const newLoadout = equipCompanion(loadout, companionId, slotIndex);
      const progress = await storage.getProgress();
      await storage.saveProgress({ ...progress, loadout: newLoadout });
      setLoadout(newLoadout);
    } catch (error) {
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to equip companion');
    }
  }

  // Handle unequip action
  async function handleUnequip(companion: DisplayCompanion) {
    const slotIndex = getEquippedSlot(companion.id);
    if (slotIndex === -1 || !loadout) return;

    Alert.alert(
      'Unequip Companion',
      `Remove ${companion.name} from slot ${slotIndex + 1}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unequip',
          onPress: async () => {
            try {
              const newLoadout = unequipCompanion(loadout, slotIndex);
              const progress = await storage.getProgress();
              await storage.saveProgress({ ...progress, loadout: newLoadout });
              setLoadout(newLoadout);
            } catch (error) {
              Alert.alert('Error', error instanceof Error ? error.message : 'Failed to unequip companion');
            }
          },
        },
      ]
    );
  }

  // Collect companions based on debug mode
  const allCompanions: DisplayCompanion[] = books.flatMap(book => {
    if (!book.companions) return [];

    const bookLevel = book.progression?.level || 1;
    const bookGenres = (book.normalizedGenres || []) as Genre[];

    const unlocked: DisplayCompanion[] = book.companions.unlockedCompanions.map(c => ({
      ...c,
      isLocked: false,
      bookTitle: book.title,
      bookLevel,
      bookGenres,
    }));

    if (debugMode) {
      // In debug mode, also include locked companions from queues
      const lockedFromReadingQueue: DisplayCompanion[] = book.companions.readingTimeQueue.companions
        .filter(c => !c.unlockedAt)
        .map(c => ({
          ...c,
          isLocked: true,
          bookTitle: book.title,
          bookLevel,
          bookGenres,
        }));

      const lockedFromPoolQueue: DisplayCompanion[] = book.companions.poolQueue.companions
        .filter(c => !c.unlockedAt)
        .map(c => ({
          ...c,
          isLocked: true,
          bookTitle: book.title,
          bookLevel,
          bookGenres,
        }));

      return [...unlocked, ...lockedFromReadingQueue, ...lockedFromPoolQueue];
    }

    return unlocked;
  });

  // Apply filters
  const filtered = allCompanions.filter(c => {
    if (typeFilter !== 'all' && c.type !== typeFilter) return false;
    if (rarityFilter !== 'all' && c.rarity !== rarityFilter) return false;
    return true;
  });

  // Debug: unlock a companion manually
  async function handleDebugUnlock(companion: DisplayCompanion) {
    const book = books.find(b => b.id === companion.bookId);
    if (!book?.companions) return;

    Alert.alert(
      'Debug Unlock',
      `Unlock "${companion.name}" from "${book.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlock',
          onPress: async () => {
            const unlockedCompanion: Companion = {
              ...companion,
              unlockMethod: 'reading_time',
              unlockedAt: Date.now(),
            };

            // Remove from queue and add to unlocked
            const updatedBook = { ...book };
            updatedBook.companions = { ...book.companions! };

            // Check reading time queue
            const rtIndex = updatedBook.companions.readingTimeQueue.companions.findIndex(c => c.id === companion.id);
            if (rtIndex !== -1) {
              updatedBook.companions.readingTimeQueue = {
                ...updatedBook.companions.readingTimeQueue,
                companions: updatedBook.companions.readingTimeQueue.companions.map((c, i) =>
                  i === rtIndex ? unlockedCompanion : c
                ),
              };
            }

            // Check pool queue
            const poolIndex = updatedBook.companions.poolQueue.companions.findIndex(c => c.id === companion.id);
            if (poolIndex !== -1) {
              updatedBook.companions.poolQueue = {
                ...updatedBook.companions.poolQueue,
                companions: updatedBook.companions.poolQueue.companions.map((c, i) =>
                  i === poolIndex ? unlockedCompanion : c
                ),
              };
            }

            // Add to unlocked companions
            updatedBook.companions.unlockedCompanions = [
              ...updatedBook.companions.unlockedCompanions,
              unlockedCompanion,
            ];

            await storage.saveBook(updatedBook);
            await loadData();
          },
        },
      ]
    );
  }

  // Stats - total possible companions across all books
  const totalPossible = books.reduce((sum, book) => {
    if (!book.companions) return sum;
    return sum +
      book.companions.readingTimeQueue.companions.length +
      book.companions.poolQueue.companions.length +
      book.companions.unlockedCompanions.length;
  }, 0);

  const unlockedCount = allCompanions.filter(c => !c.isLocked).length;
  const lockedCount = allCompanions.filter(c => c.isLocked).length;

  const boxCount = lootBoxes?.availableBoxes.length || 0;

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>collection_</Text>
        <Text style={styles.stats}>
          {unlockedCount}/{totalPossible} collected
        </Text>
      </View>

      {/* Debug mode banner */}
      {debugMode && (
        <View style={styles.debugBanner}>
          <Text style={styles.debugBannerText}>
            debug mode: showing all {allCompanions.length} companions ({lockedCount} locked)
          </Text>
          <Text style={styles.debugHint}>tap locked companions to unlock</Text>
        </View>
      )}

      {/* Loot box prompt */}
      {boxCount > 0 && (
        <Pressable
          style={styles.lootBoxBanner}
          onPress={() => router.push('/loot-box')}
        >
          <Text style={styles.lootBoxText}>
            [ {boxCount} box{boxCount !== 1 ? 'es' : ''} to open ]
          </Text>
        </Pressable>
      )}

      {/* Type filter */}
      <View style={styles.filterRow}>
        {(['all', 'character', 'creature', 'object'] as FilterType[]).map(type => (
          <Pressable
            key={type}
            onPress={() => setTypeFilter(type)}
            style={[
              styles.filterButton,
              typeFilter === type && styles.filterButtonActive,
            ]}
          >
            <Text style={[
              styles.filterText,
              typeFilter === type && styles.filterTextActive,
            ]}>
              {type}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Rarity filter */}
      <View style={styles.filterRow}>
        {(['all', 'common', 'rare', 'legendary'] as RarityFilter[]).map(rarity => (
          <Pressable
            key={rarity}
            onPress={() => setRarityFilter(rarity)}
            style={[
              styles.filterButton,
              rarityFilter === rarity && styles.filterButtonActive,
            ]}
          >
            <Text style={[
              styles.filterText,
              rarityFilter === rarity && styles.filterTextActive,
            ]}>
              {rarity}
            </Text>
          </Pressable>
        ))}
      </View>

      {/* Companion grid */}
      <View style={[styles.grid, { paddingBottom: spacing(6) + insets.bottom }]}>
        {filtered.map(companion => {
          const equippedSlot = getEquippedSlot(companion.id);
          const isEquipped = equippedSlot !== -1;

          // Check equip requirements for unlocked companions
          let equipRequirements: EquipRequirements | null = null;
          if (!companion.isLocked) {
            const targetGenre = companion.effects?.[0]?.targetGenre;
            const genreLevel = targetGenre && genreLevels ? genreLevels[targetGenre] : 0;
            equipRequirements = canEquipCompanion(
              companion.rarity,
              targetGenre,
              genreLevel,
              companion.bookLevel
            );
          }

          return (
            <CompanionCard
              key={companion.id}
              companion={companion}
              colors={colors}
              spacing={spacing}
              debugMode={debugMode}
              isEquipped={isEquipped}
              equippedSlot={equippedSlot}
              equipRequirements={equipRequirements}
              genreLevels={genreLevels}
              onPress={companion.isLocked && debugMode ? () => handleDebugUnlock(companion) : undefined}
              onEquip={() => handleEquip(companion)}
              onUnequip={() => handleUnequip(companion)}
            />
          );
        })}
        {filtered.length === 0 && (
          <Text style={styles.emptyText}>
            no companions found_
          </Text>
        )}
      </View>
    </ScrollView>
  );
}

// Format effect for display
function formatEffect(effect: CompanionEffect): string {
  const percentage = Math.round(effect.magnitude * 100);
  const typeLabels: Record<string, string> = {
    'xp_boost': 'XP',
    'luck_boost': 'Luck',
    'drop_rate_boost': 'Drop Rate',
    'completion_bonus': 'Completion',
  };
  const label = typeLabels[effect.type] || effect.type;
  const genreSuffix = effect.targetGenre ? ` (${GENRE_DISPLAY_NAMES[effect.targetGenre]})` : '';
  return `+${percentage}% ${label}${genreSuffix}`;
}

function CompanionCard({
  companion,
  colors,
  spacing,
  debugMode,
  isEquipped,
  equippedSlot,
  equipRequirements,
  genreLevels,
  onPress,
  onEquip,
  onUnequip,
}: {
  companion: DisplayCompanion;
  colors: ReturnType<typeof useTheme>['colors'];
  spacing: ReturnType<typeof useTheme>['spacing'];
  debugMode?: boolean;
  isEquipped?: boolean;
  equippedSlot?: number;
  equipRequirements?: EquipRequirements | null;
  genreLevels?: Record<Genre, number> | null;
  onPress?: () => void;
  onEquip?: () => void;
  onUnequip?: () => void;
}) {
  const rarityColors: Record<string, string> = {
    common: colors.rarityCommon,
    rare: colors.rarityRare,
    legendary: colors.rarityLegendary,
  };

  const borderColor = companion.isLocked
    ? colors.border
    : (rarityColors[companion.rarity] || colors.border);

  const CardWrapper = onPress ? Pressable : View;

  // Determine if we can show equip button
  const showEquipButton = !companion.isLocked && !isEquipped;
  const showUnequipButton = !companion.isLocked && isEquipped;
  const canEquip = equipRequirements?.canEquip ?? false;

  return (
    <CardWrapper
      onPress={onPress}
      style={{
        width: '48%',
        marginBottom: spacing(4),
        padding: spacing(3),
        borderWidth: isEquipped ? 2 : 1,
        borderColor: isEquipped ? colors.text : borderColor,
        borderStyle: companion.isLocked ? 'dashed' : 'solid',
        opacity: companion.isLocked ? 0.6 : 1,
      }}
    >
      {/* Equipped indicator */}
      {isEquipped && equippedSlot !== undefined && (
        <View style={{
          position: 'absolute',
          top: -1,
          right: -1,
          backgroundColor: colors.text,
          paddingHorizontal: spacing(2),
          paddingVertical: spacing(1),
          zIndex: 1,
        }}>
          <Text style={{
            color: colors.background,
            fontFamily: FONTS.mono,
            fontSize: 9,
            fontWeight: FONTS.monoBold,
          }}>
            slot {equippedSlot + 1}
          </Text>
        </View>
      )}

      {companion.isLocked && !debugMode ? (
        // Locked companion - show silhouette (only in non-debug mode)
        <View style={{
          width: '100%',
          aspectRatio: 1,
          marginBottom: spacing(2),
          backgroundColor: colors.surface,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <Text style={{ color: colors.textMuted, fontFamily: FONTS.mono, fontSize: 24 }}>?</Text>
        </View>
      ) : companion.imageUrl ? (
        <View style={{ width: '100%', aspectRatio: 1, marginBottom: spacing(2) }}>
          <Image
            source={{ uri: companion.imageUrl }}
            style={{
              width: '100%',
              height: '100%',
              backgroundColor: colors.surface,
            }}
            resizeMode="contain"
          />
          {companion.isLocked && debugMode && (
            <View style={{
              position: 'absolute',
              top: 4,
              right: 4,
              backgroundColor: 'rgba(0,0,0,0.7)',
              borderRadius: 4,
              padding: 2,
            }}>
              <Text style={{ fontSize: 10 }}>locked</Text>
            </View>
          )}
        </View>
      ) : (
        <View style={{
          width: '100%',
          aspectRatio: 1,
          marginBottom: spacing(2),
          backgroundColor: colors.surface,
          justifyContent: 'center',
          alignItems: 'center',
        }}>
          <Text style={{ color: colors.textMuted, fontFamily: FONTS.mono }}>?</Text>
        </View>
      )}
      <Text style={{
        color: companion.isLocked ? colors.textMuted : colors.text,
        fontFamily: FONTS.mono,
        fontSize: 12,
        marginBottom: spacing(1),
      }}>
        {companion.isLocked && !debugMode ? '???' : companion.name.toLowerCase()}
      </Text>
      <Text style={{
        color: companion.isLocked ? colors.textMuted : borderColor,
        fontFamily: FONTS.mono,
        fontSize: 10,
      }}>
        [{companion.rarity}] {companion.type}
      </Text>
      <Text style={{
        color: colors.textMuted,
        fontFamily: FONTS.mono,
        fontSize: 10,
        marginTop: spacing(1),
      }}>
        {companion.bookTitle.toLowerCase().substring(0, 20)}{companion.bookTitle.length > 20 ? '...' : ''}
      </Text>

      {/* Effects display */}
      {!companion.isLocked && companion.effects && companion.effects.length > 0 && (
        <View style={{ marginTop: spacing(2) }}>
          {companion.effects.map((effect, idx) => (
            <Text key={idx} style={{
              color: colors.textSecondary,
              fontFamily: FONTS.mono,
              fontSize: 9,
            }}>
              {formatEffect(effect)}
            </Text>
          ))}
        </View>
      )}

      {/* Gating requirements display */}
      {!companion.isLocked && equipRequirements && !equipRequirements.canEquip && (
        <View style={{
          marginTop: spacing(2),
          paddingTop: spacing(2),
          borderTopWidth: 1,
          borderTopColor: colors.border,
        }}>
          <Text style={{
            color: '#f59e0b',
            fontFamily: FONTS.mono,
            fontSize: 9,
          }}>
            requires:
          </Text>
          {equipRequirements.missingBookLevel !== undefined && (
            <Text style={{
              color: '#f59e0b',
              fontFamily: FONTS.mono,
              fontSize: 9,
            }}>
              book lv.{equipRequirements.requiredBookLevel}
            </Text>
          )}
          {equipRequirements.missingGenreLevel !== undefined && companion.effects?.[0]?.targetGenre && (
            <Text style={{
              color: '#f59e0b',
              fontFamily: FONTS.mono,
              fontSize: 9,
            }}>
              {GENRE_DISPLAY_NAMES[companion.effects[0].targetGenre].toLowerCase()} lv.{equipRequirements.requiredGenreLevel}
            </Text>
          )}
        </View>
      )}

      {/* Equip/Unequip button */}
      {showEquipButton && (
        <Pressable
          onPress={onEquip}
          style={{
            marginTop: spacing(2),
            paddingVertical: spacing(2),
            borderWidth: 1,
            borderColor: canEquip ? colors.text : colors.border,
            alignItems: 'center',
            opacity: canEquip ? 1 : 0.5,
          }}
        >
          <Text style={{
            color: canEquip ? colors.text : colors.textMuted,
            fontFamily: FONTS.mono,
            fontSize: 10,
          }}>
            [ equip ]
          </Text>
        </Pressable>
      )}

      {showUnequipButton && (
        <Pressable
          onPress={onUnequip}
          style={{
            marginTop: spacing(2),
            paddingVertical: spacing(2),
            borderWidth: 1,
            borderColor: colors.border,
            alignItems: 'center',
          }}
        >
          <Text style={{
            color: colors.textMuted,
            fontFamily: FONTS.mono,
            fontSize: 10,
          }}>
            [ unequip ]
          </Text>
        </Pressable>
      )}
    </CardWrapper>
  );
}

function createStyles(
  colors: ReturnType<typeof useTheme>['colors'],
  spacing: ReturnType<typeof useTheme>['spacing'],
  fontSize: ReturnType<typeof useTheme>['fontSize'],
  letterSpacing: ReturnType<typeof useTheme>['letterSpacing']
) {
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: colors.background,
    },
    header: {
      padding: spacing(6),
      paddingTop: spacing(16),
    },
    title: {
      fontFamily: FONTS.mono,
      fontWeight: FONTS.monoBold,
      fontSize: fontSize('title'),
      letterSpacing: letterSpacing('normal'),
      color: colors.text,
      marginBottom: spacing(2),
    },
    stats: {
      fontFamily: FONTS.mono,
      fontSize: fontSize('body'),
      letterSpacing: letterSpacing('tight'),
      color: colors.textSecondary,
    },
    lootBoxBanner: {
      marginHorizontal: spacing(6),
      marginBottom: spacing(4),
      padding: spacing(4),
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
    },
    lootBoxText: {
      fontFamily: FONTS.mono,
      fontWeight: FONTS.monoBold,
      fontSize: fontSize('body'),
      color: colors.text,
    },
    filterRow: {
      flexDirection: 'row',
      paddingHorizontal: spacing(6),
      marginBottom: spacing(2),
      gap: spacing(2),
      flexWrap: 'wrap',
    },
    filterButton: {
      paddingHorizontal: spacing(3),
      paddingVertical: spacing(2),
      borderWidth: 1,
      borderColor: colors.border,
    },
    filterButtonActive: {
      borderColor: colors.text,
    },
    filterText: {
      fontFamily: FONTS.mono,
      fontSize: 10,
      letterSpacing: letterSpacing('tight'),
      color: colors.textMuted,
    },
    filterTextActive: {
      color: colors.text,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      padding: spacing(6),
      justifyContent: 'space-between',
    },
    emptyText: {
      fontFamily: FONTS.mono,
      fontSize: fontSize('body'),
      letterSpacing: letterSpacing('tight'),
      color: colors.textMuted,
      width: '100%',
      textAlign: 'center',
      paddingVertical: spacing(8),
    },
    debugBanner: {
      marginHorizontal: spacing(6),
      marginBottom: spacing(4),
      padding: spacing(3),
      borderWidth: 1,
      borderColor: '#f59e0b',
      borderStyle: 'dashed',
      backgroundColor: 'rgba(245, 158, 11, 0.1)',
    },
    debugBannerText: {
      fontFamily: FONTS.mono,
      fontSize: fontSize('small'),
      color: '#f59e0b',
      textAlign: 'center',
    },
    debugHint: {
      fontFamily: FONTS.mono,
      fontSize: 10,
      color: '#f59e0b',
      textAlign: 'center',
      marginTop: spacing(1),
      opacity: 0.8,
    },
  });
}
