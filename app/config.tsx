import { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useTheme } from '@/lib/ThemeContext';
import { settings, Settings, exportAllData, clearProgress, resetApp } from '@/lib/settings';
import { validateApiKey, validateImageModel } from '@/lib/openrouter';
import { FONTS } from '@/lib/theme';

type ApiStatus = 'not set' | 'testing' | 'connected' | 'invalid';

export default function ConfigScreen() {
  const { colors, spacing, fontSize, letterSpacing } = useTheme();
  const [config, setConfig] = useState<Settings | null>(null);
  const [apiStatus, setApiStatus] = useState<ApiStatus>('not set');
  const [imageModelValid, setImageModelValid] = useState<boolean | null>(null);
  const [expandedSection, setExpandedSection] = useState<string | null>('api');

  useEffect(() => { loadConfig(); }, []);

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

  async function handleClearProgress() {
    Alert.alert('Clear Progress', 'Reset all XP, streaks, and loot? Books will be kept.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Clear', style: 'destructive', onPress: async () => { await clearProgress(); Alert.alert('Done', 'Progress cleared.'); } },
    ]);
  }

  async function handleReset() {
    Alert.prompt('Reset App', 'Type "reset" to confirm deletion of all data.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async (text) => {
        if (text === 'reset') { await resetApp(); router.replace('/'); }
      }},
    ]);
  }

  const styles = createStyles(colors, spacing, fontSize, letterSpacing);

  if (!config) return <View style={styles.container}><Text style={styles.text}>loading..._</Text></View>;

  return (
    <ScrollView style={styles.container}>
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
            placeholder="bytedance-seed/seedream-4.5"
            placeholderTextColor={colors.textMuted}
          />
          {imageModelValid === true && <Text style={[styles.hint, { color: colors.success }]}>✓ supports image output</Text>}
          {imageModelValid === false && <Text style={[styles.hint, { color: colors.error }]}>⚠ model does not support image generation</Text>}
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

          <Text style={styles.label}>clear progress_</Text>
          <Pressable style={styles.actionButton} onPress={handleClearProgress}>
            <Text style={styles.actionButtonText}>[reset stats]</Text>
          </Pressable>
          <Text style={styles.hint}>keeps your books, clears xp, streaks, and loot</Text>

          <Text style={[styles.label, { color: colors.error }]}>reset app_</Text>
          <Pressable style={[styles.actionButton, styles.dangerButton]} onPress={handleReset}>
            <Text style={[styles.actionButtonText, { color: colors.error }]}>[delete everything]</Text>
          </Pressable>
        </View>
      )}
    </ScrollView>
  );
}

function createStyles(colors: any, spacing: any, fontSize: any, letterSpacing: any) {
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: colors.background, padding: spacing(6), paddingTop: spacing(16) },
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
  });
}
