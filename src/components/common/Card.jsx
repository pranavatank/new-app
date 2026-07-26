import React from 'react';
import { View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { scaleTheme, makeShadow } from '../../constants/theme';
import { useTheme } from '../../store/ThemeContext';

/**
 * Base surface used everywhere a "card" is needed (replaces the many
 * per-screen local `Card` consts). Pass `gradient` (array of colors, or
 * true to use theme.gradients.card) for a gradient-filled card.
 */
export default function Card({
  children,
  style,
  gradient,
  padding = 'base',
  elevation = 'sm', // 'none' | 'sm' | 'md' | 'lg'
  ...rest
}) {
  const { C, scale } = useTheme();
  const { Spacing, Radius } = scaleTheme(scale);
  const Shadow = makeShadow(C);

  const pad = padding === 'none' ? 0 : Spacing[padding] ?? Spacing.base;
  const shadowStyle = elevation === 'none' ? null : Shadow[elevation] || Shadow.sm;

  const base = {
    borderRadius: Radius.lg,
    padding: pad,
    borderWidth: 1,
    borderColor: C.border,
  };

  if (gradient) {
    const colors = Array.isArray(gradient) ? gradient : C.gradients.card;
    return (
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[base, shadowStyle, style]}
        {...rest}
      >
        {children}
      </LinearGradient>
    );
  }

  return (
    <View style={[base, { backgroundColor: C.bgCard }, shadowStyle, style]} {...rest}>
      {children}
    </View>
  );
}
