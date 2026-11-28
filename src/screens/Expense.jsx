import React, { useState, useCallback, useEffect, useRef } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, StatusBar, useWindowDimensions, Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { Layout, Typography as BaseTypography, scaleTheme, makeShadow } from '../constants/theme';
import { useTheme } from '../store/ThemeContext';
import { parseCashAmount } from '../utils/cash';
import DayNavigator from '../components/DayNavigator';
import CashBalanceCard from '../components/ledger/CashBalanceCard';
import { saveGridAmounts } from '../db/ledger';
import useAppStore from '../store/useAppStore';
import { translateCategoryName } from '../constants/defaultCategories';
import { AmountInput, Card, Button, IconBadge, IconButton, Sheet, Input, Chip } from '../components/common';
import {
  getExpenseSummaryForDay,
  setExpenseAmount,
  updateDeposit,
  recalculateBalance,
  getAllCategories,
  addCategory,
  deleteCategory,
  getAllCategoryItems,
  getItemExpenses,
  updateCategory,
  setCategoryOrder,
} from '../db/queries';

// ── Helpers ───────────────────────────────────────────────────────────────────
// NOTE: No Dimensions at module level — moved inside component via hook.
// Module-level Dimensions.get('window') can return 0 in production APK on
// first bundle evaluation before the native layout is measured.

const fmt  = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const fmtN = (n) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 });
const categoryLogo = cat => cat.icon_type === 'image' || cat.icon_type === 'photo'
  ? { photoUri: cat.icon } : { emoji: cat.icon };

// ── Deposit Row ───────────────────────────────────────────────────────────────

const DepositRow = ({ deposit, onPress, C, T, S, R, Shadow, t }) => (
  <TouchableOpacity
    style={[dr.wrap, { backgroundColor: C.incomeBg, borderColor: C.income + '60', borderRadius: R.xl, padding: S.base, marginBottom: S.md }, Shadow.sm]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <IconBadge icon="cash-outline" color={C.income} size={48} style={{ marginRight: S.md }} />
    <View style={{ flex: 1 }}>
      <Text style={[dr.lbl, { color: C.income }]}>{t('expense.cashDeposit')}</Text>
      <Text style={[dr.val, { color: C.textPrimary, fontSize: T.sizes.md, fontWeight: T.weights.bold }]}>
        {deposit > 0 ? fmt(deposit) : t('expense.tapToSet')}
      </Text>
    </View>
    <View style={[dr.pill, { backgroundColor: C.income, borderRadius: R.full, paddingHorizontal: S.md }]}>
      <Text style={[{ color: C.textOnPrimary, fontSize: T.sizes.sm, fontWeight: T.weights.bold }]}>{deposit > 0 ? t('common.edit') : t('common.add')}</Text>
    </View>
  </TouchableOpacity>
);
const dr = StyleSheet.create({
  wrap:    { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5 },
  lbl:     { fontSize: BaseTypography.sizes.xs, fontWeight: BaseTypography.weights.bold, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 3 },
  val:     {},
  pill:    { paddingVertical: 8 },
});

// ── Deposit Sheet ─────────────────────────────────────────────────────────────

const DepositSheet = ({ visible, date, current, onSave, onDelete, onClose, C, T, S, t }) => {
  const [val, setVal] = useState('');

  React.useEffect(() => {
    if (visible) setVal(current > 0 ? String(current) : '');
  }, [visible]);

  const save = () => {
    const n = parseCashAmount(val);
    if (!Number.isFinite(n) || n < 0 || Math.abs(Math.round(n * 100) - n * 100) > 0.00001) { Alert.alert(t('ledger.error'), t('book.invalidAmount')); return; }
    if (onSave(n) !== false) onClose();
  };

  const handleDelete = () => {
    Alert.alert(t('common.delete'), t('expense.deleteDeposit'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => { onDelete(); onClose(); } },
    ]);
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={t('expense.depositTitle')} footer={
      <View style={[s2.btnRow, { gap: S.sm }]}>
        {current > 0 && (
          <Button label={t('common.delete')} variant="danger" onPress={handleDelete} style={{ flex: 1 }} />
        )}
        <Button label={t('expense.saveDeposit')} onPress={save} style={{ flex: 1 }} />
      </View>
    }>
      <Text style={[s2.sub, { color: C.textSecondary, fontSize: T.sizes.sm, marginBottom: S.lg }]}>{t('expense.depositPrompt')}</Text>

      <AmountInput label={t('ledger.amount')} value={val} onChangeText={setVal} step={100}
        history={visible ? { kind: 'legacy_deposit', date } : null} style={{ marginBottom: S.md }} />

    </Sheet>
  );
};
const s2 = StyleSheet.create({
  sub:     {},  btnRow:  { flexDirection: 'row' },
});

