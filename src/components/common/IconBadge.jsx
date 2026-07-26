import React from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { scaleTheme } from '../../constants/theme';
import { useTheme } from '../../store/ThemeContext';

/**
 * Circular icon container used everywhere a "domain icon" is shown:
 * category/expense-item icons (icon_type: 'emoji' | 'image'), place icons,
 * section header icons, nav icons, status circles.
 *
 * Pass exactly one of: `emoji`, `photoUri`, `icon` (Ionicons name),
 * `mciIcon` (MaterialCommunityIcons name).
 */
export default function IconBadge({
  emoji,
  photoUri,
  icon,
  mciIcon,
  color, // tint / accent color for background + icon
  size = 44,
  iconRatio = 0.5,
  rounded = 'full', // 'full' | 'lg'
  style,
}) {
  const { C, scale } = useTheme();
  const { Radius } = scaleTheme(scale);
  const tint = color || C.primary;
  const borderRadius = rounded === 'full' ? size / 2 : Radius.lg;

  return (
    <View
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius,
          backgroundColor: photoUri ? C.bgElevated : tint + '22',
        },
        style,
      ]}
    >
      {photoUri ? (
        <Image source={{ uri: photoUri }} style={{ width: size, height: size, borderRadius }} />
      ) : emoji ? (
        <Text style={{ fontSize: size * 0.5 }}>{emoji}</Text>
      ) : mciIcon ? (
        <MaterialCommunityIcons name={mciIcon} size={size * iconRatio} color={tint} />
      ) : (
        <Ionicons name={icon || 'ellipse'} size={size * iconRatio} color={tint} />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
});
