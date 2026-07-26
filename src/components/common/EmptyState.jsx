import React from 'react';
import { View, Text } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { scaleTheme } from '../../constants/theme';
import { useTheme } from '../../store/ThemeContext';

export default function EmptyState({ icon = 'file-tray-outline', title, subtitle, style }) {
  const { C, scale } = useTheme();
  const { Typography, Spacing } = scaleTheme(scale);

  return (
    <View style={[{ alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.xxl }, style]}>
      <View
        style={{
          width: 64,
          height: 64,
          borderRadius: 32,
          backgroundColor: C.bgElevated,
          alignItems: 'center',
          justifyContent: 'center',
          marginBottom: Spacing.md,
        }}
      >
        <Ionicons name={icon} size={30} color={C.textMuted} />
      </View>
      {!!title && (
        <Text style={{ fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold, color: C.textSecondary }}>
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
            paddingHorizontal: Spacing.xl,
          }}
        >
          {subtitle}
        </Text>
      )}
    </View>
  );
}
