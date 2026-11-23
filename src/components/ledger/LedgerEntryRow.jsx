import React from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, IconBadge } from '../common';
import { translateCategoryName } from '../../constants/defaultCategories';
import { scaleTheme } from '../../constants/theme';
import { useTheme } from '../../store/ThemeContext';
import { paymentLabel } from '../../utils/cash';

export const money = (value, language = 'en') => '₹' + Number(value || 0).toLocaleString(
  language === 'gu' ? 'gu-IN-u-nu-latn' : 'en-IN',
  { maximumFractionDigits: 2 }
);

function expenseLabel(entry, t) {
  const category = entry.category_name ? translateCategoryName(entry.category_name, t) : t('ledger.expense');
  return entry.item_name ? category + ' · ' + entry.item_name : category;
}

export default function LedgerEntryRow({ entry, onEdit, onDelete }) {
  const { C, scale } = useTheme();
  const { Typography, Spacing } = scaleTheme(scale);
  const { t, i18n } = useTranslation();
  const isNote = entry.kind === 'note';
  const isTransfer = entry.kind === 'transfer';
  const isExpense = entry.kind === 'expense';
  const onlineNote = entry.payment_type === 'online';
  const outgoing = (isExpense && !onlineNote) || entry.direction === 'out';
  let title = t('ledger.entry');
  let icon = 'wallet-outline';
  let tint = C.income;

  if (isNote) {
    title = entry.text || entry.note;
    icon = 'document-text-outline';
    tint = C.iconNotes;
  } else if (isExpense) {
    title = entry.origin === 'forgotten' ? t('ledger.add_forgotten') : expenseLabel(entry, t);
    icon = 'cart-outline';
    tint = C.iconExpense;
  } else if (isTransfer) {
    title = t(outgoing ? 'ledger.locker_out' : 'ledger.locker_in');
    icon = 'lock-closed-outline';
    tint = C.primary;
  } else if (entry.kind === 'legacy_receipt') {
    title = t('ledger.cash_receipts');
  } else if (entry.kind === 'receipt') {
    title = t(entry.account === 'locker' ? 'ledger.outside_cash' : 'ledger.receipts');
  }

  const image = entry.item_icon || entry.icon;
  const iconType = entry.item_icon ? entry.item_icon_type : entry.icon_type;
  const photoUri = image && (iconType === 'image' || /^(file:|content:|data:|https?:)/i.test(image)) ? image : undefined;

  return (
    <View style={{ paddingVertical: Spacing.md, borderBottomWidth: 1, borderBottomColor: C.divider, gap: Spacing.xs }}>
      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md }}>
        <IconBadge icon={icon} photoUri={photoUri} emoji={photoUri ? undefined : image} color={tint} size={40} />
        <View style={{ flex: 1, gap: Spacing.xs }}>
          <Text style={{ color: C.textPrimary, fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold }}>{title}</Text>
          {!!entry.note && !isNote && entry.kind !== 'legacy_receipt' &&
            <Text style={{ color: C.textSecondary, fontSize: Typography.sizes.sm }}>{entry.note}</Text>}
          {isExpense && <Text style={{ color: C.textSecondary, fontSize: Typography.sizes.sm }}>
            {t(paymentLabel(entry.payment_type))}
          </Text>}
        </View>
        {!isNote && <Text style={{ maxWidth: '42%', flexShrink: 1, textAlign: 'right', color: onlineNote ? C.online : outgoing ? C.expense : C.income, fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold }}>
          {(onlineNote ? '' : outgoing ? '−' : '+') + money(entry.amount, i18n.language)}
        </Text>}
      </View>
      {(onEdit || onDelete) && <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: Spacing.xs }}>
        {onEdit && <Button variant="secondary" label={t('common.edit')} icon="pencil-outline" size="sm" onPress={() => onEdit(entry)} />}
        {onDelete && <Button variant="ghost" label={t('common.delete')} icon="trash-outline" size="sm" onPress={() => onDelete(entry)} />}
      </View>}
    </View>
  );
}
