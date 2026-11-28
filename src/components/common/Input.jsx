import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { scaleTheme } from '../../constants/theme';
import { useTheme } from '../../store/ThemeContext';

export default function Input({ label, style, inputStyle, labelStyle, onFocus, onBlur, ...rest }) {
  const { C, scale } = useTheme();
  const { Typography, Spacing, Radius } = scaleTheme(scale);
  const [focused, setFocused] = useState(false);

  return (
    <View style={style}>
      {!!label && (
        <Text
          style={[{
            fontWeight: Typography.weights.bold,
            color: C.textSecondary,
            marginBottom: Spacing.xs,
            letterSpacing: 0.3,
            fontSize: Typography.sizes.sm,
          }, labelStyle]}
        >
          {label}
        </Text>
      )}
      <TextInput
        accessibilityLabel={typeof label === 'string' ? label : undefined}
        placeholderTextColor={C.textMuted}
        onFocus={(e) => { setFocused(true); onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); onBlur?.(e); }}
        style={[
          styles.base,
          {
            backgroundColor: C.bgInput,
            borderColor: focused ? C.primary : C.border,
            borderRadius: Radius.md,
            paddingHorizontal: Spacing.md,
            paddingVertical: Spacing.md,
            fontSize: Typography.sizes.base,
            color: C.textPrimary,
          },
          inputStyle,
        ]}
        {...rest}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  base: { borderWidth: 1.5 },
});
