import React from 'react';
import { View, Text, Modal, Pressable, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Layout, scaleTheme, makeShadow } from '../../constants/theme';
import { useTheme } from '../../store/ThemeContext';
import IconButton from './IconButton';

/**
 * Shared bottom-sheet modal. Consolidates the duplicated local `Sheet`
 * components previously defined separately in Expense.jsx / ExpenseItems.jsx.
 */
export default function Sheet({ visible, onClose, title, titleLeading, children, scroll = true, footer, bodyKey }) {
  const { C, scale } = useTheme();
  const { t } = useTranslation();
  const { Typography, Spacing, Radius } = scaleTheme(scale);
  const Shadow = makeShadow(C);
  const insets = useSafeAreaInsets();

  const Body = scroll ? ScrollView : View;
  const bodyProps = scroll
    ? { keyboardShouldPersistTaps: 'handled', nestedScrollEnabled: true, style: styles.body }
    : {};

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        enabled={Platform.OS === 'ios'}
      >
        <View style={styles.overlay}>
          <Pressable accessible={false} style={[StyleSheet.absoluteFill, { backgroundColor: C.overlay }]} onPress={onClose} />
          <View
            accessibilityViewIsModal
            style={[
              styles.sheet,
              {
                backgroundColor: C.bgCard,
                borderTopLeftRadius: Radius.xxl,
                borderTopRightRadius: Radius.xxl,
                paddingBottom: Platform.OS === 'ios' ? Math.max(insets.bottom, Spacing.sm) : Spacing.sm,
                paddingHorizontal: Spacing.base,
              },
              Shadow.lg,
            ]}
          >
            <View style={[styles.handle, { backgroundColor: C.textMuted }]} />
            {!!title && (
              <View style={[styles.header, { marginBottom: Spacing.md }]}>
                {titleLeading}
                <Text accessibilityRole="header" style={{ flex: 1, minWidth: 0, flexShrink: 1, fontSize: Typography.sizes.lg, fontWeight: Typography.weights.black, color: C.textPrimary }}>
                  {title}
                </Text>
                <IconButton icon="close" label={t('common.close')} onPress={onClose} />
              </View>
            )}
            <Body key={bodyKey} {...bodyProps}>{children}</Body>
            {footer && <View style={{ paddingTop: Spacing.sm, borderTopColor: C.divider, borderTopWidth: 1 }}>{footer}</View>}
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { width: '100%', maxWidth: Layout.contentWidth, alignSelf: 'center', maxHeight: '94%', paddingTop: 8, overflow: 'hidden' },
  handle: { alignSelf: 'center', width: 34, height: 4, borderRadius: 2, marginBottom: 8 },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  body: { flexGrow: 0, flexShrink: 1 },
});
