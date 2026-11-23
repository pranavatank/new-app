import React from 'react';
import { TouchableOpacity, Text, ActivityIndicator, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { Layout, scaleTheme, makeShadow } from '../../constants/theme';
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
  wrap = true,
  style,
  accessibilityLabel = label,
  accessibilityState,
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
  const accessibility = {
    accessibilityRole: 'button',
    accessibilityLabel,
    accessibilityState: { ...accessibilityState, disabled: isDisabled, busy: loading },
    'aria-expanded': accessibilityState?.expanded,
  };

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
                flexShrink: 1,
                flexWrap: 'wrap',
                textAlign: 'center',
                color:
                  variant === 'primary' || variant === 'danger'
                    ? C.textOnPrimary
                    : variant === 'ghost'
                    ? C.primary
                    : C.primary,
              }}
              numberOfLines={wrap ? undefined : 1}
            >
              {label}
            </Text>
          )}
        </>
      )}
    </View>
  );

  const shared = {
    minHeight: Layout.touchTarget,
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
      <TouchableOpacity {...accessibility} activeOpacity={0.85} onPress={onPress} disabled={isDisabled} style={[fullWidth && { width: '100%' }, style]}>
        <LinearGradient colors={C.gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[shared, Shadow.primary]}>
          {content}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  if (variant === 'danger') {
    return (
      <TouchableOpacity {...accessibility} activeOpacity={0.85} onPress={onPress} disabled={isDisabled} style={[fullWidth && { width: '100%' }, style]}>
        <LinearGradient colors={C.gradients.expense} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={[shared, Shadow.sm]}>
          {content}
        </LinearGradient>
      </TouchableOpacity>
    );
  }

  if (variant === 'secondary') {
    return (
      <TouchableOpacity
        {...accessibility}
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
      {...accessibility}
      activeOpacity={0.6}
      onPress={onPress}
      disabled={isDisabled}
      style={[shared, { backgroundColor: C.transparent }, style]}
    >
      {content}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
});
