import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Alert, ScrollView, Image } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../store/ThemeContext';
import { scaleTheme } from '../../constants/theme';
import { getAllCategories, getAllCategoryItems, addCategoryItem } from '../../db/queries';
import { translateCategoryName } from '../../constants/defaultCategories';
import { saveExpense, saveExpenseBatch, saveMovement, saveDailyNote } from '../../db/ledger';
import Sheet from '../common/Sheet';
import Input from '../common/Input';
import Chip from '../common/Chip';
import Button from '../common/Button';
import Card from '../common/Card';

const empty = { amount: '', note: '', text: '', categoryId: null, paymentType: 'cash', direction: 'in', expenseMode: 'items', itemAmounts: {}, newItem: '' };
const toAsciiNumber = value => Number(String(value).replace(/[\u0AE6-\u0AEF]/g, digit => String('૦૧૨૩૪૫૬૭૮૯'.indexOf(digit))).replace(/[ ,\s]/g, ''));
const isImageUri = value => typeof value === 'string' && /^(file:|content:|data:|https?:)/i.test(value);
const makeInitial = entry => entry ? {
  ...empty,
  amount: entry.amount == null ? '' : String(entry.amount),
  note: entry.note || '',
  text: entry.text || entry.note || '',
  categoryId: entry.category_id || null,
  paymentType: entry.payment_type || 'cash',
  direction: entry.direction || 'in',
  expenseMode: entry.item_id != null ? 'items' : 'total',
  itemAmounts: entry.item_id != null ? { [entry.item_id]: String(entry.amount ?? '') } : {},
} : { ...empty };

