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
import Row from '../common/Row';
import IconBadge from '../common/IconBadge';
import { money } from './LedgerEntryRow';

const empty = { amount: '', note: '', text: '', categoryId: null, paymentType: 'cash', direction: 'in', expenseMode: 'items', itemAmounts: {}, newItem: '', countedCash: '' };
const isImageUri = value => typeof value === 'string' && /^(file:|content:|data:|https?:)/i.test(value);
const logoProps = ({ icon, icon_type: iconType }) => icon &&
  (iconType === 'image' || iconType === 'photo' || isImageUri(icon)) ? { photoUri: icon } : { emoji: icon };
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

export default function LedgerEntryForm({ visible, mode, date, entry, onClose, onSaved, walletBalance, onForgotten, openingAmount }) {
  const { C, scale } = useTheme();
  const { t, i18n } = useTranslation();
  const { Typography, Spacing } = scaleTheme(scale);
  const [form, setForm] = useState(empty);
  const [categories, setCategories] = useState([]);
  const [items, setItems] = useState([]);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [choosingCategory, setChoosingCategory] = useState(false);
  const [showNote, setShowNote] = useState(false);
  const [showNewItem, setShowNewItem] = useState(false);
  const [activeItemId, setActiveItemId] = useState(null);
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
      const list = getAllCategories().filter(category => !onForgotten || category.name !== 'Forgotten');
      if (entry?.category_id && !list.some(c => Number(c.id) === Number(entry.category_id))) {
        list.unshift({ id: entry.category_id, name: entry.category_name || 'Other', icon: entry.icon, icon_type: entry.icon_type });
      }
      setCategories(list);
    } catch { setCategories([]); }
  }, [visible, entry, kind, Boolean(onForgotten)]);

  useEffect(() => {
    const initial = mode === 'locker_opening' && openingAmount != null ? { ...empty, amount: String(openingAmount) } : makeInitial(entry);
    initialForm.current = initial;
    setForm(initial);
    setChoosingCategory(false);
    setShowNote(!!initial.note);
    setShowNewItem(false);
    setActiveItemId(null);
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
  }, [entry, mode, date, visible, openingAmount]);

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
    setForm(current => Number(current.categoryId) === Number(id) ? current : {
      ...current, categoryId: id, newItem: '', expenseMode: list.length ? 'items' : 'total',
    });
    if (Number(form.categoryId) !== Number(id)) setShowNewItem(false);
    setChoosingCategory(false);
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
      setShowNewItem(false);
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

  const dateLabel = date && new Date(`${date}T00:00:00`).toLocaleDateString(i18n.language === 'gu' ? 'gu-IN-u-nu-latn' : 'en-IN', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });
  const category = categories.find(c => Number(c.id) === Number(form.categoryId));
  const pickingCategory = kind === 'expense' && (choosingCategory || !category);
  const labelStyle = { color: C.textPrimary, fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold, textAlign: 'center', marginBottom: Spacing.sm };
  const centeredChips = { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.sm };
  const chipStyle = { minHeight: 44, maxWidth: '100%', justifyContent: 'center' };
  const actualCash = parseCashAmount(form.countedCash);
  const missingCash = Number.isFinite(actualCash) && actualCash >= 0 && Number.isFinite(walletBalance)
    ? Math.round((walletBalance - actualCash) * 100) / 100 : null;
  const showCashHelper = kind === 'forgotten' && !entry && Number.isFinite(walletBalance);
  const paymentOptions = [
    ['cash', 'wallet-outline', C.primary, t('ledger.wallet_short')],
    ['locker', 'lock-closed-outline', C.online, t('ledger.locker_short')],
    ['online', 'card-outline', C.iconTask, t('ledger.online_short')],
  ];
  const noteField = <Input value={form.note} onChangeText={v => update('note', v)} placeholder={t('ledger.optional_note')} />;
  const categoryChip = (c, index) => {
    return <Chip key={c.id} size="md" {...logoProps(c)} icon={c.icon ? undefined : 'cart-outline'} color={C.accents[index % C.accents.length]} label={translateCategoryName(c.name, t)} active={Number(form.categoryId) === Number(c.id)} onPress={() => selectCategory(c.id)} style={chipStyle} />;
  };

  const showSave = !pickingCategory && !showNewItem;
  const footer = <>
    {!!error && <Text accessibilityRole="alert" style={{ color: C.expense, fontSize: Typography.sizes.base, marginBottom: Spacing.sm }}>{error}</Text>}
    {showSave && <Button label={saving ? t('ledger.saving') : t('common.save')} onPress={save} loading={saving} fullWidth />}
  </>;
  return <Sheet visible={visible} onClose={close} title={entry && kind === 'expense' ? t('common.edit') : title}
    bodyKey={pickingCategory ? 'categories' : kind} footer={showSave || error ? footer : undefined}>
    {kind !== 'locker_opening' && <Text style={{ color: C.textSecondary, fontSize: Typography.sizes.sm, textAlign: 'center', marginBottom: Spacing.sm }}>{dateLabel}</Text>}
    {!!hint && <Text style={{ color: C.textSecondary, fontSize: Typography.sizes.base, marginBottom: Spacing.md }}>{hint}</Text>}
    {takingCash && <Text style={{ color: C.primary, fontSize: Typography.sizes.sm, marginBottom: Spacing.sm }}>{limitMessage(limit)}</Text>}
    <View style={{ paddingBottom: Spacing.md, gap: Spacing.md }}>
      {kind === 'note' ? <Input value={form.text} onChangeText={v => update('text', v)} placeholder={t('ledger.note_placeholder')} multiline inputStyle={{ minHeight: 130, textAlignVertical: 'top' }} /> : <>
        {kind === 'expense' && <>
          {pickingCategory ? <>
            <Text accessibilityRole="header" style={labelStyle}>{t('ledger.choose_expense_category')}</Text>
            <View style={centeredChips}>{categories.map(categoryChip)}</View>
            {!form.categoryId && onForgotten && <Card padding="none" elevation="none" style={{ backgroundColor: C.sandBg, borderWidth: 0, marginTop: Spacing.md, paddingHorizontal: Spacing.md }}>
              <Row icon="help-circle-outline" iconColor={C.warning} label={t('ledger.add_forgotten')} subtitle={t('ledger.forgotten_short')} onPress={onForgotten} />
            </Card>}
            {!!category && <Button label={t('common.cancel')} variant="ghost" size="sm" onPress={() => { setChoosingCategory(false); setError(''); }} />}
          </> : <>
            <Card padding="xs" elevation="none" style={{ backgroundColor: C.primaryDim, flexDirection: 'row', alignItems: 'center',
              flexWrap: 'wrap', gap: Spacing.xs, borderWidth: 0, marginBottom: Spacing.sm }}>
              <View style={{ flexGrow: 1, flexBasis: 120, flexDirection: 'row', gap: Spacing.xs, alignItems: 'center' }}>
                <IconBadge {...logoProps(category)} icon="cart-outline" size={32} color={C.iconExpense} />
                <Text accessibilityRole="header" style={{ ...labelStyle, marginBottom: 0, flexShrink: 1 }}>{translateCategoryName(category.name, t)}</Text>
              </View>
              <Button label={t('ledger.change_expense_category')} icon="swap-horizontal-outline" variant="ghost" size="sm"
                onPress={() => { setChoosingCategory(true); setError(''); }} />
            </Card>
            <Text style={labelStyle}>{t('ledger.payment')}</Text>
            <View style={[centeredChips, { marginBottom: Spacing.sm }]}>
              {paymentOptions.map(([type, icon, color, label]) => <Chip key={type} icon={icon} color={color} label={label}
                accessibilityLabel={t(paymentLabel(type))} active={form.paymentType === type} onPress={() => update('paymentType', type)}
                style={[chipStyle, { flexGrow: 1, flexBasis: '28%', minWidth: 72, paddingHorizontal: Spacing.xs }]} />)}
            </View>
            {form.paymentType === 'online' && <Text style={{ color: C.online, fontSize: Typography.sizes.sm, textAlign: 'center', marginBottom: Spacing.md }}>{t('ledger.online_note_hint')}</Text>}
            {!!items.length && <View style={[centeredChips, { marginBottom: Spacing.xs }]}>
              <Chip label={t('ledger.expense_by_items')} active={form.expenseMode === 'items'} onPress={() => update('expenseMode', 'items')} style={chipStyle} />
              <Chip label={t('ledger.category_total')} active={form.expenseMode === 'total'} onPress={() => update('expenseMode', 'total')} style={chipStyle} />
            </View>}
            {form.expenseMode === 'items' && items.length ? items.map(item =>
              <AmountInput key={item.id} inline compact={items.length > 1} history={history(item.id)} style={{ paddingVertical: Spacing.xs }}
                showCompactSuggestions={activeItemId === item.id} onFocus={() => setActiveItemId(item.id)}
                label={item.name + (item.inactive ? ' · ' + t('ledger.inactive_item') : '')}
                labelLeading={<IconBadge {...logoProps(item)} icon="pricetag-outline" size={26} color={C.iconExpense} />}
                value={form.itemAmounts[item.id] || ''} onChangeText={value => {
                setForm(current => ({ ...current, itemAmounts: { ...current.itemAmounts, [item.id]: value } }));
                setError('');
              }} />) : <AmountInput centered history={history(null)} label={t('ledger.amount')} value={form.amount} onChangeText={v => update('amount', v)} />}
            <View style={[centeredChips, { marginTop: Spacing.xs }]}>
              {(!entry || !items.length) && !showNewItem && <Button label={t('ledger.add_item')} icon="add" variant="ghost" size="sm" onPress={() => setShowNewItem(true)} />}
              {!showNote && <Button label={t('ledger.optional_note')} icon="create-outline" variant="ghost" size="sm" onPress={() => setShowNote(true)} />}
            </View>
            {showNewItem && <Card padding="sm" elevation="none">
              <Input value={form.newItem} onChangeText={v => update('newItem', v)} label={t('ledger.new_item')} placeholder={t('ledger.item_name')} />
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, marginTop: Spacing.xs }}>
                <Button label={t('ledger.add_item')} size="sm" icon="add" onPress={addItem} disabled={!form.newItem.trim()} />
                <Button label={t('common.cancel')} size="sm" variant="ghost" onPress={() => { update('newItem', ''); setShowNewItem(false); }} />
              </View>
            </Card>}
            {showNote && noteField}
          </>}
        </>}
        {showCashHelper && <Card padding="md" elevation="none" style={{ backgroundColor: C.sandBg, borderWidth: 0, gap: Spacing.sm }}>
          <Text style={{ ...labelStyle, marginBottom: 0 }}>{t('ledger.wallet_expected', { amount: money(walletBalance, i18n.language) })}</Text>
          <Input label={t('ledger.wallet_counted')} value={form.countedCash} placeholder="0" keyboardType="decimal-pad"
            onChangeText={v => { setForm(current => ({ ...current, countedCash: v, amount: '' })); setError(''); }} />
          {missingCash > 0 && <Button label={t('ledger.use_missing_cash', { amount: money(missingCash, i18n.language) })}
            size="sm" variant="secondary" onPress={() => update('amount', String(missingCash))} />}
          {missingCash !== null && missingCash <= 0 && <Text style={{ color: C.textSecondary, fontSize: Typography.sizes.sm }}>{t('ledger.no_missing_cash')}</Text>}
        </Card>}
        {kind !== 'expense' && <AmountInput centered history={kind === 'forgotten' ? null : history(null)} label={t('ledger.amount')} value={form.amount}
          onChangeText={v => update('amount', v)} step={takingCash || kind === 'deposit_locker' || kind === 'locker_opening' ? 100 : 10}
          limit={takingCash ? limit ?? 0 : Infinity} showSuggestions={kind !== 'forgotten'} />}
        {kind !== 'locker_opening' && kind !== 'expense' && noteField}
      </>}
    </View>
  </Sheet>;
}
