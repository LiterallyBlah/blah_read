import React, { useCallback, useState } from 'react';
import { View, ScrollView, StyleSheet, Text, Pressable, Image, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { useTheme } from '@/lib/ThemeContext';
import { FONTS } from '@/lib/theme';
import { storage } from '@/lib/storage';
import { settings } from '@/lib/settings';
import { debug, setDebugEnabled } from '@/lib/debug';
import { maybeGenerateImages, shouldGenerateMoreImages } from '@/lib/companionImageQueue';
import { generateImageForCompanion } from '@/lib/imageGen';
import type { Book, Companion, LootBoxState, CompanionLoadout, UserProgress, LootBoxV3, LootBoxTier } from '@/lib/types';
import type { Settings } from '@/lib/settings';
import { equipCompanion, unequipCompanion, getEquippedCompanionIds, isSlotUnlocked, equipCompanionToBook, unequipCompanionFromBook, getBookLoadout } from '@/lib/loadout';
import { canEquipCompanion, EFFECT_TYPES, EquipRequirements, CompanionEffect } from '@/lib/companionEffects';
import { GENRE_DISPLAY_NAMES, Genre } from '@/lib/genres';
import { PixelSprite } from '@/components/dungeon';
import { TintedChest } from '@/components/dungeon/TintedChest';

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

  // Route params for per-book equipping flow
  const { bookId, slotIndex } = useLocalSearchParams<{ bookId?: string; slotIndex?: string }>();
  const paramBookId = bookId || null;
  const paramSlotIndex = slotIndex ? parseInt(slotIndex, 10) : null;

  const [books, setBooks] = useState<Book[]>([]);
  const [defaultBookId, setDefaultBookId] = useState<string | null>(null); // From lastActiveBookId
  const [lootBoxes, setLootBoxes] = useState<LootBoxState | null>(null);
  const [lootBoxesV3, setLootBoxesV3] = useState<LootBoxV3[]>([]);
  const [typeFilter, setTypeFilter] = useState<FilterType>('all');
  const [rarityFilter, setRarityFilter] = useState<RarityFilter>('all');
  const [debugMode, setDebugMode] = useState(false);
  const [loadout, setLoadout] = useState<CompanionLoadout | null>(null);
  const [genreLevels, setGenreLevels] = useState<Record<Genre, number> | null>(null);
  const [config, setConfig] = useState<Settings | null>(null);
  const styles = createStyles(colors, spacing, fontSize, letterSpacing);

  // Use param bookId if provided, otherwise fall back to defaultBookId (lastActiveBook)
  const targetBookId = paramBookId || defaultBookId;
  const targetSlotIndex = paramSlotIndex; // Only set when coming from book detail with specific slot

  // Check if any books are currently being read
  const hasAnyBooksReading = books.some(b => b.status === 'reading');

  // Get target book info for per-book equipping mode
  const targetBook = targetBookId ? books.find(b => b.id === targetBookId) : null;
  // Only consider target book valid if it's still being read
  const targetBookIsReading = targetBook?.status === 'reading';
  // Direct equip mode: has both book AND specific slot (from book detail)
  // Slot selector mode: has book but no specific slot (from tabs)
  const isDirectEquipMode = targetBook !== null && targetBookIsReading && targetSlotIndex !== null;
  const hasBookContext = targetBook !== null && targetBookIsReading;

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [])
  );

  async function loadData() {
    debug.log('collection', 'loadData starting');
    const [loadedBooks, progress, config, lastActiveId] = await Promise.all([
      storage.getBooks(),
      storage.getProgress(),
      settings.get(),
      storage.getLastActiveBookId(),
    ]);

    // Set default book from lastActiveBookId (the current home screen top card)
    if (lastActiveId) {
      setDefaultBookId(lastActiveId);
    }

    setDebugEnabled(config.debugMode);

    debug.log('collection', 'Data loaded', {
      bookCount: loadedBooks.length,
      debugMode: config.debugMode,
      booksWithCompanions: loadedBooks.filter(b => b.companions).length,
    });

    // Log companion counts for debugging
    for (const book of loadedBooks) {
      if (book.companions) {
        const unlockedWithImages = book.companions.unlockedCompanions.filter(c => c.imageUrl).length;
        const rtWithImages = book.companions.readingTimeQueue.companions.filter(c => c.imageUrl).length;
        const poolWithImages = book.companions.poolQueue.companions.filter(c => c.imageUrl).length;
        debug.log('collection', `Book "${book.title}" companions`, {
          unlocked: book.companions.unlockedCompanions.length,
          unlockedWithImages,
          readingTimeQueue: book.companions.readingTimeQueue.companions.length,
          rtWithImages,
          poolQueue: book.companions.poolQueue.companions.length,
          poolWithImages,
        });
      }
    }

    // Proactively refill image buffers if depleted (requires API key)
    if (config.apiKey) {
      for (const book of loadedBooks) {
        if (book.companions && shouldGenerateMoreImages(book.companions)) {
          debug.log('collection', `Buffer depleted for "${book.title}", triggering image generation`);
          const generateImage = async (c: Companion) => {
            try {
              const url = await generateImageForCompanion(c, config.apiKey!, {
                model: config.imageModel,
                llmModel: config.llmModel,
              });
              debug.log('collection', `Image generated for "${c.name}"`);
              return url;
            } catch (error) {
              debug.error('collection', `Image generation failed for "${c.name}"`, error);
              return null;
            }
          };
          // Fire and forget - don't await, let it happen in background
          maybeGenerateImages(book, generateImage).then(async finalBook => {
            await storage.saveBook(finalBook);
            debug.log('collection', `Buffer refill complete for "${book.title}"`);
          }).catch(error => {
            debug.error('collection', `Buffer refill failed for "${book.title}"`, error);
          });
        }
      }
    }

    setBooks(loadedBooks);
    setLootBoxes(progress.lootBoxes);
    setLootBoxesV3(progress.lootBoxesV3 || []);
    setDebugMode(config.debugMode);
    // Derive unlocked slots from slotProgress for global loadout fallback
    const sp = progress.slotProgress;
    let unlockedSlots: 1 | 2 | 3 = 1;
    if (sp) {
      if (sp.slot2Points >= 100) unlockedSlots = 2;
      if (unlockedSlots >= 2 && sp.slot3Points >= 300) unlockedSlots = 3;
    }
    setLoadout({ slots: [null, null, null], unlockedSlots });
    setGenreLevels(progress.genreLevels || null);
    setConfig(config);
    debug.log('collection', 'loadData complete');
  }

  // Get equipped companion IDs - use target book's loadout when we have book context
  const activeLoadout = hasBookContext && targetBook
    ? getBookLoadout(targetBook)
    : loadout;
  const equippedIds = activeLoadout ? getEquippedCompanionIds(activeLoadout) : [];

  // Find which slot a companion is in (returns -1 if not equipped)
  function getEquippedSlot(companionId: string): number {
    if (!activeLoadout) return -1;
    return activeLoadout.slots.findIndex(id => id === companionId);
  }

  // Handle equip action
  async function handleEquip(companion: DisplayCompanion) {
    // Direct equip mode: equip directly to the target book's specific slot
    if (isDirectEquipMode && targetBook && targetSlotIndex !== null) {
      const targetBookLevel = targetBook.progression?.level || 1;
      const requirements = canEquipCompanion(companion.rarity, targetBookLevel);

      if (!requirements.canEquip) {
        const message = `Book level ${requirements.requiredBookLevel} required (current: ${targetBookLevel})`;
        Alert.alert('Cannot Equip', message);
        return;
      }

      try {
        await equipCompanionToBook(targetBook.id, companion.id, targetSlotIndex);
        debug.log('collection', 'Equipped to book loadout', {
          bookId: targetBook.id,
          companionId: companion.id,
          slotIndex: targetSlotIndex,
        });
        // Navigate back to book detail
        router.back();
      } catch (error) {
        debug.error('collection', 'equipCompanionToBook failed', error);
        Alert.alert('Error', error instanceof Error ? error.message : 'Failed to equip companion');
      }
      return;
    }

    // Slot selector mode: have book context but no specific slot, show slot selector
    if (!activeLoadout) return;

    // Check if companion meets book level requirements using target book or companion's book
    const bookLevel = hasBookContext && targetBook
      ? (targetBook.progression?.level || 1)
      : companion.bookLevel;

    const requirements = canEquipCompanion(companion.rarity, bookLevel);

    if (!requirements.canEquip) {
      const message = `Book level ${requirements.requiredBookLevel} required (current: ${bookLevel})`;
      Alert.alert('Cannot Equip', message);
      return;
    }

    // Build slot options
    const slotOptions: { text: string; onPress?: () => void; style?: 'cancel' | 'destructive' }[] = [];

    for (let i = 0; i < 3; i++) {
      const isUnlocked = isSlotUnlocked(activeLoadout, i);
      const currentOccupant = activeLoadout.slots[i];

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

  // Actually equip to a slot - always uses per-book loadout
  async function equipToSlot(companionId: string, slotIndex: number) {
    debug.log('collection', 'equipToSlot called', { companionId, slotIndex, hasBookContext });

    // Must have book context to equip
    if (hasBookContext && targetBook) {
      try {
        await equipCompanionToBook(targetBook.id, companionId, slotIndex);
        debug.log('collection', 'Equipped to book loadout (slot selector)', {
          bookId: targetBook.id,
          companionId,
          slotIndex,
        });
        // Refresh data to show updated loadout
        await loadData();
      } catch (error) {
        debug.error('collection', 'equipCompanionToBook failed', error);
        Alert.alert('Error', error instanceof Error ? error.message : 'Failed to equip companion');
      }
      return;
    }

    // No book context - shouldn't happen but handle gracefully
    debug.warn('collection', 'equipToSlot: no book context available');
    Alert.alert('Error', 'No book selected. Please start reading a book first.');
  }

  // Handle unequip action
  async function handleUnequip(companion: DisplayCompanion) {
    const slotIndex = getEquippedSlot(companion.id);
    if (slotIndex === -1) return;

    // Must have book context to unequip
    if (hasBookContext && targetBook) {
      Alert.alert(
        'Unequip Companion',
        `Remove ${companion.name} from slot ${slotIndex + 1}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Unequip',
            onPress: async () => {
              try {
                await unequipCompanionFromBook(targetBook.id, slotIndex);
                router.back();
              } catch (error) {
                Alert.alert('Error', error instanceof Error ? error.message : 'Failed to unequip companion');
              }
            },
          },
        ]
      );
      return;
    }

    // Global mode: should not be reached anymore since per-book mode is required
    debug.warn('collection', 'handleUnequip: standard mode should not be used - use per-book equipping');
    Alert.alert('Error', 'Please navigate to a book to unequip companions');
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
    debug.log('collection', 'handleDebugUnlock called', {
      companionId: companion.id,
      companionName: companion.name,
      bookId: companion.bookId,
      hasImage: !!companion.imageUrl,
    });

    const book = books.find(b => b.id === companion.bookId);
    if (!book?.companions) {
      debug.warn('collection', 'handleDebugUnlock: book not found or no companions');
      return;
    }

    Alert.alert(
      'Debug Unlock',
      `Unlock "${companion.name}" from "${book.title}"?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unlock',
          onPress: async () => {
            debug.log('collection', 'Debug unlock confirmed', { companionId: companion.id });

            const unlockedCompanion: Companion = {
              ...companion,
              unlockMethod: 'reading_time',
              unlockedAt: Date.now(),
            };

            debug.log('collection', 'Created unlocked companion', {
              id: unlockedCompanion.id,
              name: unlockedCompanion.name,
              hasImage: !!unlockedCompanion.imageUrl,
              imageUrl: unlockedCompanion.imageUrl?.substring(0, 60),
            });

            // Remove from queue and add to unlocked
            const updatedBook = { ...book };
            updatedBook.companions = { ...book.companions! };

            // Check reading time queue
            const rtIndex = updatedBook.companions.readingTimeQueue.companions.findIndex(c => c.id === companion.id);
            debug.log('collection', 'Checking readingTimeQueue', { rtIndex });
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
            debug.log('collection', 'Checking poolQueue', { poolIndex });
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

            debug.log('collection', 'Saving updated book', {
              bookId: updatedBook.id,
              unlockedCount: updatedBook.companions.unlockedCompanions.length,
              unlockedWithImages: updatedBook.companions.unlockedCompanions.filter(c => c.imageUrl).length,
            });

            await storage.saveBook(updatedBook);
            debug.log('collection', 'Book saved, reloading data');

            // Trigger background image generation for next companions in buffer
            if (config?.apiKey && updatedBook.companions) {
              debug.log('collection', 'Starting background image generation after debug unlock');
              const generateImage = async (c: Companion) => {
                debug.log('collection', `Generating image for "${c.name}"...`);
                try {
                  const url = await generateImageForCompanion(c, config.apiKey!, {
                    model: config.imageModel,
                    llmModel: config.llmModel,
                  });
                  debug.log('collection', `Image generated for "${c.name}"`);
                  return url;
                } catch (error) {
                  debug.error('collection', `Image generation failed for "${c.name}"`, error);
                  return null;
                }
              };
              maybeGenerateImages(updatedBook, generateImage).then(async finalBook => {
                await storage.saveBook(finalBook);
                debug.log('collection', 'Background image generation complete');
                await loadData(); // Refresh to show new images
              }).catch(error => {
                debug.error('collection', 'Background image generation failed', error);
              });
            }

            await loadData();
            debug.log('collection', 'handleDebugUnlock complete');
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

  const boxCount = (lootBoxes?.availableBoxes.length || 0) + lootBoxesV3.length;

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>collection_</Text>
        <Text style={styles.stats}>
          {unlockedCount}/{totalPossible} collected
        </Text>
      </View>

      {/* Book context banner - show which book companions will be equipped to */}
      {hasBookContext && targetBook && (
        <View style={styles.equipModeBanner}>
          <Text style={styles.equipModeText}>
            equipping to: {targetBook.title}
          </Text>
          {isDirectEquipMode && targetSlotIndex !== null && (
            <Text style={styles.equipModeSlot}>
              slot {targetSlotIndex + 1}
            </Text>
          )}
        </View>
      )}

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
          <TintedChest
            tier={(lootBoxesV3[0]?.tier || 'wood') as LootBoxTier}
            isOpen={false}
            scale={2}
          />
          <Text style={styles.lootBoxText}>
            {boxCount} box{boxCount !== 1 ? 'es' : ''} to open
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

          // Check equip requirements for unlocked companions (book level only)
          let equipRequirements: EquipRequirements | null = null;
          if (!companion.isLocked) {
            equipRequirements = canEquipCompanion(companion.rarity, companion.bookLevel);
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
              hasAnyBooksReading={hasAnyBooksReading}
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
    'luck': 'Luck',
    'rare_luck': 'Rare Luck',
    'legendary_luck': 'Legendary Luck',
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
  hasAnyBooksReading,
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
  hasAnyBooksReading?: boolean;
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
  // Can only equip if requirements are met AND there's at least one book being read
  const canEquip = (equipRequirements?.canEquip ?? false) && (hasAnyBooksReading ?? false);

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
      flexDirection: 'row',
      marginHorizontal: spacing(6),
      marginBottom: spacing(4),
      padding: spacing(4),
      borderWidth: 1,
      borderColor: colors.border,
      alignItems: 'center',
      gap: spacing(3),
    },
    lootBoxText: {
      fontFamily: FONTS.mono,
      fontWeight: FONTS.monoBold,
      fontSize: fontSize('body'),
      color: colors.text,
    },
    equipModeBanner: {
      marginHorizontal: spacing(6),
      marginBottom: spacing(4),
      padding: spacing(4),
      borderWidth: 1,
      borderColor: colors.primary,
      backgroundColor: colors.surface,
    },
    equipModeText: {
      fontFamily: FONTS.mono,
      fontSize: fontSize('body'),
      letterSpacing: letterSpacing('tight'),
      color: colors.text,
    },
    equipModeSlot: {
      fontFamily: FONTS.mono,
      fontSize: fontSize('small'),
      letterSpacing: letterSpacing('tight'),
      color: colors.textSecondary,
      marginTop: spacing(1),
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
