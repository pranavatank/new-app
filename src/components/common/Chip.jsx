import React from 'react';
import { TouchableOpacity, Text, Image, View, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { scaleTheme } from '../../constants/theme';
import { useTheme } from '../../store/ThemeContext';

/**
 * Small filter/tag pill. Used for category chips, mood tags, overdue/pending
 * task tags, etc.
 */
export default function Chip({ label, accessibilityLabel = label, icon, emoji, photoUri, color, active, onPress, style, wrap = true, size = 'sm' }) {
  const { C, scale } = useTheme();
  const { Typography, Spacing, Radius } = scaleTheme(scale);
  const tint = color || C.primary;
  const Wrapper = onPress ? TouchableOpacity : View;

  return (
    <Wrapper
      activeOpacity={0.75}
      accessibilityRole={onPress ? 'button' : undefined}
      accessibilityLabel={onPress ? accessibilityLabel : undefined}
      accessibilityState={onPress && active != null ? { selected: active } : undefined}
      aria-pressed={onPress && active != null ? active : undefined}
      onPress={onPress}
      style={[
        styles.base,
        {
          borderRadius: Radius.full,
          paddingVertical: Spacing.xs,
          paddingHorizontal: Spacing.md,
          columnGap: Spacing.xs,
          backgroundColor: active ? tint : tint + '1A',
          borderWidth: 1,
          borderColor: active ? tint : tint + '33',
        },
        style,
      ]}
    >
      {photoUri ? (
        <Image source={{ uri: photoUri }} style={styles.photo} />
      ) : emoji ? (
        <Text style={{ fontSize: Typography.sizes.sm, includeFontPadding: false }}>{emoji}</Text>
      ) : icon ? (
        <Ionicons name={icon} size={16} color={active ? C.textOnPrimary : tint} style={{ includeFontPadding: false }} />
      ) : null}
      <Text
        style={{
          fontSize: size === 'lg' ? Typography.sizes.base : size === 'md' ? Typography.sizes.sm : Typography.sizes.xs,
          fontWeight: Typography.weights.bold,
          color: active ? C.textOnPrimary : tint,
          flexShrink: 1,
          textAlign: 'center',
          includeFontPadding: false,
        }}
        numberOfLines={wrap ? undefined : 1}
      >
        {label}
      </Text>
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  base: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', alignSelf: 'flex-start', minWidth: 0 },
  photo: { width: 22, height: 22, borderRadius: 11 },
});
