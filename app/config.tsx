import { useState, useEffect } from 'react';
import { View, Text, TextInput, Pressable, ScrollView, StyleSheet, Alert } from 'react-native';
import { router } from 'expo-router';
import { useTheme } from '@/lib/ThemeContext';
import { settings, Settings } from '@/lib/settings';
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
  });
}
