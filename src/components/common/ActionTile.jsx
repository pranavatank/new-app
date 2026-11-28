import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { scaleTheme } from '../../constants/theme';
import { useTheme } from '../../store/ThemeContext';
import IconBadge from './IconBadge';

export default function ActionTile({ label, icon, color, onPress, style, emphasized = false }) {
  const { C, scale } = useTheme();
  const { Typography, Radius, Spacing } = scaleTheme(scale);
  const tint = color || C.primary;
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} onPress={onPress} activeOpacity={0.78}
    style={[{ flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0, minHeight: 56, flexDirection: 'row',
      alignItems: 'center', padding: Spacing.sm, borderRadius: Radius.lg, backgroundColor: emphasized ? C.primaryDim : C.bgCard,
      borderWidth: 1, borderColor: emphasized ? C.primary + '40' : C.border, gap: Spacing.sm }, style]}>
    <IconBadge icon={icon} size={32} color={tint} />
    <Text style={{ flex: 1, color: C.textPrimary, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold }}>{label}</Text>
  </TouchableOpacity>;
}
