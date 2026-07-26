import React from 'react';
import { TouchableOpacity, View, Text, Switch, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { scaleTheme } from '../../constants/theme';
import { useTheme } from '../../store/ThemeContext';
import IconBadge from './IconBadge';

/**
 * Settings-style list row: leading icon, label (+ optional subtitle),
 * trailing accessory (chevron / switch / custom node / text).
 * Replaces the local Row/Chevron/SectionLabel pattern from Settings.jsx.
 */
export default function Row({
  icon,
  mciIcon,
  iconColor,
  label,
  subtitle,
  onPress,
  chevron = !!onPress,
  switchValue,
  onSwitchChange,
  right, // custom trailing node (overrides chevron/switch)
  danger = false,
  style,
}) {
  const { C, scale } = useTheme();
  const { Typography, Spacing } = scaleTheme(scale);
  const Wrapper = onPress ? TouchableOpacity : View;

  return (
    <Wrapper
      activeOpacity={0.7}
      onPress={onPress}
      style={[styles.row, { paddingVertical: Spacing.md }, style]}
    >
      {(icon || mciIcon) && (
        <IconBadge
          icon={icon}
          mciIcon={mciIcon}
          color={danger ? C.danger : iconColor || C.primary}
          size={38}
          style={{ marginRight: Spacing.md }}
        />
      )}
      <View style={{ flex: 1 }}>
        <Text
          style={{
            fontSize: Typography.sizes.base,
            fontWeight: Typography.weights.semibold,
            color: danger ? C.danger : C.textPrimary,
          }}
        >
          {label}
        </Text>
        {!!subtitle && (
          <Text style={{ fontSize: Typography.sizes.xs, color: C.textMuted, marginTop: 2 }}>{subtitle}</Text>
        )}
      </View>

      {right !== undefined ? (
        right
      ) : onSwitchChange ? (
        <Switch
          value={!!switchValue}
          onValueChange={onSwitchChange}
          trackColor={{ false: C.border, true: C.primarySoft }}
          thumbColor={switchValue ? C.primary : '#f4f3f4'}
        />
      ) : chevron ? (
        <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
      ) : null}
    </Wrapper>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center' },
});
