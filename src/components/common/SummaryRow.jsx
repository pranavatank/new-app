import React from 'react';
import { Text, View } from 'react-native';
import { scaleTheme } from '../../constants/theme';
import { useTheme } from '../../store/ThemeContext';

export default function SummaryRow({ label, value, emphasis = false, color, divider = false, style }) {
  const { C, scale } = useTheme();
  const { Typography, Spacing } = scaleTheme(scale);
  return <View style={[{ minHeight: 46, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: Spacing.sm, paddingVertical: Spacing.sm, borderTopWidth: divider ? 1 : 0, borderTopColor: C.divider }, style]}>
    <Text style={{ flex: 1, color: emphasis ? C.textPrimary : C.textSecondary, fontSize: Typography.sizes.base, fontWeight: emphasis ? Typography.weights.bold : Typography.weights.medium }}>{label}</Text>
    <Text style={{ flexShrink: 1, color: color || (emphasis ? C.primary : C.textPrimary), fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold, textAlign: 'right' }}>{value}</Text>
  </View>;
}
