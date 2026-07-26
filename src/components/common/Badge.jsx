import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { scaleTheme } from '../../constants/theme';
import { useTheme } from '../../store/ThemeContext';

/** Small count/status badge, e.g. task counts next to a SectionHeader. */
export default function Badge({ label, color, style }) {
  const { C, scale } = useTheme();
  const { Typography, Spacing, Radius } = scaleTheme(scale);
  const tint = color || C.primary;

  return (
    <View
      style={[
        styles.base,
        { backgroundColor: tint + '22', borderRadius: Radius.full, paddingHorizontal: Spacing.sm, paddingVertical: 2 },
        style,
      ]}
    >
      <Text style={{ fontSize: Typography.sizes.xs, fontWeight: Typography.weights.black, color: tint }}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignSelf: 'flex-start', alignItems: 'center', justifyContent: 'center' },
});
