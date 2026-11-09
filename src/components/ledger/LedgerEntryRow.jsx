import React from 'react';
import { View, Text, TouchableOpacity, Image } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { translateCategoryName } from '../../constants/defaultCategories';
import useLedgerTheme from './useLedgerTheme';

export const money = (value, language = 'en') => `₹${Number(value || 0).toLocaleString(language === 'gu' ? 'gu-IN-u-nu-latn' : 'en-IN', { maximumFractionDigits: 2 })}`;
const isImageUri = value => typeof value === 'string' && /^(file:|content:|data:|https?:)/i.test(value);

export default function LedgerEntryRow({ entry, onEdit, onDelete }) {
  const { C } = useLedgerTheme();
  const { t, i18n } = useTranslation();
  const isNote = entry.kind === 'note';
  const isTransfer = entry.kind === 'transfer';
  const isLegacyReceipt = entry.kind === 'legacy_receipt';
  const imageUri = entry.icon && (entry.icon_type === 'image' || isImageUri(entry.icon)) ? entry.icon : null;
  const textIcon = entry.icon && !imageUri ? entry.icon : null;
  const title = isNote ? (entry.text || entry.note) : isLegacyReceipt ? t('ledger.cash_receipts') : isTransfer
    ? (entry.direction === 'out' ? t('ledger.locker_out') : t('ledger.locker_in'))
    : entry.category_name ? translateCategoryName(entry.category_name, t) : t(`ledger.${entry.kind}`, { defaultValue: t('ledger.entry') });
  const icon = textIcon || (isNote ? 'document-text-outline' : isTransfer ? 'lock-closed-outline' : entry.kind === 'receipt' || isLegacyReceipt ? 'wallet-outline' : 'cart-outline');
  const outgoing = entry.kind === 'expense' || (isTransfer && entry.direction === 'out');
  return (
    <View style={{ paddingVertical: 11, borderBottomWidth: 1, borderBottomColor: C.divider }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <View style={{ width: 42, height: 42, borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: isNote ? C.iconNotes + '18' : C.bgElevated }}>
          {imageUri ? <Image source={{ uri: imageUri }} resizeMode="cover" style={{ width: 42, height: 42, borderRadius: 14 }} /> : textIcon ? <Text style={{ fontSize: 20 }}>{textIcon}</Text> : <Ionicons name={icon} size={20} color={isNote ? C.iconNotes : C.primary} />}
        </View>
        <View style={{ flex: 1 }}>
          <Text style={{ color: C.textPrimary, fontSize: 17, fontWeight: '700' }}>{title}</Text>
          {!!(entry.note && !isNote && !isLegacyReceipt) && <Text style={{ color: C.textSecondary, fontSize: 15, marginTop: 3 }}>{entry.note}</Text>}
          {!isNote && !isTransfer && !!entry.payment_type && <Text style={{ color: C.textMuted, fontSize: 14, marginTop: 3 }}>{entry.payment_type === 'online' ? t('ledger.online') : t('ledger.cash')}</Text>}
        </View>
        {!isNote && <Text style={{ color: outgoing ? C.expense : C.income, fontWeight: '800', fontSize: 16 }}>{outgoing ? '−' : '+'}{money(entry.amount, i18n.language)}</Text>}
      </View>
      {(onEdit || onDelete) && <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 5 }}>
        {onEdit && <TouchableOpacity accessibilityRole="button" onPress={() => onEdit(entry)} style={{ minWidth: 78, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 10, borderRadius: 22, backgroundColor: C.bgElevated }}><Ionicons name="pencil-outline" size={16} color={C.textSecondary} /><Text style={{ color: C.textPrimary, fontSize: 14, fontWeight: '700' }}>{t('common.edit')}</Text></TouchableOpacity>}
        {onDelete && <TouchableOpacity accessibilityRole="button" onPress={() => onDelete(entry)} style={{ minWidth: 82, minHeight: 44, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 5, paddingHorizontal: 10, borderRadius: 22, backgroundColor: C.expenseBg }}><Ionicons name="trash-outline" size={16} color={C.expense} /><Text style={{ color: C.expense, fontSize: 14, fontWeight: '700' }}>{t('common.delete')}</Text></TouchableOpacity>}
      </View>}
    </View>
  );
}
