import React, { useState } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { Layout, scaleTheme } from '../constants/theme';
import { useTheme } from '../store/ThemeContext';
import { parseCashAmount } from '../utils/cash';
import { Button, Input } from './common';

export default function OdometerInput({ value, onChange }) {
  const { t } = useTranslation();
  const { C, scale } = useTheme();
  const { Typography, Spacing, Radius } = scaleTheme(scale);
  const [typing, setTyping] = useState(false);
  const parsed = parseCashAmount(value);
  const normalized = Number.isFinite(parsed) ? parsed : 0;
  const [whole, fraction = '0'] = normalized.toLocaleString('en-US', { useGrouping: false, maximumFractionDigits: 12 }).split('.');
  const digits = whole.padStart(5, '0').split('').concat(fraction[0]);
  const last = digits.length - 1;

  const adjust = (index, delta) => {
    const next = [...digits];
    next[index] = String((Number(next[index]) + delta + 10) % 10);
    onChange(Number(next.slice(0, -1).join('')) + '.' + next[last] + fraction.slice(1));
  };

  const arrow = (index, delta) => (
    <Pressable accessibilityRole="button"
      accessibilityLabel={t(delta > 0 ? 'vehicle.increaseDigit' : 'vehicle.decreaseDigit', { digit: index + 1 })}
      onPress={() => adjust(index, delta)}
      style={({ pressed }) => ({ alignItems: 'center', justifyContent: 'center', minHeight: Layout.touchTarget, width: '100%', backgroundColor: pressed ? C.primaryDim : C.transparent })}>
      <Ionicons name={delta > 0 ? 'chevron-up' : 'chevron-down'} size={18} color={C.primary} />
    </Pressable>
  );

  const wheels = (
    <View style={{ flexDirection: 'row', alignItems: 'center', columnGap: 3 }}>
      {digits.map((digit, index) => (
        <React.Fragment key={index}>
          {index === last && <Text style={{ color: C.textSecondary, fontSize: Typography.sizes.md }}>.</Text>}
          <View style={{ flex: 1, minWidth: 38, alignItems: 'center', overflow: 'hidden', borderWidth: 1,
            borderColor: C.border, borderRadius: Radius.md, backgroundColor: index === last ? C.primaryDim : C.bgInput }}>
            {arrow(index, 1)}
            <Text style={{ color: C.textPrimary, fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold }}>{digit}</Text>
            {arrow(index, -1)}
          </View>
        </React.Fragment>
      ))}
    </View>
  );

  return (
    <View style={{ gap: Spacing.xs }}>
      {typing ? <Input label={t('vehicle.odometer')} value={value} onChangeText={onChange} keyboardType="decimal-pad" />
        : <>
          <Text accessibilityRole="header" style={{ color: C.textSecondary, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold }}>{t('vehicle.odometer')}</Text>
          {digits.length > 6 ? <ScrollView horizontal>{wheels}</ScrollView> : wheels}
        </>}
      <Button size="sm" variant="ghost" icon={typing ? 'speedometer-outline' : 'keypad-outline'}
        label={t(typing ? 'vehicle.useOdometer' : 'vehicle.typeReading')}
        onPress={() => setTyping(current => !current)} style={{ alignSelf: 'flex-start' }} />
    </View>
  );
}
