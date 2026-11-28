import React from 'react';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Layout, scaleTheme } from '../../constants/theme';
import { useTheme } from '../../store/ThemeContext';

export default function IconButton({ icon, label, onPress, style, disabled = false, accessibilityState }) {
  const { C, scale } = useTheme();
  const { Radius } = scaleTheme(scale);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} accessibilityState={{ ...accessibilityState, disabled }}
      aria-expanded={accessibilityState?.expanded} onPress={onPress} disabled={disabled}
      style={({ pressed }) => [{
        width: Layout.touchTarget,
        height: Layout.touchTarget,
        borderRadius: Radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? C.primaryDim : C.bgElevated,
        opacity: disabled ? 0.45 : 1,
      }, style]}>
      <Ionicons name={icon} size={22} color={C.primary} />
    </Pressable>
  );
}
