import React from 'react';
import { TouchableOpacity, Text, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { scaleTheme } from '../../constants/theme';
import { useTheme } from '../../store/ThemeContext';

/**
 * Small filter/tag pill. Used for category chips, mood tags, overdue/pending
 * task tags, etc.
 */
export default function Chip({ label, icon, emoji, color, active = false, onPress, style, wrap = true, size = 'sm' }) {
  const { C, scale } = useTheme();
  const { Typography, Spacing, Radius } = scaleTheme(scale);
  const tint = color || C.primary;
  const Wrapper = onPress ? TouchableOpacity : View;

  return (
    <Wrapper
      activeOpacity={0.75}
      onPress={onPress}
      style={[
        styles.base,
        {
          borderRadius: Radius.full,
          paddingVertical: Spacing.xs,
          paddingHorizontal: Spacing.md,
          backgroundColor: active ? tint : tint + '1A',
          borderWidth: 1,
          borderColor: active ? tint : tint + '33',
        },
        style,
      ]}
    >
      {emoji ? (
        <Text style={{ fontSize: Typography.sizes.sm, marginRight: 4 }}>{emoji}</Text>
      ) : icon ? (
        <Ionicons name={icon} size={14} color={active ? C.textOnPrimary : tint} style={{ marginRight: 4 }} />
      ) : null}
      <Text
        style={{
          fontSize: size === 'lg' ? Typography.sizes.base : size === 'md' ? Typography.sizes.sm : Typography.sizes.xs,
          fontWeight: Typography.weights.bold,
          color: active ? C.textOnPrimary : tint,
          flexShrink: 1,
        }}
        numberOfLines={wrap ? undefined : 1}
      >
        {label}
      </Text>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', flexWrap: 'wrap' },
});
