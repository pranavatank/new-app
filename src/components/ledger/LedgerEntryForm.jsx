import React, { useEffect, useMemo, useRef, useState } from 'react';
import { View, Text, Alert } from 'react-native';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../../store/ThemeContext';
import { scaleTheme } from '../../constants/theme';
import { getAllCategories, getAllCategoryItems, addCategoryItem } from '../../db/queries';
import { translateCategoryName } from '../../constants/defaultCategories';
import { getLockerWithdrawalLimit, saveExpense, saveExpenseBatch, saveMovement, saveDailyNote, setLockerOpeningBalance } from '../../db/ledger';
import { parseCashAmount, paymentLabel } from '../../utils/cash';
import Sheet from '../common/Sheet';
import Input from '../common/Input';
import AmountInput from '../common/AmountInput';
import Chip from '../common/Chip';
import Button from '../common/Button';
import Card from '../common/Card';

const empty = { amount: '', note: '', text: '', categoryId: null, paymentType: 'cash', direction: 'in', expenseMode: 'items', itemAmounts: {}, newItem: '' };
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
  const kind = mode || (
    entry?.origin === 'forgotten' ? 'forgotten' :
    entry?.kind === 'note' ? 'note' :
    entry?.kind === 'receipt' ? (entry.account === 'locker' ? 'deposit_locker' : 'legacy_wallet_receipt') :
    entry?.kind === 'transfer' ? 'take_locker' :
    'expense'
  );
  const title = t(`ledger.add_${kind}`);
  const hint = ['deposit_locker', 'take_locker', 'forgotten', 'locker_opening'].includes(kind)
    ? t(`ledger.${kind}_hint`) : null;
  const takingCash = kind === 'take_locker';
  const limit = useMemo(() => visible && takingCash ? getLockerWithdrawalLimit(date, entry?.id) : null,
    [visible, takingCash, date, entry?.id]);
  const limitMessage = value => value == null ? t('ledger.withdrawal_opening_needed')
    : t('ledger.withdrawal_available', { amount: '₹' + value.toLocaleString('en-IN') });
  const history = itemId => visible ? { kind, date, id: entry?.id, categoryId: form.categoryId, itemId, paymentType: form.paymentType } : null;

  useEffect(() => {
    if (!visible || kind !== 'expense') return;
    try {
      const list = getAllCategories();
      if (entry?.category_id && !list.some(c => Number(c.id) === Number(entry.category_id))) {
        list.unshift({ id: entry.category_id, name: entry.category_name || 'Other', icon: entry.icon, icon_type: entry.icon_type });
      }
      setCategories(list);
    } catch { setCategories([]); }
  }, [visible, entry, kind]);

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
    let list = [];
    try { list = getAllCategoryItems(id); }
    catch { setError(t('ledger.items_load_failed')); return; }
    if (entry?.item_id && Number(entry.category_id) === Number(id) && !list.some(i => Number(i.id) === Number(entry.item_id))) {
      list.unshift({ id: entry.item_id, name: entry.item_name || t('ledger.inactive_item'), icon: entry.item_icon, icon_type: entry.item_icon_type, inactive: true });
    }
    setItems(list);
    setForm(current => ({ ...current, categoryId: id, expenseMode: list.length ? 'items' : 'total' }));
    setError('');
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

  const filledItems = useMemo(() => items.map(item => ({ itemId: item.id, amount: parseCashAmount(form.itemAmounts[item.id]) })).filter(x => form.itemAmounts[x.itemId]?.trim()), [items, form.itemAmounts]);
  const save = () => {
    if (saveLock.current) return;
    if (kind === 'note' && !form.text.trim()) { setError(t('ledger.note_required')); return; }
    if (kind === 'expense' && !form.categoryId) { setError(t('ledger.category_required')); return; }
    const amount = parseCashAmount(form.amount);
    if (kind === 'locker_opening' && (!Number.isFinite(amount) || amount < 0)) { setError(t('ledger.locker_opening_required')); return; }
    if (!['note','expense','locker_opening'].includes(kind) && (!Number.isFinite(amount) || amount <= 0)) { setError(t('ledger.amount_required')); return; }
    if (takingCash && (limit == null || Math.round(amount * 100) / 100 > limit)) { setError(limitMessage(limit)); return; }
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
      else if (kind === 'forgotten') saveExpense({ id: entry?.id, date, amount, note: form.note.trim(), forgotten: true });
      else if (kind === 'locker_opening') setLockerOpeningBalance(amount);
      else {
        const isReceipt = kind === 'deposit_locker' || kind === 'legacy_wallet_receipt';
        saveMovement({
          id: entry?.id, date, amount, note: form.note.trim(),
          kind: isReceipt ? 'receipt' : 'transfer',
          account: kind === 'deposit_locker' ? 'locker' : 'wallet',
          direction: isReceipt ? entry?.direction ?? 'in' : 'in',
        });
      }
      onSaved?.();
      const blank = { ...empty }; setForm(blank); initialForm.current = blank; setItems([]); onClose();
    } catch (failure) { setError(failure.code === 'LOCKER_LIMIT' ? limitMessage(failure.limit) : t('ledger.save_failed')); }
    finally { saveLock.current = false; setSaving(false); }
  };

  const dateLabel = new Date(`${date}T00:00:00`).toLocaleDateString(i18n.language === 'gu' ? 'gu-IN-u-nu-latn' : 'en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const categoryChip = c => {
    const emoji = c.icon_type !== 'image' && !isImageUri(c.icon) ? c.icon : null;
    return <Chip key={c.id} size="md" emoji={emoji} label={translateCategoryName(c.name, t)} active={Number(form.categoryId) === Number(c.id)} onPress={() => selectCategory(c.id)} style={{ marginRight: Spacing.xs, marginBottom: Spacing.xs, minHeight: 48, maxWidth: '100%' }} />;
  };

  const footer = <>
    {!!error && <Text accessibilityRole="alert" style={{ color: C.expense, fontSize: Typography.sizes.base, marginBottom: Spacing.sm }}>{error}</Text>}
    <Button label={saving ? t('ledger.saving') : t('common.save')} onPress={save} loading={saving} fullWidth />
  </>;
  return <Sheet visible={visible} onClose={close} title={entry && kind === 'expense' ? t('common.edit') : title} footer={footer}>
    <Text style={{ color: C.textSecondary, fontSize: Typography.sizes.base, marginBottom: Spacing.md }}>{dateLabel}</Text>
    {!!hint && <Text style={{ color: C.textSecondary, fontSize: Typography.sizes.base, marginBottom: Spacing.md }}>{hint}</Text>}
    {takingCash && <Text style={{ color: C.primary, fontSize: Typography.sizes.sm, marginBottom: Spacing.sm }}>{limitMessage(limit)}</Text>}
    <View style={{ paddingBottom: Spacing.sm }}>
      {kind === 'note' ? <Input value={form.text} onChangeText={v => update('text', v)} placeholder={t('ledger.note_placeholder')} multiline inputStyle={{ minHeight: 130, textAlignVertical: 'top' }} /> : <>
        {kind === 'expense' && <>
          <Text style={{ color: C.textSecondary, fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, marginBottom: Spacing.sm }}>{t('ledger.category')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: Spacing.sm }}>{categories.map(categoryChip)}</View>
          {!!form.categoryId && <>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: Spacing.sm }}>
              <Chip label={t('ledger.expense_by_items')} active={form.expenseMode === 'items'} onPress={() => update('expenseMode', 'items')} style={{ marginRight: Spacing.sm, marginBottom: Spacing.sm, minHeight: 44 }} />
              <Chip label={t('ledger.category_total')} active={form.expenseMode === 'total'} onPress={() => update('expenseMode', 'total')} style={{ marginBottom: Spacing.sm, minHeight: 44 }} />
            </View>
            {form.expenseMode === 'items' ? <>
              {items.map(item => <View key={item.id} style={{ marginBottom: Spacing.sm }}>
                <AmountInput compact history={history(item.id)} label={`${item.icon_type !== 'image' && !isImageUri(item.icon) ? `${item.icon || ''} ` : ''}${item.name}${item.inactive ? ` · ${t('ledger.inactive_item')}` : ''}`} value={form.itemAmounts[item.id] || ''} onChangeText={value => setForm(current => ({ ...current, itemAmounts: { ...current.itemAmounts, [item.id]: value } }))} />
              </View>)}
              {(!entry || !items.length) && <Card padding="md" elevation="none" style={{ marginBottom: Spacing.sm }}>
                {!items.length && <Text style={{ color: C.textSecondary, marginBottom: Spacing.sm }}>{t('ledger.no_category_items')}</Text>}
                <Input value={form.newItem} onChangeText={v => update('newItem', v)} label={t('ledger.new_item')} placeholder={t('ledger.item_name')} />
                <Button label={t('ledger.add_item')} icon="add" onPress={addItem} style={{ marginTop: Spacing.sm }} />
              </Card>}
            </> : <AmountInput history={history(null)} label={t('ledger.amount')} value={form.amount} onChangeText={v => update('amount', v)} />}
          </>}
          <Text style={{ color: C.textSecondary, fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, marginVertical: Spacing.sm }}>{t('ledger.payment')}</Text>
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.sm }}>
            {['cash', 'locker', 'online'].map(type => <Chip key={type} label={t(paymentLabel(type))}
              active={form.paymentType === type} onPress={() => update('paymentType', type)} style={{ minHeight: 44, maxWidth: '100%' }} />)}
          </View>
          {form.paymentType === 'online' && <Text style={{ color: C.textSecondary, marginBottom: Spacing.sm }}>{t('ledger.online_note_hint')}</Text>}
        </>}
        {kind !== 'expense' && <AmountInput history={history(null)} label={t('ledger.amount')} value={form.amount}
          onChangeText={v => update('amount', v)} step={takingCash || kind === 'deposit_locker' || kind === 'locker_opening' ? 100 : 10}
          limit={takingCash ? limit ?? 0 : Infinity} />}
        {kind !== 'locker_opening' && <Input value={form.note} onChangeText={v => update('note', v)} placeholder={t('ledger.optional_note')} />}
      </>}
    </View>
  </Sheet>;
}