// ── Category Amount Sheet ─────────────────────────────────────────────────────

const GRID_PAYMENT_TYPES = ['cash', 'online'];

const AmountSheet = ({ visible, cat, onClose, C, T, S, t, dayId, selectedDate, onReload }) => {
  const [payment, setPayment] = useState('cash');
  const [mode, setMode] = useState('total');
  const [items, setItems] = useState([]);
  const [activeItemId, setActiveItemId] = useState(null);
  const [draft, setDraft] = useState(null);
  const [error, setError] = useState('');
  const original = useRef(null);

  useEffect(() => {
    if (!visible || !cat || !dayId) return;
    original.current = null;
    setDraft(null);
    setError('');
    setPayment('cash');
    setActiveItemId(null);
    try {
      const categoryItems = getAllCategoryItems(cat.id);
      const amounts = Object.fromEntries(GRID_PAYMENT_TYPES.map(type => {
        const entries = getItemExpenses(dayId, cat.id, type);
        const totals = entries.reduce((values, entry) => {
          const key = entry.item_id ?? 'total';
          values[key] = (values[key] || 0) + entry.amount;
          return values;
        }, {});
        return [type, Object.fromEntries(Object.entries(totals).map(([key, amount]) => [key, String(amount)]))];
      }));
      setItems(categoryItems);
      setMode(categoryItems.length ? 'items' : 'total');
      original.current = amounts;
      setDraft(amounts);
    } catch {
      setError(t('ledger.load_failed'));
    }
  }, [visible, cat, dayId, t]);

  if (!cat) return null;

  const update = (key, value) => {
    setDraft(current => ({ ...current, [payment]: { ...current[payment], [key]: value } }));
    setError('');
  };
  const changes = draft ? GRID_PAYMENT_TYPES.flatMap(type =>
    Object.entries(draft[type]).filter(([key, value]) => value !== (original.current[type][key] ?? ''))
      .map(([key, value]) => ({
        paymentType: type,
        itemId: key === 'total' ? null : Number(key),
        amount: value.trim() ? parseCashAmount(value) : 0,
      })),
  ) : [];
  const close = () => {
    if (!changes.length) { onClose(); return; }
    Alert.alert(t('ledger.unsaved_title'), t('ledger.unsaved_body'), [
      { text: t('ledger.keep_editing'), style: 'cancel' },
      { text: t('ledger.discard'), style: 'destructive', onPress: onClose },
    ]);
  };
  const save = () => {
    if (!draft || !dayId) return;
    if (changes.some(({ amount }) => !Number.isFinite(amount) || amount < 0 || Math.abs(Math.round(amount * 100) - amount * 100) > 0.00001)) {
      setError(t('book.invalidAmount'));
      return;
    }
    try {
      saveGridAmounts(dayId, cat.id, changes);
      onReload();
      onClose();
    } catch {
      setError(t('book.saveError'));
    }
  };

  const options = { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: S.xs };
  const chip = { minHeight: 44, paddingHorizontal: S.sm, maxWidth: '100%' };
  const history = itemId => visible ? { kind: 'expense', categoryId: cat.id, itemId, paymentType: payment, date: selectedDate } : null;
  const selected = draft?.[payment];
  return <Sheet visible={visible} onClose={close} title={translateCategoryName(cat.name, t)}
    titleLeading={<IconBadge {...categoryLogo(cat)} icon="cart-outline" color={C.iconExpense} size={36} />}
    footer={<>
    {!!error && <Text accessibilityRole="alert" style={{ color: C.expense, fontSize: T.sizes.sm, marginBottom: S.xs }}>{error}</Text>}
    <Button label={t('common.save')} fullWidth onPress={save} disabled={!draft} />
  </>}>
    {selected && <View style={{ gap: S.sm, paddingBottom: S.sm }}>
      <View style={options}>
        <Chip label={t('ledger.cash')} icon="wallet-outline" active={payment === 'cash'} onPress={() => setPayment('cash')} style={chip} />
        <Chip label={t('ledger.online')} icon="card-outline" active={payment === 'online'} onPress={() => setPayment('online')} style={chip} />
      </View>
      {!!items.length && <View style={options}>
        <Chip label={t('ledger.expense_by_items')} active={mode === 'items'} onPress={() => setMode('items')} style={chip} />
        <Chip label={t('ledger.category_total')} active={mode === 'total'} onPress={() => setMode('total')} style={chip} />
      </View>}
      {mode === 'items' ? items.map(item => <AmountInput key={item.id} inline compact={items.length > 1}
        showCompactSuggestions={activeItemId === item.id} onFocus={() => setActiveItemId(item.id)}
        history={history(item.id)} label={item.name} value={selected[item.id] ?? ''}
        labelLeading={<IconBadge {...categoryLogo(item)} icon="pricetag-outline" color={C.iconExpense} size={26} />}
        onChangeText={value => update(item.id, value)} />
      ) : <AmountInput centered history={history(null)} label={t('ledger.amount')} value={selected.total ?? ''}
        onChangeText={value => update('total', value)} />}
    </View>}
  </Sheet>;
};

