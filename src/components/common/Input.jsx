import React, { useState } from 'react';
import { View, Text, TextInput, StyleSheet } from 'react-native';
import { scaleTheme } from '../../constants/theme';
import { useTheme } from '../../store/ThemeContext';

export default function Input({ label, style, inputStyle, ...rest }) {
  const { C, scale } = useTheme();
  const { Typography, Spacing, Radius } = scaleTheme(scale);
  const [focused, setFocused] = useState(false);

  return (
    <View style={style}>
      {!!label && (
        <Text
          style={{
            fontSize: Typography.sizes.xs,
            fontWeight: Typography.weights.bold,
            color: C.textSecondary,
            marginBottom: Spacing.xs,
            letterSpacing: 0.3,
          }}
        >
          {label}
        </Text>
      )}
      <TextInput
        placeholderTextColor={C.textMuted}
        onFocus={(e) => { setFocused(true); rest.onFocus?.(e); }}
        onBlur={(e) => { setFocused(false); rest.onBlur?.(e); }}
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
