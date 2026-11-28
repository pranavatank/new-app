import React, { useState } from 'react';
import { Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Button, IconBadge, IconButton } from '../common';
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
  const [expanded, setExpanded] = useState(false);
  const isNote = entry.kind === 'note';
  const isTransfer = entry.kind === 'transfer';
  const historical = isTransfer && entry.direction === 'out';
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
    title = t(outgoing ? 'ledger.historical_cash_adjustment' : 'ledger.locker_in');
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
  const canManage = !historical && (onEdit || onDelete);
  const metadata = [
    isExpense && t(paymentLabel(entry.payment_type)),
    !isNote && entry.kind !== 'legacy_receipt' && entry.note,
  ].filter(Boolean).join(' · ');
  const manage = action => {
    setExpanded(false);
    action(entry);
  };

  return (
    <View style={{ paddingVertical: Spacing.sm }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.sm }}>
        <IconBadge icon={icon} photoUri={photoUri} emoji={photoUri ? undefined : image} color={onlineNote ? C.online : tint} size={36} />
        <View style={{ flex: 1, minWidth: 0, gap: Spacing.xs }}>
          <Text style={{ color: C.textPrimary, fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold }}>{title}</Text>
          {!!metadata && <Text style={{ color: C.textSecondary, fontSize: Typography.sizes.sm }}>{metadata}</Text>}
        </View>
        {!isNote && <Text style={{ maxWidth: '42%', flexShrink: 1, textAlign: 'right', color: onlineNote ? C.online : outgoing ? C.expense : C.income, fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold }}>
          {(onlineNote ? '' : outgoing ? '−' : '+') + money(entry.amount, i18n.language)}
        </Text>}
        {!!canManage && <IconButton icon={expanded ? 'chevron-up-outline' : 'ellipsis-horizontal'} label={t('ledger.entry_actions', { entry: title })}
          accessibilityState={{ expanded }} onPress={() => setExpanded(open => !open)} style={{ backgroundColor: C.transparent }} />}
      </View>
      {!!canManage && expanded && <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', gap: Spacing.xs }}>
        {onEdit && <Button variant="secondary" label={t('common.edit')} icon="pencil-outline" size="sm" onPress={() => manage(onEdit)} />}
        {onDelete && <Button variant="ghost" label={t('common.delete')} icon="trash-outline" size="sm" onPress={() => manage(onDelete)} />}
      </View>}
    </View>
  );
}
