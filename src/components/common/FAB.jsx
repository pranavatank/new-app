import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { makeShadow } from '../../constants/theme';
import { useTheme } from '../../store/ThemeContext';

/** Floating action button, e.g. quick-deposit on Home, add-item elsewhere. */
export default function FAB({ icon = 'add', onPress, size = 56, style, gradient }) {
  const { C } = useTheme();
  const Shadow = makeShadow(C);
  const colors = gradient || C.gradients.primary;

  return (
    <TouchableOpacity activeOpacity={0.85} onPress={onPress} style={[{ width: size, height: size }, style]}>
      <LinearGradient
        colors={colors}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[styles.base, { width: size, height: size, borderRadius: size / 2 }, Shadow.primary]}
      >
        <Ionicons name={icon} size={size * 0.45} color={C.textOnPrimary} />
      </LinearGradient>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  base: { alignItems: 'center', justifyContent: 'center' },
});
