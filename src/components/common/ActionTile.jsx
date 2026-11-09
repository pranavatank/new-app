import React from 'react';
import { Text, TouchableOpacity } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { scaleTheme } from '../../constants/theme';
import { useTheme } from '../../store/ThemeContext';

export default function ActionTile({ label, icon, color, onPress, style }) {
  const { C, scale } = useTheme();
  const { Typography, Radius, Spacing } = scaleTheme(scale);
  const tint = color || C.primary;
  return <TouchableOpacity accessibilityRole="button" onPress={onPress} activeOpacity={0.78} style={[{ flex: 1, minWidth: 120, minHeight: 76, padding: Spacing.md, borderRadius: Radius.lg, backgroundColor: C.bgElevated, borderWidth: 1, borderColor: C.border, alignItems: 'center', justifyContent: 'center', gap: Spacing.xs }, style]}>
    <Ionicons name={icon} size={26} color={tint} />
    <Text style={{ color: C.textPrimary, fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold, textAlign: 'center', flexShrink: 1 }}>{label}</Text>
  </TouchableOpacity>;
}
