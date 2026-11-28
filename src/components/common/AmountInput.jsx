import React, { useMemo, useState } from 'react';
import { View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { getAmountHistory } from '../../db/ledger';
import { parseCashAmount, suggestAmounts } from '../../utils/cash';
import { scaleTheme } from '../../constants/theme';
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
  value, onChangeText, style, history, limit = Infinity, step = 10, compact = false, ...props
}) {
  const { t } = useTranslation();
  const { scale } = useTheme();
  const { Spacing } = scaleTheme(scale);
  const [focused, setFocused] = useState(false);
  const { kind, date, id, categoryId, itemId, paymentType, category } = history || {};
  const past = useMemo(() => kind
    ? getAmountHistory({ kind, date, id, categoryId, itemId, paymentType, category })
    : [], [kind, date, id, categoryId, itemId, paymentType, category]);
  const suggestions = suggestAmounts(past, defaultsByKind[kind] || expenseDefaults, limit);
  const parsed = parseCashAmount(value);
  const current = Number.isFinite(parsed) ? parsed : 0;
  const adjust = delta => onChangeText(String(Math.round(100 * Math.max(0, Math.min(limit, current + delta))) / 100));

  return (
    <View style={style}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-end', gap: Spacing.xs }}>
        <IconButton icon="remove" label={t('ledger.decrease_amount', { step })} onPress={() => adjust(-step)} disabled={current <= 0} />
        <Input {...props} value={value} onChangeText={onChangeText} placeholder="0" keyboardType="decimal-pad"
          autoComplete="off" importantForAutofill="no" style={{ flex: 1, minWidth: 0 }}
          onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} />
        <IconButton icon="add" label={t('ledger.increase_amount', { step })} onPress={() => adjust(step)} disabled={current >= limit} />
      </View>
      {(!compact || focused) && suggestions.length > 0 && (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginTop: Spacing.xs }}>
          {suggestions.map(amount => (
            <Button key={amount} size="sm" variant={current === amount ? 'primary' : 'secondary'}
              label={'₹' + amount.toLocaleString('en-IN')} onPress={() => onChangeText(String(amount))} />
          ))}
        </View>
      )}
    </View>
  );
}
