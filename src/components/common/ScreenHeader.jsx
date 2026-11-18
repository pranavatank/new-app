import React from 'react';
import { Platform, StyleSheet, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Layout, makeShadow, scaleTheme } from '../../constants/theme';
import { useTheme } from '../../store/ThemeContext';
import IconButton from './IconButton';

export default function ScreenHeader({ title, subtitle, onBack, rightIcon, rightLabel, onRightPress, style }) {
  const { C, scale } = useTheme();
  const { t } = useTranslation();
  const { Typography, Spacing } = scaleTheme(scale);
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'ios' ? insets.top : 0;

  return (
    <View style={[styles.row, makeShadow(C).sm, {
      backgroundColor: C.bgCard, borderBottomColor: C.border,
      paddingTop: topInset + Spacing.xs, paddingBottom: Spacing.sm, paddingHorizontal: Spacing.base,
      gap: Spacing.sm,
    }, style]}>
      {onBack ? <IconButton icon="chevron-back" label={t('common.back')} onPress={onBack} /> : <View style={styles.placeholder} />}
      <View style={styles.title}>
        <Text accessibilityRole="header" style={{ color: C.textPrimary, textAlign: 'center', fontSize: Typography.sizes.md, fontWeight: Typography.weights.black }}>
          {title}
        </Text>
        {!!subtitle && <Text style={{ color: C.textSecondary, textAlign: 'center', fontSize: Typography.sizes.xs }}>{subtitle}</Text>}
      </View>
      {rightIcon && onRightPress
        ? <IconButton icon={rightIcon} label={rightLabel} onPress={onRightPress} />
        : <View style={styles.placeholder} />}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1 },
  placeholder: { width: Layout.touchTarget },
  title: { flex: 1, alignItems: 'center' },
});
