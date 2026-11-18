import React from 'react';
import { Pressable } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Layout, scaleTheme } from '../../constants/theme';
import { useTheme } from '../../store/ThemeContext';

export default function IconButton({ icon, label, onPress, style }) {
  const { C, scale } = useTheme();
  const { Radius } = scaleTheme(scale);
  return (
    <Pressable accessibilityRole="button" accessibilityLabel={label} onPress={onPress}
      style={({ pressed }) => [{
        width: Layout.touchTarget,
        height: Layout.touchTarget,
        borderRadius: Radius.full,
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: pressed ? C.primaryDim : C.bgElevated,
      }, style]}>
      <Ionicons name={icon} size={22} color={C.primary} />
    </Pressable>
  );
}
