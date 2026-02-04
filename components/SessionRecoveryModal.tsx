import { View, Text, Pressable, StyleSheet, Modal } from 'react-native';
import { useTheme, FONTS } from '@/lib/ui';
import { TimerRecoveryData } from '@/lib/shared';

interface SessionRecoveryModalProps {
  visible: boolean;
  recoveryData: TimerRecoveryData;
  onContinue: () => void;
  onSaveAtInterruption: () => void;
  onDiscard: () => void;
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);

  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  }
  return `${minutes} minutes`;
}

export function SessionRecoveryModal({
  visible,
  recoveryData,
  onContinue,
  onSaveAtInterruption,
  onDiscard,
}: SessionRecoveryModalProps) {
  const { colors, spacing, fontSize, letterSpacing } = useTheme();
  const styles = createStyles(colors, spacing, fontSize, letterSpacing);

  const interruptedDuration = formatDuration(recoveryData.elapsedAtInterruption);
  const totalDuration = formatDuration(recoveryData.totalElapsedIfContinued);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
    >
      <View style={styles.overlay}>
        <View style={styles.container}>
          <Text style={styles.title}>session interrupted</Text>

          <Text style={styles.bookTitle}>
            {recoveryData.bookTitle.toLowerCase()}_
          </Text>

          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>last recorded:</Text>
            <Text style={styles.infoValue}>{interruptedDuration}</Text>
          </View>

          <View style={styles.infoBlock}>
            <Text style={styles.infoLabel}>time since interrupted:</Text>
            <Text style={styles.infoValue}>
              {formatDuration(recoveryData.totalElapsedIfContinued - recoveryData.elapsedAtInterruption)}
            </Text>
          </View>

          <View style={styles.buttons}>
            <Pressable style={styles.primaryButton} onPress={onContinue}>
              <Text style={styles.primaryButtonText}>[ continue reading ]</Text>
              <Text style={styles.buttonHint}>
                assumes you read the full {totalDuration}
              </Text>
            </Pressable>

            <Pressable style={styles.secondaryButton} onPress={onSaveAtInterruption}>
              <Text style={styles.secondaryButtonText}>
                [ save {interruptedDuration} ]
              </Text>
              <Text style={styles.buttonHint}>
                save time at interruption
              </Text>
            </Pressable>

            <Pressable style={styles.tertiaryButton} onPress={onDiscard}>
              <Text style={styles.tertiaryButtonText}>[ discard session ]</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const createStyles = (
  colors: ReturnType<typeof useTheme>['colors'],
  spacing: ReturnType<typeof useTheme>['spacing'],
  fontSize: ReturnType<typeof useTheme>['fontSize'],
  letterSpacing: ReturnType<typeof useTheme>['letterSpacing']
) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing(4),
  },
  container: {
    width: '100%',
    maxWidth: 340,
    backgroundColor: colors.background,
    borderWidth: 1,
    borderColor: colors.border,
    padding: spacing(6),
  },
  title: {
    color: colors.text,
    fontFamily: FONTS.mono,
    fontSize: fontSize('large'),
    letterSpacing: letterSpacing('tight'),
    marginBottom: spacing(4),
  },
  bookTitle: {
    color: colors.textSecondary,
    fontFamily: FONTS.mono,
    fontSize: fontSize('body'),
    letterSpacing: letterSpacing('tight'),
    marginBottom: spacing(6),
  },
  infoBlock: {
    marginBottom: spacing(3),
  },
  infoLabel: {
    color: colors.textMuted,
    fontFamily: FONTS.mono,
    fontSize: fontSize('small'),
    letterSpacing: letterSpacing('tight'),
  },
  infoValue: {
    color: colors.text,
    fontFamily: FONTS.mono,
    fontSize: fontSize('body'),
    letterSpacing: letterSpacing('tight'),
  },
  buttons: {
    marginTop: spacing(6),
    gap: spacing(3),
  },
  primaryButton: {
    borderWidth: 1,
    borderColor: colors.text,
    paddingVertical: spacing(4),
    paddingHorizontal: spacing(4),
    alignItems: 'center',
  },
  primaryButtonText: {
    color: colors.text,
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    fontSize: fontSize('body'),
    letterSpacing: letterSpacing('tight'),
  },
  secondaryButton: {
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: spacing(4),
    paddingHorizontal: spacing(4),
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: colors.textSecondary,
    fontFamily: FONTS.mono,
    fontSize: fontSize('body'),
    letterSpacing: letterSpacing('tight'),
  },
  tertiaryButton: {
    paddingVertical: spacing(3),
    alignItems: 'center',
  },
  tertiaryButtonText: {
    color: colors.textMuted,
    fontFamily: FONTS.mono,
    fontSize: fontSize('small'),
    letterSpacing: letterSpacing('tight'),
  },
  buttonHint: {
    color: colors.textMuted,
    fontFamily: FONTS.mono,
    fontSize: fontSize('small'),
    letterSpacing: letterSpacing('tight'),
    marginTop: spacing(1),
  },
});
