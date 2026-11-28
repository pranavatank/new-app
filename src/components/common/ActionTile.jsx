import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { scaleTheme } from '../../constants/theme';
import { useTheme } from '../../store/ThemeContext';
import IconBadge from './IconBadge';

export default function ActionTile({ label, icon, color, onPress, style, variant = 'surface', vertical = false, background }) {
  const { C, scale } = useTheme();
  const { Typography, Radius, Spacing } = scaleTheme(scale);
  const tint = color || C.primary;
  const filled = variant === 'filled';
  const tinted = variant === 'tinted';
  const foreground = filled ? C.textOnPrimary : C.textPrimary;
  return <TouchableOpacity accessibilityRole="button" accessibilityLabel={label} onPress={onPress} activeOpacity={0.78}
    style={[{ flexGrow: 1, flexShrink: 1, flexBasis: 0, minWidth: 0,
      minHeight: vertical ? 80 : 48, flexDirection: vertical ? 'column' : 'row',
      alignItems: vertical ? 'flex-start' : 'center', padding: vertical ? Spacing.md : Spacing.sm,
      borderRadius: Radius.lg, backgroundColor: background || (filled ? C.primary : tinted ? C.primaryDim : C.bgCard),
      gap: vertical ? Spacing.sm : Spacing.xs }, style]}>
    <IconBadge icon={icon} size={vertical ? 36 : 26} color={filled ? foreground : tint}
      style={filled ? { backgroundColor: foreground + '28' } : undefined} />
    <Text style={{ flex: vertical ? undefined : 1, color: foreground,
      fontSize: vertical ? Typography.sizes.base : Typography.sizes.sm, fontWeight: Typography.weights.bold }}>{label}</Text>
  </TouchableOpacity>;
}