// ── Manage Categories Sheet ────────────────────────────────────────────────────

const ManageCatsSheet = ({ visible, onClose, onRefresh, C, T, S, R, t }) => {
  const [cats, setCats] = useState([]);
  const [arranging, setArranging] = useState(false);
  const [editor, setEditor] = useState(null);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('💰');

  React.useEffect(() => {
    if (!visible) return;
    setEditor(null);
    setArranging(false);
    setCats(getAllCategories());
  }, [visible]);

  const refresh = () => {
    setCats(getAllCategories());
    onRefresh();
  };
  const openEditor = item => {
    setNewName(item ? translateCategoryName(item.name, t) : '');
    setNewIcon(item?.icon || '💰');
    setEditor(item || {});
  };

  const save = () => {
    const trimmed = newName.trim();
    if (!trimmed) {
      Alert.alert(t('common.error'), t('ledger.category_required_name'));
      return;
    }
    try {
      if (editor.id) {
        const name = trimmed === translateCategoryName(editor.name, t) ? editor.name : trimmed;
        updateCategory(editor.id, name, newIcon);
      } else {
        addCategory(trimmed, newIcon);
      }
      setEditor(null);
      refresh();
    } catch {
      Alert.alert(t('common.error'), t('book.saveError'));
    }
  };

  const remove = id => Alert.alert(t('expense.deleteCategory'), t('expense.removeCategory'), [
    { text: t('common.cancel'), style: 'cancel' },
    { text: t('common.delete'), style: 'destructive', onPress: () => {
      try { deleteCategory(id); refresh(); }
      catch { Alert.alert(t('common.error'), t('book.saveError')); }
    }},
  ]);

  const move = (index, offset) => {
    const target = index + offset;
    if (target < 0 || target >= cats.length) return;
    const next = [...cats];
    [next[index], next[target]] = [next[target], next[index]];
    try {
      setCategoryOrder(next.map(category => category.id));
      setCats(next);
      onRefresh();
    } catch {
      Alert.alert(t('common.error'), t('book.saveError'));
    }
  };

  const action = ({ icon, label, onPress, color = C.primary, disabled = false, hint }) => (
    <TouchableOpacity
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityHint={hint}
      accessibilityState={{ disabled }}
      disabled={disabled}
      style={[mc.action, { borderRadius: R.md, backgroundColor: C.bgElevated, opacity: disabled ? 0.35 : 1 }]}
      onPress={onPress}
    >
      <Ionicons name={icon} size={18} color={color} />
    </TouchableOpacity>
  );

  const footer = editor ? (
    <View style={[mc.footer, { gap: S.sm }]}>
      <Button label={t('common.cancel')} variant="secondary" onPress={() => setEditor(null)} style={mc.flex} />
      <Button label={t('common.save')} onPress={save} style={mc.flex} />
    </View>
  ) : arranging ? (
    <Button label={t('ledger.finish_arranging')} onPress={() => setArranging(false)} fullWidth />
  ) : (
    <View style={[mc.footer, { gap: S.sm }]}>
      <Button label={t('ledger.arrange_categories')} variant="secondary" onPress={() => setArranging(true)} disabled={cats.length < 2} style={mc.flex} />
      <Button label={t('ledger.add_category')} icon="add" onPress={() => openEditor(null)} style={mc.flex} />
    </View>
  );

  const title = editor
    ? t(editor.id ? 'ledger.edit_category' : 'ledger.add_category')
    : t(arranging ? 'ledger.arrange_categories' : 'expense.manageCategories');

  return (
    <Sheet visible={visible} onClose={onClose} title={title} footer={footer}>
      {editor ? (
        <View style={[mc.footer, { alignItems: 'flex-end', gap: S.sm, paddingBottom: S.sm }]}>
          <Input label={t('expenseItems.icon')} value={newIcon} onChangeText={setNewIcon} maxLength={8}
            style={{ width: 64 }} inputStyle={{ textAlign: 'center', fontSize: T.sizes.lg }} />
          <Input label={t('expense.categoryName')} value={newName} onChangeText={setNewName} style={mc.flex} autoFocus />
        </View>
      ) : cats.map((item, index) => {
        const name = translateCategoryName(item.name, t);
        return (
          <View key={item.id} style={[mc.row, { gap: S.sm, borderBottomColor: C.divider }]}>
            <IconBadge emoji={item.icon} color={C.primary} size={32} />
            <Text style={[mc.flex, { color: C.textPrimary, fontSize: T.sizes.base, fontWeight: T.weights.semibold }]}>{name}</Text>
            {arranging ? <>
              {action({ icon: 'chevron-up', label: t('ledger.move_category_up'), hint: name, disabled: index === 0, onPress: () => move(index, -1) })}
              {action({ icon: 'chevron-down', label: t('ledger.move_category_down'), hint: name, disabled: index === cats.length - 1, onPress: () => move(index, 1) })}
            </> : <>
              {action({ icon: 'create-outline', label: t('common.edit') + ' ' + name, onPress: () => openEditor(item) })}
              {action({ icon: 'trash-outline', label: t('common.delete') + ' ' + name, color: C.expense, onPress: () => remove(item.id) })}
            </>}
          </View>
        );
      })}
    </Sheet>
  );
};

