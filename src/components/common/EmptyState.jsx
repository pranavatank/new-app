import React from 'react';
import { View, Text } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { scaleTheme } from '../../constants/theme';
import { useTheme } from '../../store/ThemeContext';

export default function EmptyState({ icon = 'file-tray-outline', title, subtitle, style }) {
  const { C, scale } = useTheme();
  const { Typography, Spacing } = scaleTheme(scale);

  return (
    <View style={[{ alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.md }, style]}>
      <View
        style={{
          width: 40,
          height: 40,
          borderRadius: 20,
          backgroundColor: C.bgElevated,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: Spacing.sm,
        }}
      >
        <Ionicons name={icon} size={20} color={C.textMuted} />
      </View>
      {!!title && (
        <Text style={{ fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold, color: C.textPrimary, textAlign: 'center' }}>
          {title}
        </Text>
      )}
      {!!subtitle && (
        <Text
          style={{
            fontSize: Typography.sizes.sm,
            color: C.textMuted,
            marginTop: Spacing.xs,
            textAlign: 'center',
            paddingHorizontal: Spacing.sm,
          }}
        >
          {subtitle}
        </Text>
      )}
    </View>
  );
}
