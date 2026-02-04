import { View, Text, StyleSheet, ActivityIndicator } from 'react-native';
import { useTheme, FONTS } from '@/lib/ui';

export type CompanionStep = 'analyzing' | 'personality' | 'avatar' | 'done' | 'error';

interface CompanionProgressProps {
  currentStep: CompanionStep;
  error?: string;
}

const STEPS: { key: CompanionStep; label: string }[] = [
  { key: 'analyzing', label: 'Analyzing book...' },
  { key: 'personality', label: 'Creating personality...' },
  { key: 'avatar', label: 'Generating avatar...' },
];

export function CompanionProgress({ currentStep, error }: CompanionProgressProps) {
  const { colors, spacing, fontSize } = useTheme();

  const styles = createStyles(colors, spacing, fontSize);

  if (currentStep === 'error') {
    return (
      <View style={styles.container}>
        <Text style={styles.errorText}>
          {error || 'Failed to generate companion'}
        </Text>
      </View>
    );
  }

  if (currentStep === 'done') {
    return null; // Component hides when done
  }

  const currentIndex = STEPS.findIndex(s => s.key === currentStep);

  return (
    <View style={styles.container}>
      {STEPS.map((step, index) => {
        const isComplete = index < currentIndex;
        const isCurrent = index === currentIndex;

        return (
          <View key={step.key} style={styles.stepRow}>
            <View style={styles.indicator}>
              {isComplete ? (
                <Text style={styles.checkmark}>✓</Text>
              ) : isCurrent ? (
                <ActivityIndicator size="small" color={colors.text} />
              ) : (
                <Text style={styles.pending}>○</Text>
              )}
            </View>
            <Text
              style={[
                styles.stepLabel,
                isCurrent ? styles.stepLabelActive : styles.stepLabelMuted,
              ]}
            >
              {step.label}
            </Text>
          </View>
        );
      })}
    </View>
  );
}

function createStyles(
  colors: ReturnType<typeof useTheme>['colors'],
  spacing: ReturnType<typeof useTheme>['spacing'],
  fontSize: ReturnType<typeof useTheme>['fontSize']
) {
  return StyleSheet.create({
    container: {
      gap: 12,
      padding: spacing(4),
    },
    stepRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    indicator: {
      width: 24,
      alignItems: 'center',
    },
    checkmark: {
      fontSize: 16,
      fontWeight: 'bold',
      color: colors.success,
    },
    pending: {
      fontSize: 16,
      color: colors.textMuted,
    },
    stepLabel: {
      fontFamily: FONTS.mono,
      fontSize: fontSize('body'),
    },
    stepLabelActive: {
      color: colors.text,
    },
    stepLabelMuted: {
      color: colors.textMuted,
    },
    errorText: {
      fontFamily: FONTS.mono,
      fontSize: fontSize('body'),
      color: colors.error,
    },
  });
}