const mc = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingVertical: 5, borderBottomWidth: StyleSheet.hairlineWidth },
  flex: { flex: 1, minWidth: 0 },
  footer: { flexDirection: 'row' },
  action: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
});


// ── Category Card ─────────────────────────────────────────────────────────────

const CatCard = ({ cat, cashAmt, onlineAmt, onStep, onTap, onLongPress, cardW, accentColor, C, T, S, R, Shadow, t }) => {
  const total  = cat.total ?? ((cashAmt || 0) + (onlineAmt || 0));
  const active = total > 0;
  const displayName = translateCategoryName(cat.name, t);

  return (
    <TouchableOpacity
      style={[
        { borderRadius: R.xl, padding: S.sm, marginBottom: S.sm, borderWidth: 1, alignItems: 'center', position: 'relative', overflow: 'hidden' },
        { width: cardW, backgroundColor: C.bgCard, borderColor: active ? accentColor : C.border },
        active && { borderWidth: 2 },
        Shadow.sm,
      ]}
      onPress={() => onTap(cat)}
      onLongPress={() => onLongPress(cat)}
      activeOpacity={0.82}
    >
      {active && <View style={[{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4 }, { backgroundColor: accentColor }]} />}
      <IconBadge {...categoryLogo(cat)} color={accentColor} size={50} style={{ marginBottom: 6, marginTop: 4 }} />
      <Text style={{ fontSize: T.sizes.sm, fontWeight: T.weights.semibold, textAlign: 'center', marginBottom: 2, color: C.textPrimary }}>{displayName}</Text>
      <Text style={[{ fontSize: T.sizes.sm, fontWeight: T.weights.black, marginBottom: 8 }, { color: active ? accentColor : C.textMuted }]}>
        {active ? fmt(total) : '—'}
      </Text>
      <View style={[{ flexDirection: 'row', alignItems: 'center', borderRadius: R.full, overflow: 'hidden', width: '100%', height: 32 }, { backgroundColor: C.bgElevated }]}>
        <TouchableOpacity
          style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
          onPress={() => onStep(cat, Math.max(0, (cashAmt || 0) - 10), 'cash')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="remove" size={18} color={C.expense} />
        </TouchableOpacity>
        <Text style={[{ flex: 1, textAlign: 'center', fontSize: T.sizes.caption, fontWeight: T.weights.bold }, { color: C.textSecondary }]} numberOfLines={1}>
          {fmtN(cashAmt || 0)}
        </Text>
        <TouchableOpacity
          style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
          onPress={() => onStep(cat, (cashAmt || 0) + 10, 'cash')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Ionicons name="add" size={18} color={C.income} />
        </TouchableOpacity>
      </View>
      {(onlineAmt || 0) > 0 && (
        <View style={[{ marginTop: 5, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 7, paddingVertical: 2, borderRadius: R.full }, { backgroundColor: C.onlineBg }]}>
          <Ionicons name="globe-outline" size={9} color={C.online} style={{ marginRight: 3 }} />
          <Text style={[{ fontSize: T.sizes.micro, fontWeight: T.weights.bold }, { color: C.online }]}>{fmt(onlineAmt)}</Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

// ── Main Expense Screen ───────────────────────────────────────────────────────

export default function ExpenseScreen({ navigation }) {
  const { t } = useTranslation();
  const { C, scale } = useTheme();
  const { Typography: T, Spacing: S, Radius: R } = scaleTheme(scale);
  const Shadow = makeShadow(C);
  const { selectedDate, dayData, refreshDayData } = useAppStore();

  const { width: screenWidth, fontScale } = useWindowDimensions();
  const numColumns = screenWidth < 350 || scale * fontScale > 1.1 ? 2 : 3;
  const CARD_W = Math.floor((Math.min(screenWidth, Layout.contentWidth) - S.md * 2 - S.sm * (numColumns - 1)) / numColumns);

  const [summary,     setSummary]     = useState([]);
  const [showDeposit, setShowDeposit] = useState(false);
  const [amtSheet,    setAmtSheet]    = useState({ visible: false, cat: null });
  const [showManage,  setShowManage]  = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [hoverHelp, setHoverHelp] = useState(false);

  const reload = useCallback(() => {
    try { refreshDayData(selectedDate); } catch (e) { console.error('reload:', e); }
  }, [refreshDayData, selectedDate]);
  useFocusEffect(reload);

  React.useEffect(() => {
    try {
      if (dayData?.id) setSummary(getExpenseSummaryForDay(dayData.id));
      else setSummary([]);
    } catch (e) {
      console.error('summary:', e);
      setSummary([]);
    }
  }, [dayData]);

  useEffect(() => {
    refreshDayData(selectedDate);
  }, [selectedDate, refreshDayData]);

  // The grid edits only its own common amounts. Daily-book entries and item rows
  // are displayed in the ledger and must never be copied into a common amount.
  const cashFor   = (id) => summary.find(r => r.category_id === id)?.editable_cash_total || 0;
  const onlineFor = (id) => summary.find(r => r.category_id === id)?.editable_online_total || 0;

  const handleStep = (cat, newAmt, pType) => {
    if (!dayData?.id) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    try {
      setExpenseAmount(dayData.id, cat.id, newAmt, pType);
      recalculateBalance(dayData.id, selectedDate);
      reload();
    } catch (e) { console.error('step:', e); }
  };

  const handleTap = cat => setAmtSheet({ visible: true, cat });

  const handleLongPress = (cat) => {
    const c = cashFor(cat.id), o = onlineFor(cat.id);
    if (c === 0 && o === 0) return;
    Alert.alert(t('expense.clearCategory'), t('expense.clearCategory'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('common.delete'), style: 'destructive',
        onPress: () => {
          if (!dayData?.id) return;
          if (c > 0) setExpenseAmount(dayData.id, cat.id, 0, 'cash');
          if (o > 0) setExpenseAmount(dayData.id, cat.id, 0, 'online');
          recalculateBalance(dayData.id, selectedDate);
          reload();
        },
      },
    ]);
  };

  const handleDepositSave = (amount) => {
    try { updateDeposit(selectedDate, amount); reload(); return true; }
    catch (e) { Alert.alert(t('ledger.error'), t('book.saveError')); return false; }
  };

  const handleDepositDelete = () => {
    try { updateDeposit(selectedDate, 0); reload(); }
    catch (e) { console.error('deposit delete:', e); }
  };

  const categories = summary.map((r, idx) => ({
    id: r.category_id, name: r.name, icon: r.icon, icon_type: r.icon_type, sort_order: r.sort_order,
    total: r.total,
    color: C.accents[idx % C.accents.length],
  }));

  const totalSpent = summary.reduce((s, r) => s + (r.total || 0), 0);

  return (
    <View style={[s.root, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={C.isDark ? 'light-content' : 'dark-content'} backgroundColor={C.bgCard} />
      <DayNavigator />

      <ScrollView style={s.scroll} contentContainerStyle={[s.content, { width: '100%', maxWidth: Layout.contentWidth, alignSelf: 'center', padding: S.md }]} showsVerticalScrollIndicator={false}>

        {/* Balance header */}
        <CashBalanceCard wallet={dayData?.closing_balance} locker={dayData?.locker_balance}
          spent={dayData?.cash_spent ?? totalSpent} unavailable={!dayData} style={{ marginBottom: S.md }} />

        {/* Deposit row */}
        {!!dayData?.deposit_today && <DepositRow deposit={dayData.deposit_today} onPress={() => setShowDeposit(true)} C={C} T={T} S={S} R={R} Shadow={Shadow} t={t} />}

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: S.sm, marginBottom: S.md, zIndex: 1 }}>
          <Button label={t('expense.manageCategories')} size="sm" variant="secondary" onPress={() => setShowManage(true)} style={{ flex: 1 }} />
          <Button label={t('expenseItems.title')} size="sm" variant="secondary" onPress={() => navigation.navigate('ExpenseItems')} style={{ flex: 1 }} />
          <IconButton icon="bulb-outline" label={t('expense.gridHelp')} onPress={() => { setHoverHelp(false); setShowHelp(true); }}
            onHoverIn={() => setHoverHelp(true)} onHoverOut={() => setHoverHelp(false)} />
          {hoverHelp && <Card padding="sm" style={{ position: 'absolute', top: '100%', right: 0, width: '85%' }}>
            <Text style={{ color: C.textPrimary, fontSize: T.sizes.sm }}>{t('expense.tapToEnter')}</Text>
          </Card>}
        </View>

        {/* Category grid */}
        <View style={[s.grid, { gap: S.sm }]}>
          {categories.map(cat => (
            <CatCard
              key={cat.id}
              cat={cat}
              cashAmt={cashFor(cat.id)}
              onlineAmt={onlineFor(cat.id)}
              onStep={handleStep}
              onTap={handleTap}
              onLongPress={handleLongPress}
              cardW={CARD_W}
              accentColor={cat.color}
              C={C} T={T} S={S} R={R}
              Shadow={Shadow}
              t={t}
            />
          ))}
        </View>

      </ScrollView>

      <Sheet visible={showHelp} title={t('expense.gridHelp')} onClose={() => setShowHelp(false)}>
        <View style={{ gap: S.md, paddingBottom: S.md }}>
          <Text style={{ color: C.textPrimary, fontSize: T.sizes.base }}>{t('expense.tapToEnter')}</Text>
          <Text style={{ color: C.textSecondary, fontSize: T.sizes.base }}>{t('book.gridScope')}</Text>
        </View>
      </Sheet>
      <DepositSheet
        visible={showDeposit}
        date={selectedDate}
        current={dayData?.deposit_today || 0}
        onSave={handleDepositSave}
        onDelete={handleDepositDelete}
        onClose={() => setShowDeposit(false)}
        C={C} T={T} S={S} R={R} t={t}
      />
      <AmountSheet
        visible={amtSheet.visible}
        cat={amtSheet.cat}
        onClose={() => setAmtSheet(v => ({ ...v, visible: false }))}
        dayId={dayData?.id}
        selectedDate={selectedDate}
        onReload={reload}
        C={C} T={T} S={S} t={t}
      />
      <ManageCatsSheet
        visible={showManage}
        onClose={() => setShowManage(false)}
        onRefresh={reload}
        C={C} T={T} S={S} R={R} t={t}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root:      { flex: 1 },
  scroll:    { flex: 1 },
  content:   {},
  grid:      { flexDirection: 'row', flexWrap: 'wrap' },
});