export default function LedgerEntryForm({ visible, mode, date, entry, onClose, onSaved }) {
  const { C, scale } = useTheme();
  const { t, i18n } = useTranslation();
  const { Typography, Spacing } = scaleTheme(scale);
  const [form, setForm] = useState(empty);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const initialForm = useRef(empty);
  const saveLock = useRef(false);
  const kind = mode || (entry?.kind === 'note' ? 'note' : entry?.kind === 'receipt' || entry?.kind === 'legacy_receipt' ? 'receipt' : entry?.kind === 'transfer' ? 'locker' : 'expense');
  const title = t(`ledger.add_${kind}`);

  useEffect(() => {
    if (!visible) return;
    try {
      const list = getAllCategories();
      if (entry?.category_id && !list.some(c => Number(c.id) === Number(entry.category_id))) {
        list.unshift({ id: entry.category_id, name: entry.category_name || 'Other', icon: entry.icon, icon_type: entry.icon_type });
      }
      setCategories(list);
    } catch { setCategories([]); }
  }, [visible, entry]);

  useEffect(() => {
    const initial = makeInitial(entry);
    initialForm.current = initial;
    setForm(initial);
    setError('');
    if (initial.categoryId) {
      try {
        const list = getAllCategoryItems(initial.categoryId);
        if (entry?.item_id && !list.some(i => Number(i.id) === Number(entry.item_id))) {
          list.unshift({ id: entry.item_id, name: entry.item_name || t('ledger.inactive_item'), icon: entry.item_icon, icon_type: entry.item_icon_type, inactive: true });
        }
        setItems(list);
      } catch { setItems([]); }
    } else setItems([]);
  }, [entry, mode, date, visible]);

  const update = (key, value) => { setForm(current => ({ ...current, [key]: value })); setError(''); };
  const dirty = JSON.stringify(form) !== JSON.stringify(initialForm.current);
  const close = () => {
    if (saving) return;
    if (!dirty) { onClose(); return; }
    Alert.alert(t('ledger.unsaved_title'), t('ledger.unsaved_body'), [
      { text: t('ledger.keep_editing'), style: 'cancel' },
      { text: t('ledger.discard'), style: 'destructive', onPress: () => { setForm({ ...empty }); setItems([]); setError(''); onClose(); } },
    ]);
  };

  const selectCategory = id => {
    const category = categories.find(c => Number(c.id) === Number(id));
    let list = [];
    try { list = getAllCategoryItems(id); } catch { setError(t('ledger.items_load_failed')); }
    if (entry?.item_id && Number(entry.category_id) === Number(id) && !list.some(i => Number(i.id) === Number(entry.item_id))) {
      list.unshift({ id: entry.item_id, name: entry.item_name || t('ledger.inactive_item'), icon: entry.item_icon, icon_type: entry.item_icon_type, inactive: true });
    }
    setItems(list);
    setForm(current => ({ ...current, categoryId: id, itemAmounts: current.itemAmounts, expenseMode: list.length ? 'items' : 'total' }));
    setError('');
    return category;
  };

  const addItem = () => {
    const name = form.newItem.trim();
    if (!form.categoryId || !name) return;
    try {
      addCategoryItem(form.categoryId, name);
      const list = getAllCategoryItems(form.categoryId);
      setItems(list);
      setForm(current => ({ ...current, newItem: '', expenseMode: 'items' }));
      setError('');
    } catch { setError(t('ledger.item_add_failed')); }
  };

  const filledItems = useMemo(() => items.map(item => ({ itemId: item.id, amount: toAsciiNumber(form.itemAmounts[item.id]) })).filter(x => form.itemAmounts[x.itemId]?.trim()), [items, form.itemAmounts]);
  const save = () => {
    if (saveLock.current) return;
    if (kind === 'note' && !form.text.trim()) { setError(t('ledger.note_required')); return; }
    if (kind === 'expense' && !form.categoryId) { setError(t('ledger.category_required')); return; }
    const amount = toAsciiNumber(form.amount);
    if (kind !== 'note' && kind !== 'expense' && (!Number.isFinite(amount) || amount <= 0)) { setError(t('ledger.amount_required')); return; }
    if (kind === 'expense') {
      if (form.expenseMode === 'total' && (!Number.isFinite(amount) || amount <= 0)) { setError(t('ledger.amount_required')); return; }
      if (form.expenseMode === 'items' && (!filledItems.length || filledItems.some(x => !Number.isFinite(x.amount) || x.amount <= 0))) { setError(t('ledger.item_amount_required')); return; }
    }
    saveLock.current = true; setSaving(true); setError('');
    try {
      if (kind === 'expense') {
        if (entry) {
          if (form.expenseMode === 'items') {
            if (filledItems.length !== 1) { setError(t('ledger.edit_one_item')); return; }
            const selected = filledItems[0];
            saveExpense({ id: entry.id, date, categoryId: form.categoryId, amount: selected.amount, itemId: selected.itemId, paymentType: form.paymentType, note: form.note.trim() });
          } else saveExpense({ id: entry.id, date, categoryId: form.categoryId, amount, itemId: null, paymentType: form.paymentType, note: form.note.trim() });
        } else if (form.expenseMode === 'items') {
          saveExpenseBatch({ date, categoryId: form.categoryId, paymentType: form.paymentType, note: form.note.trim(), items: filledItems });
        } else {
          saveExpense({ id: entry?.id, date, categoryId: form.categoryId, amount, itemId: null, paymentType: form.paymentType, note: form.note.trim() });
        }
      } else if (kind === 'note') saveDailyNote({ id: entry?.id, date, text: form.text.trim() });
      else saveMovement({ id: entry?.kind === 'legacy_receipt' ? undefined : entry?.id, date, kind: kind === 'locker' ? 'transfer' : 'receipt', amount, direction: kind === 'locker' ? form.direction : 'in', note: form.note.trim() });
      onSaved?.();
      const blank = { ...empty }; setForm(blank); initialForm.current = blank; setItems([]); onClose();
    } catch { setError(t('ledger.save_failed')); }
    finally { saveLock.current = false; setSaving(false); }
  };

  const dateLabel = new Date(`${date}T00:00:00`).toLocaleDateString(i18n.language === 'gu' ? 'gu-IN-u-nu-latn' : 'en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const categoryChip = c => {
    const emoji = c.icon_type !== 'image' && !isImageUri(c.icon) ? c.icon : null;
    return <Chip key={c.id} size="md" emoji={emoji} label={translateCategoryName(c.name, t)} active={Number(form.categoryId) === Number(c.id)} onPress={() => selectCategory(c.id)} style={{ marginRight: Spacing.xs, marginBottom: Spacing.xs, minHeight: 48, maxWidth: '100%' }} />;
  };

  return <Sheet visible={visible} onClose={close} title={entry ? t('common.edit') : title}>
    <Text style={{ color: C.textSecondary, fontSize: Typography.sizes.base, marginBottom: Spacing.md }}>{dateLabel}</Text>
    <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: Spacing.lg }}>
      {kind === 'note' ? <Input value={form.text} onChangeText={v => update('text', v)} placeholder={t('ledger.note_placeholder')} multiline inputStyle={{ minHeight: 130, textAlignVertical: 'top' }} /> : <>
        {kind === 'expense' && <>
          <Text style={{ color: C.textSecondary, fontSize: Typography.sizes.md, fontWeight: '700', marginBottom: Spacing.sm }}>{t('ledger.category')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: Spacing.sm }}>{categories.map(categoryChip)}</View>
          {!!form.categoryId && <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: Spacing.sm }}>
              <Chip label={t('ledger.expense_by_items')} active={form.expenseMode === 'items'} onPress={() => update('expenseMode', 'items')} style={{ marginRight: Spacing.sm, marginBottom: Spacing.sm, minHeight: 44 }} />
              <Chip label={t('ledger.category_total')} active={form.expenseMode === 'total'} onPress={() => update('expenseMode', 'total')} style={{ marginBottom: Spacing.sm, minHeight: 44 }} />
            </View>
            {form.expenseMode === 'items' ? <>
              {items.map(item => <View key={item.id} style={{ marginBottom: Spacing.sm }}>
                <Input label={`${item.icon_type !== 'image' && !isImageUri(item.icon) ? `${item.icon || ''} ` : ''}${item.name}${item.inactive ? ` · ${t('ledger.inactive_item')}` : ''}`} value={form.itemAmounts[item.id] || ''} onChangeText={value => setForm(current => ({ ...current, itemAmounts: { ...current.itemAmounts, [item.id]: value } }))} placeholder="0" keyboardType="decimal-pad" />
              </View>)}
              {!items.length && <Card padding="md" elevation="none" style={{ marginBottom: Spacing.sm }}><Text style={{ color: C.textSecondary, marginBottom: Spacing.sm }}>{t('ledger.no_category_items')}</Text><Input value={form.newItem} onChangeText={v => update('newItem', v)} label={t('ledger.new_item')} placeholder={t('ledger.item_name')} /><Button label={t('ledger.add_item')} icon="add" onPress={addItem} style={{ marginTop: Spacing.sm }} /></Card>}
            </> : <Input label={t('ledger.amount')} value={form.amount} onChangeText={v => update('amount', v)} placeholder="0" keyboardType="decimal-pad" inputStyle={{ fontSize: Typography.sizes.xl, fontWeight: '800' }} />}
          </>}
          <Text style={{ color: C.textSecondary, fontSize: Typography.sizes.md, fontWeight: '700', marginVertical: Spacing.sm }}>{t('ledger.payment')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: Spacing.sm }}><Chip label={t('ledger.cash')} active={form.paymentType === 'cash'} onPress={() => update('paymentType', 'cash')} style={{ marginRight: Spacing.sm, marginBottom: Spacing.sm, minHeight: 44 }} /><Chip label={t('ledger.online')} active={form.paymentType === 'online'} onPress={() => update('paymentType', 'online')} style={{ marginBottom: Spacing.sm, minHeight: 44 }} /></View>
        </>}
        {kind !== 'expense' && <Input label={t('ledger.amount')} value={form.amount} onChangeText={v => update('amount', v)} placeholder="0" keyboardType="decimal-pad" inputStyle={{ fontSize: Typography.sizes.xl, fontWeight: '800' }} />}
        {kind === 'locker' && <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginVertical: Spacing.sm }}><Chip label={t('ledger.locker_in')} active={form.direction === 'in'} onPress={() => update('direction', 'in')} style={{ marginRight: Spacing.sm, minHeight: 44 }} /><Chip label={t('ledger.locker_out')} active={form.direction === 'out'} onPress={() => update('direction', 'out')} style={{ minHeight: 44 }} /></View>}
        <Input value={form.note} onChangeText={v => update('note', v)} placeholder={t('ledger.optional_note')} />
      </>}
      {!!error && <Text accessibilityRole="alert" style={{ color: C.expense, fontSize: Typography.sizes.base, marginVertical: Spacing.sm }}>{error}</Text>}
      <Button label={saving ? t('ledger.saving') : t('common.save')} onPress={save} loading={saving} fullWidth style={{ marginTop: Spacing.md }} />
    </ScrollView>
  </Sheet>;
}
