import { Modal, View, Text, Pressable, StyleSheet } from 'react-native';
import { useTheme } from '@/lib/ThemeContext';
import { FONTS } from '@/lib/theme';
import { Book } from '@/lib/shared';

interface DuplicateBookDialogProps {
  visible: boolean;
  book: Book;
  onViewExisting: () => void;
  onAddAnyway: () => void;
  onCancel: () => void;
}

export function DuplicateBookDialog({
  visible,
  book,
  onViewExisting,
  onAddAnyway,
  onCancel,
}: DuplicateBookDialogProps) {
  const { colors, spacing, fontSize } = useTheme();

  const styles = createStyles(colors, spacing, fontSize);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCancel}
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={styles.title}>
            book exists_
          </Text>

          <Text style={styles.message}>
            "{book.title}" is already in your library.
          </Text>

          <View style={styles.buttons}>
            <Pressable
              style={[styles.button, { borderColor: colors.text }]}
              onPress={onViewExisting}
            >
              <Text style={[styles.buttonText, { color: colors.text }]}>
                [view existing]
              </Text>
            </Pressable>

            <Pressable
              style={[styles.button, { borderColor: colors.textMuted }]}
              onPress={onAddAnyway}
            >
              <Text style={[styles.buttonText, { color: colors.textMuted }]}>
                [add anyway]
              </Text>
            </Pressable>

            <Pressable onPress={onCancel}>
              <Text style={styles.cancelText}>
                cancel
              </Text>
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
  fontSize: ReturnType<typeof useTheme>['fontSize']
) => StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dialog: {
    width: '80%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    padding: spacing(5),
  },
  title: {
    fontFamily: FONTS.mono,
    fontWeight: FONTS.monoBold,
    color: colors.text,
    fontSize: fontSize('large'),
    marginBottom: spacing(2),
  },
  message: {
    fontFamily: FONTS.mono,
    color: colors.textMuted,
    fontSize: fontSize('body'),
  },
  buttons: {
    marginTop: spacing(4),
    gap: spacing(3),
    alignItems: 'stretch',
  },
  button: {
    borderWidth: 1,
    paddingVertical: spacing(3),
    alignItems: 'center',
  },
  buttonText: {
    fontFamily: FONTS.mono,
    fontSize: fontSize('body'),
  },
  cancelText: {
    fontFamily: FONTS.mono,
    fontSize: fontSize('small'),
    color: colors.textMuted,
    textAlign: 'center',
    marginTop: spacing(2),
  },
});
