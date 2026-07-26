import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { scaleTheme, makeShadow } from '../../constants/theme';
import { useTheme } from '../../store/ThemeContext';

/**
 * Consistent top header for screens that don't use DayNavigator
 * (Analytics, Vehicle, Settings, ExpenseItems, etc.): title + optional
 * back button + optional right action icon.
 */
export default function ScreenHeader({ title, subtitle, onBack, rightIcon, onRightPress, style }) {
  const { C, scale } = useTheme();
  const { Typography, Spacing } = scaleTheme(scale);
  const Shadow = makeShadow(C);
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'ios' ? (insets?.top || 0) : 0;

  return (
    <View
      style={[
        styles.row,
        {
          backgroundColor: C.bgCard,
          borderBottomColor: C.border,
          paddingTop: topInset + Spacing.xs,
          paddingBottom: Spacing.sm,
          paddingHorizontal: Spacing.base,
        },
        Shadow.sm,
        style,
      ]}
    >
      {onBack ? (
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: C.bgElevated }]}
          onPress={onBack}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="chevron-back" size={20} color={C.primary} />
        </TouchableOpacity>
      ) : (
        <View style={styles.iconBtn} />
      )}

      <View style={{ flex: 1, alignItems: 'center' }}>
        <Text style={{ fontSize: Typography.sizes.md, fontWeight: Typography.weights.black, color: C.textPrimary }} numberOfLines={1}>
          {title}
        </Text>
        {!!subtitle && (
          <Text style={{ fontSize: Typography.sizes.xs, color: C.textSecondary, marginTop: 1 }} numberOfLines={1}>
            {subtitle}
          </Text>
        )}
      </View>

      {rightIcon ? (
        <TouchableOpacity
          style={[styles.iconBtn, { backgroundColor: C.bgElevated }]}
          onPress={onRightPress}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name={rightIcon} size={20} color={C.primary} />
        </TouchableOpacity>
      ) : (
        <View style={styles.iconBtn} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, alignItems: 'center', justifyContent: 'center' },
});
