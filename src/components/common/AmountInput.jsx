import React, { useMemo, useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getAmountHistory } from '../../db/ledger';
import { parseCashAmount, suggestAmounts } from '../../utils/cash';
import { Layout, scaleTheme } from '../../constants/theme';
import { useTheme } from '../../store/ThemeContext';
import Button from './Button';
import IconButton from './IconButton';
import Input from './Input';

const expenseDefaults = [50, 100, 200];
const defaultsByKind = {
  deposit_locker: [1000, 2000, 5000],
  take_locker: [500, 1000, 2000],
  legacy_deposit: [500, 1000, 2000],
  locker_opening: [500, 1000, 2000],
  recurring: [500, 1000, 2000],
  purchase: [500, 1000, 2000],
  fuel_price: [90, 100, 110],
};

export default function AmountInput({
  value, onChangeText, style, history, limit = Infinity, step = 10, compact = false, centered = false, inline = false,
  showSuggestions = true, showCompactSuggestions, label, labelLeading, onFocus, ...props
}) {
  const { t } = useTranslation();
  const { C, scale } = useTheme();
  const { Spacing, Typography } = scaleTheme(scale);
  const [focused, setFocused] = useState(false);
  const { kind, date, id, categoryId, itemId, paymentType, category } = history || {};
  const past = useMemo(() => kind
    ? getAmountHistory({ kind, date, id, categoryId, itemId, paymentType, category })
    : [], [kind, date, id, categoryId, itemId, paymentType, category]);
  const suggestions = showSuggestions ? suggestAmounts(past, defaultsByKind[kind] || expenseDefaults, limit) : [];
  const parsed = parseCashAmount(value);
  const current = Number.isFinite(parsed) ? parsed : 0;
  const adjust = delta => onChangeText(String(Math.round(100 * Math.max(0, Math.min(limit, current + delta))) / 100));
  const stepLabel = action => inline && label
    ? t('ledger.' + action + '_item_amount', { item: label, step })
    : t('ledger.' + action + '_amount', { step });

  return (
    <View style={style}>
      <View style={inline && { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: Spacing.xs }}>
        {inline && <View style={{ flexGrow: 1, flexBasis: 96, flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
          {labelLeading}
          <Text style={{ flexShrink: 1, color: C.textPrimary, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold }}>{label}</Text>
        </View>}
        <View style={{ flexDirection: 'row', alignItems: inline ? 'center' : 'flex-end', gap: Spacing.xs,
          ...(inline && { flexGrow: 1, flexBasis: 148 }) }}>
          <IconButton icon="remove" label={stepLabel('decrease')} onPress={() => adjust(-step)} disabled={current <= 0} />
          <Input {...props} label={inline ? undefined : label} accessibilityLabel={props.accessibilityLabel ?? label} labelLeading={labelLeading}
            value={value} onChangeText={onChangeText} placeholder="0" keyboardType="decimal-pad"
            autoComplete="off" importantForAutofill="no" style={{ flex: 1, minWidth: 0 }}
            inputStyle={[props.inputStyle, centered && { textAlign: 'center' },
              inline && { minHeight: Layout.touchTarget, paddingHorizontal: Spacing.xs, paddingVertical: Spacing.xs, textAlign: 'center' }]}
            labelStyle={[props.labelStyle, centered && { textAlign: 'center' }]}
            labelRowStyle={centered ? { justifyContent: 'center' } : undefined}
            onFocus={event => { setFocused(true); onFocus?.(event); }} onBlur={() => setFocused(false)} />
          <IconButton icon="add" label={stepLabel('increase')} onPress={() => adjust(step)} disabled={current >= limit} />
        </View>
      </View>
      {(!compact || (showCompactSuggestions ?? focused)) && suggestions.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginTop: Spacing.xs,
          justifyContent: centered || inline ? 'center' : 'flex-start' }}>
          {suggestions.map(amount => (
            <Button key={amount} size="sm" variant={current === amount ? 'primary' : 'secondary'}
              label={'₹' + amount.toLocaleString('en-IN')} onPress={() => onChangeText(String(amount))} />
          ))}
        </View>
      )}
    </View>
  );
}
