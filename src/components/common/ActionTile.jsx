import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { makeShadow, scaleTheme } from '../../constants/theme';
import { useTheme } from '../../store/ThemeContext';
import IconBadge from './IconBadge';

export default function ActionTile({ label, icon, color, onPress, style }) {
  const { C, scale } = useTheme();
  const { Typography, Radius, Spacing } = scaleTheme(scale);
  const tint = color || C.primary;
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} onPress={onPress} activeOpacity={0.78}
    style={[makeShadow(C).sm, { flex: 1, minWidth: 120, minHeight: 92, padding: Spacing.md, borderRadius: Radius.xl, backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, justifyContent: 'center', gap: Spacing.sm }, style]}>
    <IconBadge icon={icon} size={38} color={tint} />
    <Text style={{ color: C.textPrimary, fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold }}>{label}</Text>
  </TouchableOpacity>;
}
