import React from 'react';
import { View, Text, Modal, Pressable, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { scaleTheme, makeShadow } from '../../constants/theme';
import { useTheme } from '../../store/ThemeContext';

/**
 * Shared bottom-sheet modal. Consolidates the duplicated local `Sheet`
 * components previously defined separately in Expense.jsx / ExpenseItems.jsx.
 */
export default function Sheet({ visible, onClose, title, children, scroll = true }) {
  const { C, scale } = useTheme();
  const { Typography, Spacing, Radius } = scaleTheme(scale);
  const Shadow = makeShadow(C);
  const insets = useSafeAreaInsets();

  const Body = scroll ? ScrollView : View;
  const bodyProps = scroll
    ? { keyboardShouldPersistTaps: 'handled', showsVerticalScrollIndicator: false }
    : {};

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <Pressable style={[styles.overlay, { backgroundColor: C.overlay }]} onPress={onClose}>
          <Pressable
            style={[
              styles.sheet,
              {
                backgroundColor: C.bgCard,
                borderTopLeftRadius: Radius.xxl,
                borderTopRightRadius: Radius.xxl,
                paddingBottom: (insets?.bottom || 0) + Spacing.lg,
                paddingHorizontal: Spacing.lg,
              },
              Shadow.lg,
            ]}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={[styles.handle, { backgroundColor: C.textMuted }]} />
            {!!title && (
              <View style={[styles.header, { marginBottom: Spacing.md }]}>
                <Text style={{ flex: 1, minWidth: 0, flexShrink: 1, fontSize: Typography.sizes.lg, fontWeight: Typography.weights.black, color: C.textPrimary }}>
                  {title}
                </Text>
                <TouchableOpacity
                  style={[styles.closeBtn, { backgroundColor: C.bgElevated, minWidth: 44, minHeight: 44 }]}
                  onPress={onClose}
                  hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                >
                  <Ionicons name="close" size={18} color={C.textSecondary} />
                </TouchableOpacity>
              </View>
            )}
            <Body {...bodyProps}>{children}</Body>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { maxHeight: '90%', paddingTop: 10 },
  handle: { alignSelf: 'center', width: 40, height: 4, borderRadius: 2, marginBottom: 12 },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  closeBtn: { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
});
