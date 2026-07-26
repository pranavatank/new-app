import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { scaleTheme, makeShadow } from '../../constants/theme';
import { useTheme } from '../../store/ThemeContext';

/**
 * variant: 'primary' (gradient fill) | 'secondary' (tinted) | 'ghost' (text only) | 'danger'
 * size: 'sm' | 'md' | 'lg'
 */
export default function Button({
  label,
  onPress,
  variant = 'primary',
  size = 'md',
  icon,
  loading = false,
  disabled = false,
  fullWidth = false,
  style,
}) {
  const { C, scale } = useTheme();
  const { Typography, Spacing, Radius } = scaleTheme(scale);
  const Shadow = makeShadow(C);

  const sizes = {
    sm: { padV: Spacing.sm, padH: Spacing.md, font: Typography.sizes.sm, iconSize: 16 },
    md: { padV: Spacing.md, padH: Spacing.lg, font: Typography.sizes.base, iconSize: 18 },
    lg: { padV: Spacing.lg, padH: Spacing.xl, font: Typography.sizes.md, iconSize: 20 },
  };
  const sz = sizes[size] || sizes.md;
  const isDisabled = disabled || loading;

  const content = (
    <View style={styles.row}>
      {loading ? (
        <ActivityIndicator size="small" color={variant === 'primary' || variant === 'danger' ? C.textOnPrimary : C.primary} />
      ) : (
        <>
          {icon && (
            <Ionicons
              name={icon}
              size={sz.iconSize}
              color={variant === 'primary' || variant === 'danger' ? C.textOnPrimary : C.primary}
              style={label ? { marginRight: Spacing.xs } : null}
            />
          )}
          {!!label && (
            <Text
              style={{
                fontSize: sz.font,
                fontWeight: Typography.weights.bold,
                color:
                  variant === 'primary' || variant === 'danger'
                    ? C.textOnPrimary
                    : variant === 'ghost'
                    ? C.primary
                    : C.primary,
              }}
              numberOfLines={1}
            >
              {label}
            </Text>
          )}
        </>
      )}
    </View>
  );

  const shared = {
    paddingVertical: sz.padV,
    paddingHorizontal: sz.padH,
    borderRadius: Radius.full,
    alignItems: 'center',
    justifyContent: 'center',
    opacity: isDisabled ? 0.5 : 1,
    width: fullWidth ? '100%' : undefined,
  };

  if (variant === 'primary') {
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={onPress} disabled={isDisabled} style={[fullWidth && { width: '100%' }, style]}>
        <LinearGradient colors={C.gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[shared, Shadow.primary]}>
          {content}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  if (variant === 'danger') {
    return (
      <TouchableOpacity activeOpacity={0.85} onPress={onPress} disabled={isDisabled} style={[fullWidth && { width: '100%' }, style]}>
        <LinearGradient colors={C.gradients.expense} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[shared, Shadow.sm]}>
          {content}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  if (variant === 'secondary') {
    return (
      <TouchableOpacity
        activeOpacity={0.75}
        onPress={onPress}
        disabled={isDisabled}
        style={[shared, { backgroundColor: C.primaryDim }, style]}
      >
        {content}
      </TouchableOpacity>
    );
  }

  // ghost
  return (
    <TouchableOpacity
      activeOpacity={0.6}
      onPress={onPress}
      disabled={isDisabled}
      style={[shared, { backgroundColor: 'transparent' }, style]}
    >
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});
