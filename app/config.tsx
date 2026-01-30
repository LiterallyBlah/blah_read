import { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { useTheme } from '@/lib/ThemeContext';
import { settings, Settings, exportAllData, resetApp, selectiveDelete, DeleteOptions } from '@/lib/settings';
import { resetDebugCache } from '@/lib/debug';
import { validateApiKey, validateImageModel } from '@/lib/openrouter';
import { getImageStorageDiagnostics, deleteOrphanedImages } from '@/lib/imageStorage';
import { storage } from '@/lib/storage';
import { FONTS } from '@/lib/theme';
import type { LootBoxV3, LootBoxTier } from '@/lib/types';

type ApiStatus = 'not set' | 'testing' | 'connected' | 'invalid';

const defaultDeleteOptions: DeleteOptions = {
  books: false,
  companionsOnly: false,
  sessions: false,
  progress: false,
  settings: false,
};

export default function ConfigScreen() {
  const { colors, spacing, fontSize, letterSpacing } = useTheme();
  const insets = useSafeAreaInsets();
  const [config, setConfig] = useState<Settings | null>(null);
  const [apiStatus, setApiStatus] = useState<ApiStatus>('not set');
  const [imageModelValid, setImageModelValid] = useState<boolean | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>('api');
  const [deleteOptions, setDeleteOptions] = useState<DeleteOptions>(defaultDeleteOptions);
  const [imageDiagnostics, setImageDiagnostics] = useState<{
    directoryExists: boolean;
    fileCount: number;
    files: string[];
    totalSize: number;
  } | null>(null);
  const [companionCounts, setCompanionCounts] = useState<{
    total: number;
    withImages: number;
    books: { title: string; unlocked: number; withImages: number }[];
  } | null>(null);

  useEffect(() => { loadConfig(); }, []);

  async function addTestLootBox(tier: LootBoxTier) {
    const progress = await storage.getProgress();
    const newBox: LootBoxV3 = {
      id: `debug-${tier}-${Date.now()}`,
      tier,
      earnedAt: Date.now(),
      source: 'bonus_drop',
    };
    const updatedBoxes = [...(progress.lootBoxesV3 || []), newBox];
    await storage.saveProgress({ ...progress, lootBoxesV3: updatedBoxes });
    Alert.alert('Added', `Added 1 ${tier} loot box`);
  }

  async function loadDiagnostics() {
    const diag = await getImageStorageDiagnostics();
    setImageDiagnostics(diag);

    // Also load companion counts
    const books = await storage.getBooks();
    let total = 0;
    let withImages = 0;
    const bookStats: { title: string; unlocked: number; withImages: number }[] = [];

    for (const book of books) {
      if (book.companions) {
        const unlocked = book.companions.unlockedCompanions.length;
        const rtCount = book.companions.readingTimeQueue.companions.length;
        const poolCount = book.companions.poolQueue.companions.length;
        const bookTotal = unlocked + rtCount + poolCount;
        const bookWithImages = [
          ...book.companions.unlockedCompanions,
          ...book.companions.readingTimeQueue.companions,
          ...book.companions.poolQueue.companions,
        ].filter(c => c.imageUrl).length;

        total += bookTotal;
        withImages += bookWithImages;
        bookStats.push({
          title: book.title.substring(0, 25),
          unlocked,
          withImages: bookWithImages,
        });
      }
    }

    setCompanionCounts({ total, withImages, books: bookStats });
  }

  async function loadConfig() {
    const c = await settings.get();
    setConfig(c);
    setApiStatus(c.apiKey ? 'connected' : 'not set');
  }

  async function updateConfig(partial: Partial<Settings>) {
    if (!config) return;
    const updated = { ...config, ...partial };
    setConfig(updated);
    await settings.set(partial);
  }

  async function testApiKey() {
    if (!config?.apiKey) return;
    setApiStatus('testing');
    const valid = await validateApiKey(config.apiKey);
    setApiStatus(valid ? 'connected' : 'invalid');
  }

  async function checkImageModel() {
    if (!config?.apiKey || !config?.imageModel) return;
    const valid = await validateImageModel(config.apiKey, config.imageModel);
    setImageModelValid(valid);
  }

  async function handleExport() {
    const data = await exportAllData();
    const path = `${FileSystem.documentDirectory}blahread-export-${new Date().toISOString().split('T')[0]}.json`;
    await FileSystem.writeAsStringAsync(path, data);
    await Sharing.shareAsync(path);
  }

  async function handleSelectiveDelete() {
    const selected: string[] = [];
    if (deleteOptions.books) selected.push('books');
    if (deleteOptions.companionsOnly) selected.push('companions');
    if (deleteOptions.sessions) selected.push('reading sessions');
    if (deleteOptions.progress) selected.push('progress & stats');
    if (deleteOptions.settings) selected.push('settings');

    if (selected.length === 0) return;

    Alert.alert(
      'Delete Data',
      `This will permanently delete: ${selected.join(', ')}. This cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            await selectiveDelete(deleteOptions);
            setDeleteOptions(defaultDeleteOptions);
            if (deleteOptions.settings) {
              await loadConfig(); // Reload config if settings were reset
            }
            Alert.alert('Done', 'Selected data has been deleted.');
          },
        },
      ]
    );
  }

  async function handleReset() {
    Alert.alert(
      'Reset App',
      'This will permanently delete all your data including books, progress, and settings. This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete Everything',
          style: 'destructive',
          onPress: () => {
            Alert.alert(
              'Final Confirmation',
              'Are you absolutely sure? All data will be lost.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Yes, Delete All',
                  style: 'destructive',
                  onPress: async () => {
                    await resetApp();
                    router.replace('/');
                  },
                },
              ]
            );
          },
        },
      ]
    );
  }

  const styles = createStyles(colors, spacing, fontSize, letterSpacing);

  if (!config) return <View style={styles.container}><Text style={styles.text}>loading..._</Text></View>;

  return (
    <ScrollView style={styles.container} contentContainerStyle={[styles.contentContainer, { paddingBottom: spacing(6) + insets.bottom }]}>
      <Pressable style={styles.backButton} onPress={() => router.back()}>
        <Text style={styles.backText}>{'<'} back</Text>
      </Pressable>

      <Text style={styles.title}>config_</Text>

      {/* API Section */}
      <Pressable style={styles.sectionHeader} onPress={() => setExpandedSection(expandedSection === 'api' ? null : 'api')}>
        <Text style={styles.sectionTitle}>[api] {expandedSection === 'api' ? '▼' : '▶'}</Text>
      </Pressable>

      {expandedSection === 'api' && (
        <View style={styles.sectionContent}>
          <Text style={styles.label}>openrouter key_</Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { flex: 1 }]}
              value={config.apiKey || ''}
              onChangeText={v => updateConfig({ apiKey: v || null })}
              placeholder="sk-or-..."
              placeholderTextColor={colors.textMuted}
              secureTextEntry
            />
            <Pressable style={styles.smallButton} onPress={testApiKey}>
              <Text style={styles.smallButtonText}>[test]</Text>
            </Pressable>
          </View>
          <Text style={[styles.status, apiStatus === 'connected' && { color: colors.success }]}>
            status: {apiStatus}_
          </Text>

          <Text style={styles.label}>llm model_</Text>
          <TextInput
            style={styles.input}
            value={config.llmModel}
            onChangeText={v => updateConfig({ llmModel: v })}
            placeholder="google/gemini-2.5-flash-preview-05-20"
            placeholderTextColor={colors.textMuted}
          />

          <Text style={styles.label}>image model_</Text>
          <TextInput
            style={styles.input}
            value={config.imageModel}
            onChangeText={v => { updateConfig({ imageModel: v }); setImageModelValid(null); }}
            onBlur={checkImageModel}
            placeholder="google/gemini-2.5-flash-image"
            placeholderTextColor={colors.textMuted}
          />
          {imageModelValid === true && <Text style={[styles.hint, { color: colors.success }]}>✓ supports image output</Text>}
          {imageModelValid === false && <Text style={[styles.hint, { color: colors.error }]}>⚠ model does not support image generation</Text>}

          <Text style={styles.label}>image size_</Text>
          <View style={styles.row}>
            {(['1K', '2K', '4K'] as const).map(size => (
              <Pressable
                key={size}
                style={[styles.toggleButton, config.imageSize === size && styles.toggleActive]}
                onPress={() => updateConfig({ imageSize: size })}
              >
                <Text style={[styles.toggleText, config.imageSize === size && styles.toggleTextActive]}>
                  [{size}]
                </Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.hint}>resolution for generated images (1K recommended)</Text>

          <View style={styles.divider} />

          <Text style={styles.label}>google books api key_</Text>
          <TextInput
            style={styles.input}
            value={config.googleBooksApiKey || ''}
            onChangeText={v => updateConfig({ googleBooksApiKey: v || null })}
            placeholder="optional - increases rate limits"
            placeholderTextColor={colors.textMuted}
            secureTextEntry
          />
          <Text style={styles.hint}>works without key, but has lower rate limits</Text>
        </View>
      )}

      {/* Display Section */}
      <Pressable style={styles.sectionHeader} onPress={() => setExpandedSection(expandedSection === 'display' ? null : 'display')}>
        <Text style={styles.sectionTitle}>[display] {expandedSection === 'display' ? '▼' : '▶'}</Text>
      </Pressable>

      {expandedSection === 'display' && (
        <View style={styles.sectionContent}>
          <Text style={styles.label}>theme_</Text>
          <View style={styles.row}>
            {(['auto', 'dark', 'light'] as const).map(t => (
              <Pressable
                key={t}
                style={[styles.toggleButton, config.theme === t && styles.toggleActive]}
                onPress={() => updateConfig({ theme: t })}
              >
                <Text style={[styles.toggleText, config.theme === t && styles.toggleTextActive]}>[{t}]</Text>
              </Pressable>
            ))}
          </View>
          <Text style={styles.hint}>auto follows your device setting</Text>

          <Text style={styles.label}>font size_</Text>
          <View style={styles.row}>
            {([0.85, 1, 1.2] as const).map((s) => (
              <Pressable
                key={s}
                style={[styles.toggleButton, config.fontScale === s && styles.toggleActive]}
                onPress={() => updateConfig({ fontScale: s })}
              >
                <Text style={[styles.toggleText, config.fontScale === s && styles.toggleTextActive, { fontSize: fontSize('body') * s }]}>
                  A
                </Text>
              </Pressable>
            ))}
          </View>
        </View>
      )}

      {/* Goals Section */}
      <Pressable style={styles.sectionHeader} onPress={() => setExpandedSection(expandedSection === 'goals' ? null : 'goals')}>
        <Text style={styles.sectionTitle}>[goals] {expandedSection === 'goals' ? '▼' : '▶'}</Text>
      </Pressable>

      {expandedSection === 'goals' && (
        <View style={styles.sectionContent}>
          <Text style={styles.label}>daily target_</Text>
          <View style={styles.row}>
            <TextInput
              style={[styles.input, { width: 80, textAlign: 'center' }]}
              value={String(config.dailyTarget)}
              onChangeText={v => updateConfig({ dailyTarget: parseInt(v, 10) || 30 })}
              keyboardType="number-pad"
            />
            <Text style={styles.hint}>minutes</Text>
          </View>

          <Text style={styles.label}>reminder_</Text>
          <View style={styles.row}>
            <Pressable
              style={[styles.toggleButton, config.reminderEnabled && styles.toggleActive]}
              onPress={() => updateConfig({ reminderEnabled: !config.reminderEnabled })}
            >
              <Text style={[styles.toggleText, config.reminderEnabled && styles.toggleTextActive]}>
                [{config.reminderEnabled ? 'on' : 'off'}]
              </Text>
            </Pressable>
            {config.reminderEnabled && (
              <>
                <Text style={styles.hint}>at</Text>
                <TextInput
                  style={[styles.input, { width: 80, textAlign: 'center' }]}
                  value={config.reminderTime}
                  onChangeText={v => updateConfig({ reminderTime: v })}
                  placeholder="20:00"
                  placeholderTextColor={colors.textMuted}
                />
              </>
            )}
          </View>
          <Text style={styles.hint}>only notifies if you haven't hit your goal yet</Text>
        </View>
      )}

      {/* Data Section */}
      <Pressable style={styles.sectionHeader} onPress={() => setExpandedSection(expandedSection === 'data' ? null : 'data')}>
        <Text style={styles.sectionTitle}>[data] {expandedSection === 'data' ? '▼' : '▶'}</Text>
      </Pressable>

      {expandedSection === 'data' && (
        <View style={styles.sectionContent}>
          <Text style={styles.label}>export_</Text>
          <Pressable style={styles.actionButton} onPress={handleExport}>
            <Text style={styles.actionButtonText}>[download json]</Text>
          </Pressable>

          <Text style={[styles.label, { color: colors.error, marginTop: spacing(6) }]}>delete data_</Text>
          <Text style={styles.hint}>select what to delete:</Text>

          {/* Delete options toggles */}
          <View style={styles.deleteOptionsContainer}>
            <Pressable
              style={styles.deleteOption}
              onPress={() => setDeleteOptions(prev => ({
                ...prev,
                books: !prev.books,
                companionsOnly: !prev.books ? false : prev.companionsOnly, // Can't do both
              }))}
            >
              <View style={[styles.checkbox, deleteOptions.books && styles.checkboxChecked]}>
                {deleteOptions.books && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={styles.deleteOptionText}>
                <Text style={styles.deleteOptionLabel}>books</Text>
                <Text style={styles.deleteOptionHint}>removes all books and their companions</Text>
              </View>
            </Pressable>

            <Pressable
              style={[styles.deleteOption, deleteOptions.books && { opacity: 0.4 }]}
              onPress={() => !deleteOptions.books && setDeleteOptions(prev => ({
                ...prev,
                companionsOnly: !prev.companionsOnly,
              }))}
              disabled={deleteOptions.books}
            >
              <View style={[styles.checkbox, deleteOptions.companionsOnly && styles.checkboxChecked]}>
                {deleteOptions.companionsOnly && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={styles.deleteOptionText}>
                <Text style={styles.deleteOptionLabel}>companions only</Text>
                <Text style={styles.deleteOptionHint}>keeps books, removes all companions and reading time</Text>
              </View>
            </Pressable>

            <Pressable
              style={styles.deleteOption}
              onPress={() => setDeleteOptions(prev => ({ ...prev, sessions: !prev.sessions }))}
            >
              <View style={[styles.checkbox, deleteOptions.sessions && styles.checkboxChecked]}>
                {deleteOptions.sessions && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={styles.deleteOptionText}>
                <Text style={styles.deleteOptionLabel}>reading sessions</Text>
                <Text style={styles.deleteOptionHint}>removes reading history log</Text>
              </View>
            </Pressable>

            <Pressable
              style={styles.deleteOption}
              onPress={() => setDeleteOptions(prev => ({ ...prev, progress: !prev.progress }))}
            >
              <View style={[styles.checkbox, deleteOptions.progress && styles.checkboxChecked]}>
                {deleteOptions.progress && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={styles.deleteOptionText}>
                <Text style={styles.deleteOptionLabel}>progress & stats</Text>
                <Text style={styles.deleteOptionHint}>resets xp, level, streaks, loot boxes</Text>
              </View>
            </Pressable>

            <Pressable
              style={styles.deleteOption}
              onPress={() => setDeleteOptions(prev => ({ ...prev, settings: !prev.settings }))}
            >
              <View style={[styles.checkbox, deleteOptions.settings && styles.checkboxChecked]}>
                {deleteOptions.settings && <Text style={styles.checkmark}>✓</Text>}
              </View>
              <View style={styles.deleteOptionText}>
                <Text style={styles.deleteOptionLabel}>settings</Text>
                <Text style={styles.deleteOptionHint}>resets api keys, theme, goals to defaults</Text>
              </View>
            </Pressable>
          </View>

          {/* Delete button */}
          <Pressable
            style={[
              styles.actionButton,
              styles.dangerButton,
              !Object.values(deleteOptions).some(v => v) && { opacity: 0.4 },
            ]}
            onPress={handleSelectiveDelete}
            disabled={!Object.values(deleteOptions).some(v => v)}
          >
            <Text style={[styles.actionButtonText, { color: colors.error }]}>
              [delete selected]
            </Text>
          </Pressable>

          <View style={styles.divider} />

          {/* Nuclear option */}
          <Text style={[styles.label, { color: colors.error }]}>factory reset_</Text>
          <Pressable style={[styles.actionButton, styles.dangerButton]} onPress={handleReset}>
            <Text style={[styles.actionButtonText, { color: colors.error }]}>[delete everything]</Text>
          </Pressable>
          <Text style={styles.hint}>removes all data and returns app to fresh state</Text>
        </View>
      )}

      {/* Debug Section */}
      <Pressable style={styles.sectionHeader} onPress={() => setExpandedSection(expandedSection === 'debug' ? null : 'debug')}>
        <Text style={[styles.sectionTitle, { color: colors.warning || '#f59e0b' }]}>[debug] {expandedSection === 'debug' ? '▼' : '▶'}</Text>
      </Pressable>

      {expandedSection === 'debug' && (
        <View style={styles.sectionContent}>
          <Text style={styles.label}>debug mode_</Text>
          <Pressable
            style={[styles.toggleButton, config.debugMode && styles.toggleActive]}
            onPress={() => {
              updateConfig({ debugMode: !config.debugMode });
              resetDebugCache();
            }}
          >
            <Text style={[styles.toggleText, config.debugMode && styles.toggleTextActive]}>
              [{config.debugMode ? 'on' : 'off'}]
            </Text>
          </Pressable>
          <Text style={styles.hint}>shows all companions (locked + unlocked) in collection</Text>
          <Text style={styles.hint}>allows manual unlock by tapping locked companions</Text>
          <Text style={styles.hint}>enables detailed console logging (expo run)</Text>

          {config.debugMode && (
            <>
              <View style={styles.divider} />

              <Text style={[styles.label, { color: '#f59e0b' }]}>storage diagnostics_</Text>
              <Pressable
                style={[styles.actionButton, { borderColor: '#f59e0b' }]}
                onPress={loadDiagnostics}
              >
                <Text style={[styles.actionButtonText, { color: '#f59e0b' }]}>[refresh diagnostics]</Text>
              </Pressable>

              {imageDiagnostics && (
                <View style={{ marginTop: spacing(3), padding: spacing(3), borderWidth: 1, borderColor: '#f59e0b', borderStyle: 'dashed' }}>
                  <Text style={[styles.hint, { color: '#f59e0b' }]}>image storage:</Text>
                  <Text style={styles.hint}>  directory exists: {imageDiagnostics.directoryExists ? 'yes' : 'no'}</Text>
                  <Text style={styles.hint}>  file count: {imageDiagnostics.fileCount}</Text>
                  <Text style={styles.hint}>  total size: {(imageDiagnostics.totalSize / 1024).toFixed(1)} KB</Text>
                  {imageDiagnostics.files.length > 0 && (
                    <Text style={[styles.hint, { fontSize: 9 }]}>  files: {imageDiagnostics.files.slice(0, 5).join(', ')}{imageDiagnostics.files.length > 5 ? '...' : ''}</Text>
                  )}
                </View>
              )}

              {companionCounts && (
                <View style={{ marginTop: spacing(3), padding: spacing(3), borderWidth: 1, borderColor: '#f59e0b', borderStyle: 'dashed' }}>
                  <Text style={[styles.hint, { color: '#f59e0b' }]}>companion data:</Text>
                  <Text style={styles.hint}>  total companions: {companionCounts.total}</Text>
                  <Text style={styles.hint}>  with images: {companionCounts.withImages}</Text>
                  {companionCounts.books.map((book, i) => (
                    <Text key={i} style={[styles.hint, { fontSize: 9 }]}>  {book.title}: {book.unlocked} unlocked, {book.withImages} with images</Text>
                  ))}
                </View>
              )}

              <View style={styles.divider} />

              <Text style={[styles.label, { color: '#f59e0b' }]}>add test loot boxes_</Text>
              <View style={[styles.row, { marginTop: spacing(2) }]}>
                <Pressable
                  style={[styles.actionButton, { borderColor: '#8B4513', flex: 1 }]}
                  onPress={() => addTestLootBox('wood')}
                >
                  <Text style={[styles.actionButtonText, { color: '#8B4513' }]}>[+ wood]</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionButton, { borderColor: '#C0C0C0', flex: 1 }]}
                  onPress={() => addTestLootBox('silver')}
                >
                  <Text style={[styles.actionButtonText, { color: '#C0C0C0' }]}>[+ silver]</Text>
                </Pressable>
                <Pressable
                  style={[styles.actionButton, { borderColor: '#FFD700', flex: 1 }]}
                  onPress={() => addTestLootBox('gold')}
                >
                  <Text style={[styles.actionButtonText, { color: '#FFD700' }]}>[+ gold]</Text>
                </Pressable>
              </View>
              <Text style={styles.hint}>adds loot boxes for testing rewards</Text>

              <View style={styles.divider} />

              <Text style={[styles.label, { color: '#f59e0b' }]}>cleanup orphaned data_</Text>
              <Pressable
                style={[styles.actionButton, { borderColor: '#f59e0b' }]}
                onPress={async () => {
                  const books = await storage.getBooks();
                  const validCompanionIds: string[] = [];

                  for (const book of books) {
                    if (book.companions) {
                      for (const c of book.companions.unlockedCompanions || []) {
                        validCompanionIds.push(c.id);
                      }
                      for (const c of book.companions.readingTimeQueue?.companions || []) {
                        validCompanionIds.push(c.id);
                      }
                      for (const c of book.companions.poolQueue?.companions || []) {
                        validCompanionIds.push(c.id);
                      }
                      if (book.companions.completionLegendary) {
                        validCompanionIds.push(book.companions.completionLegendary.id);
                      }
                      if (book.companions.poolLegendary) {
                        validCompanionIds.push(book.companions.poolLegendary.id);
                      }
                    }
                  }

                  const deletedCount = await deleteOrphanedImages(validCompanionIds);
                  await loadDiagnostics(); // Refresh diagnostics
                  Alert.alert('Cleanup Complete', `Deleted ${deletedCount} orphaned companion image${deletedCount !== 1 ? 's' : ''}.`);
                }}
              >
                <Text style={[styles.actionButtonText, { color: '#f59e0b' }]}>[delete orphaned images]</Text>
              </Pressable>
              <Text style={styles.hint}>removes companion images from deleted books</Text>
            </>
          )}
        </View>
      )}
    </ScrollView>
  );
}

function createStyles(colors: any, spacing: any, fontSize: any, letterSpacing: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background },
    contentContainer: { padding: spacing(6), paddingTop: spacing(16) },
    backButton: { marginBottom: spacing(6) },
    backText: { color: colors.textSecondary, fontFamily: FONTS.mono, fontSize: fontSize('body') },
    title: { color: colors.text, fontFamily: FONTS.mono, fontWeight: '700', fontSize: fontSize('title'), marginBottom: spacing(6) },
    sectionHeader: { paddingVertical: spacing(3), borderBottomWidth: 1, borderBottomColor: colors.border },
    sectionTitle: { color: colors.text, fontFamily: FONTS.mono, fontSize: fontSize('body'), letterSpacing: letterSpacing('tight') },
    sectionContent: { paddingVertical: spacing(4) },
    label: { color: colors.textSecondary, fontFamily: FONTS.mono, fontSize: fontSize('small'), marginBottom: spacing(2), marginTop: spacing(4) },
    input: { borderWidth: 1, borderColor: colors.border, backgroundColor: colors.backgroundCard, color: colors.text, fontFamily: FONTS.mono, fontSize: fontSize('body'), padding: spacing(3) },
    row: { flexDirection: 'row', gap: spacing(2) },
    smallButton: { borderWidth: 1, borderColor: colors.border, padding: spacing(3), justifyContent: 'center' },
    smallButtonText: { color: colors.textSecondary, fontFamily: FONTS.mono, fontSize: fontSize('small') },
    status: { color: colors.textMuted, fontFamily: FONTS.mono, fontSize: fontSize('small'), marginTop: spacing(2) },
    hint: { color: colors.textMuted, fontFamily: FONTS.mono, fontSize: fontSize('small'), marginTop: spacing(1) },
    text: { color: colors.text, fontFamily: FONTS.mono, fontSize: fontSize('body') },
    toggleButton: { borderWidth: 1, borderColor: colors.border, padding: spacing(3), minWidth: spacing(16), alignItems: 'center' },
    toggleActive: { backgroundColor: colors.text, borderColor: colors.text },
    toggleText: { color: colors.textSecondary, fontFamily: FONTS.mono, fontSize: fontSize('small') },
    toggleTextActive: { color: colors.background },
    actionButton: { borderWidth: 1, borderColor: colors.border, padding: spacing(3), marginTop: spacing(2) },
    actionButtonText: { color: colors.textSecondary, fontFamily: FONTS.mono, fontSize: fontSize('small'), textAlign: 'center' },
    dangerButton: { borderColor: colors.error },
    divider: { borderTopWidth: 1, borderTopColor: colors.border, marginTop: spacing(6), marginBottom: spacing(2) },
    deleteOptionsContainer: { marginTop: spacing(3), marginBottom: spacing(4) },
    deleteOption: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: spacing(2) },
    checkbox: {
      width: 20,
      height: 20,
      borderWidth: 1,
      borderColor: colors.border,
      marginRight: spacing(3),
      justifyContent: 'center',
      alignItems: 'center',
      marginTop: 2,
    },
    checkboxChecked: { borderColor: colors.error, backgroundColor: colors.error },
    checkmark: { color: colors.background, fontFamily: FONTS.mono, fontSize: 12, fontWeight: '700' },
    deleteOptionText: { flex: 1 },
    deleteOptionLabel: { color: colors.text, fontFamily: FONTS.mono, fontSize: fontSize('body') },
    deleteOptionHint: { color: colors.textMuted, fontFamily: FONTS.mono, fontSize: fontSize('small'), marginTop: 2 },
  });
}
