import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, StatusBar, useWindowDimensions, Image,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { scaleTheme, makeShadow } from '../constants/theme';
import { useTheme } from '../store/ThemeContext';
import DayNavigator from '../components/DayNavigator';
import useAppStore from '../store/useAppStore';
import { translateCategoryName } from '../constants/defaultCategories';
import { Card, Button, IconBadge, Sheet, Input, Chip, Badge } from '../components/common';
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
  updateCategoryOrder,
} from '../db/queries';

// ── Helpers ───────────────────────────────────────────────────────────────────
// NOTE: No Dimensions at module level — moved inside component via hook.
// Module-level Dimensions.get('window') can return 0 in production APK on
// first bundle evaluation before the native layout is measured.

const fmt  = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const fmtN = (n) => Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

// ── Balance Header ────────────────────────────────────────────────────────────

const BalanceHeader = ({ dayData, C, T, S, R, t }) => {
  const bal  = dayData?.closing_balance ?? 0;
  const dep  = (dayData?.deposit_today ?? 0) + (dayData?.receipt_total ?? 0);
  const transfer = dayData?.transfer_net ?? 0;
  const cash = dayData?.cash_spent      ?? 0;
  const onl  = dayData?.online_spent    ?? 0;
  const pos  = bal >= 0;

  return (
    <Card gradient={C.gradients.primary} elevation="primary" style={{ borderRadius: R.xl, padding: S.xl, marginBottom: S.md, borderWidth: 0 }}>
      <View style={bh.topRow}>
        <View>
          <Text style={[bh.lbl]}>{t('expense.cashBalance').toUpperCase()}</Text>
          <Text style={[bh.bal, { fontSize: T.sizes.hero, fontWeight: T.weights.black }, { color: pos ? '#A7F3D0' : '#FCA5A5' }]}>{fmt(bal)}</Text>
        </View>
        <View style={bh.circle}>
          <Ionicons name="wallet" size={28} color="#fff" />
        </View>
      </View>

      <View style={bh.hr} />

      <View style={bh.statsRow}>
        {[
          { l: t('ledger.receipts'),  v: '+' + fmt(dep),  c: '#A7F3D0' },
          { l: t('analytics.cashSpent'), v: '−' + fmt(cash), c: '#FCA5A5' },
          { l: t('analytics.onlineSpent'),     v: fmt(onl),         c: '#C4B5FD' },
        ].map((x, i) => (
          <React.Fragment key={x.l}>
            {i > 0 && <View style={bh.pipe} />}
            <View style={bh.stat}>
              <Text style={bh.statLbl}>{x.l}</Text>
              <Text style={[bh.statVal, { fontSize: T.sizes.sm, fontWeight: T.weights.bold }, { color: x.c }]}>{x.v}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>
      {transfer !== 0 && <Text style={{ color: '#FFFFFF', marginTop: S.md, fontSize: T.sizes.sm }}>{t(transfer > 0 ? 'ledger.locker_in' : 'ledger.locker_out')}: {transfer > 0 ? '+' : '−'}{fmt(Math.abs(transfer))}</Text>}
    </Card>
  );
};
const bh = StyleSheet.create({
  topRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  lbl:      { fontSize: 10, color: 'rgba(255,255,255,0.65)', letterSpacing: 2, fontWeight: '700', marginBottom: 6 },
  bal:      { letterSpacing: -1.5 },
  circle:   { width: 58, height: 58, borderRadius: 29, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  hr:       { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: 20 },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  stat:     { flex: 1, alignItems: 'center' },
  statLbl:  { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '600', letterSpacing: 0.5, marginBottom: 4 },
  statVal:  {},
  pipe:     { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.2)' },
});

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
      <Text style={[dr.pillTxt, { fontSize: T.sizes.sm, fontWeight: T.weights.bold }]}>{deposit > 0 ? t('common.edit') : t('common.add')}</Text>
    </View>
  </TouchableOpacity>
);
const dr = StyleSheet.create({
  wrap:    { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5 },
  lbl:     { fontSize: 11, fontWeight: '700', letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 3 },
  val:     {},
  pill:    { paddingVertical: 8 },
  pillTxt: { color: '#fff' },
});

// ── Deposit Sheet ─────────────────────────────────────────────────────────────

const DepositSheet = ({ visible, current, onSave, onDelete, onClose, C, T, S, R, t }) => {
  const [val, setVal] = useState('');
  const PRESETS = [500, 1000, 2000, 5000, 10000];

  React.useEffect(() => {
    if (visible) setVal(current > 0 ? String(current) : '');
  }, [visible]);

  const save = () => {
    const n = Number(val);
    if (!/^\d+(\.\d{1,2})?$/.test(val.trim()) || !Number.isFinite(n) || n < 0) { Alert.alert(t('ledger.error'), t('book.invalidAmount')); return; }
    if (onSave(n) !== false) onClose();
  };

  const handleDelete = () => {
    Alert.alert(t('common.delete'), t('expense.deleteDeposit'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => { onDelete(); onClose(); } },
    ]);
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={t('expense.depositTitle')}>
      <Text style={[s2.sub, { color: C.textSecondary, fontSize: T.sizes.sm, marginBottom: S.lg }]}>{t('expense.depositPrompt')}</Text>

      <View style={[s2.inputRow, { backgroundColor: C.bgInput, borderColor: C.primary, borderRadius: R.lg, paddingHorizontal: S.base, marginBottom: S.base }]}>
        <Text style={[s2.rupee, { color: C.primary, fontSize: T.sizes.xl, fontWeight: T.weights.black }]}>₹</Text>
        <TextInput
          style={[s2.input, { color: C.textPrimary, fontSize: T.sizes.xxl, fontWeight: T.weights.black }]}
          value={val}
          onChangeText={setVal}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={C.textMuted}
          autoFocus
          selectTextOnFocus
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={[s2.presets, { gap: S.sm, paddingBottom: S.base }]}>
        {PRESETS.map(p => (
          <Chip
            key={p}
            label={`₹${fmtN(p)}`}
            color={C.income}
            active={val === String(p)}
            onPress={() => setVal(String(p))}
          />
        ))}
      </ScrollView>

      <View style={[s2.btnRow, { gap: S.sm }]}>
        <Button label={t('common.cancel')} variant="secondary" onPress={onClose} style={{ flex: 1 }} />
        {current > 0 && (
          <Button label={t('common.delete')} variant="danger" onPress={handleDelete} style={{ flex: 1 }} />
        )}
        <Button label={t('expense.saveDeposit')} variant="primary" onPress={save} style={{ flex: 1 }} />
      </View>
    </Sheet>
  );
};
const s2 = StyleSheet.create({
  sub:     {},
  inputRow:{ flexDirection: 'row', alignItems: 'center', borderWidth: 2 },
  rupee:   { marginRight: 6 },
  input:   { flex: 1, paddingVertical: 14 },
  presets: { flexDirection: 'row' },
  btnRow:  { flexDirection: 'row' },
});

// ── Amount Entry Sheet ────────────────────────────────────────────────────────

const AmountSheet = ({ visible, cat, cashAmt, onSave, onClose, C, T, S, R, Shadow, t, dayId, selectedDate, onReload }) => {
  const [val,   setVal]   = useState('');
  const [pType, setPType] = useState('cash');
  const [items, setItems] = useState([]);
  const [showItems, setShowItems] = useState(false);
  const [itemAmounts, setItemAmounts] = useState({});
  const [editingItemId, setEditingItemId] = useState(null);

  React.useEffect(() => {
    if (visible && cat) {
      setVal(cashAmt > 0 ? String(cashAmt) : '');
      setPType('cash');
      setEditingItemId(null);
      try {
        const categoryItems = getAllCategoryItems(cat.id);
        setItems(categoryItems);
        setShowItems(categoryItems.length > 0);

        if (dayId && categoryItems.length > 0) {
          const itemExpenses = getItemExpenses(dayId, cat.id, 'cash');
          const amounts = {};
          itemExpenses.forEach(exp => {
            if (exp.item_id) amounts[exp.item_id] = exp.amount;
          });
          setItemAmounts(amounts);
        } else {
          setItemAmounts({});
        }
      } catch (e) {
        setItems([]);
        setShowItems(false);
        setItemAmounts({});
      }
    }
  }, [visible, cat, dayId]);

  // Cash and online are independent editable records; switching must reload the
  // selected mode rather than saving a cash draft into the online amount.
  React.useEffect(() => {
    if (!visible || !cat || !dayId) return;
    try {
      const records = getItemExpenses(dayId, cat.id, pType);
      const common = records.filter(row => !row.item_id).reduce((sum, row) => sum + row.amount, 0);
      setVal(common > 0 ? String(common) : '');
      setItemAmounts(Object.fromEntries(records.filter(row => row.item_id).map(row => [row.item_id, row.amount])));
      setEditingItemId(null);
    } catch (e) {
      Alert.alert(t('ledger.error'), t('book.saveError'));
    }
  }, [visible, cat?.id, dayId, pType]);

  if (!cat) return null;

  const save = () => {
    const n = Number(val);
    if (!/^\d+(\.\d{1,2})?$/.test(val.trim()) || !Number.isFinite(n) || n < 0) { Alert.alert(t('ledger.error'), t('book.invalidAmount')); return; }
    if (editingItemId) {
      setItemAmounts(prev => ({ ...prev, [editingItemId]: isNaN(n) ? 0 : Math.max(0, n) }));
      setEditingItemId(null);
      setShowItems(true);
      setVal('');
    } else {
      if (onSave(n, pType) !== false) onClose();
    }
  };

  const handleItemStep = (itemId, currentAmt, delta) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const newAmt = Math.max(0, currentAmt + delta);
    setItemAmounts(prev => ({ ...prev, [itemId]: newAmt }));
  };

  const saveItems = () => {
    if (!dayId) return;
    try {
      Object.entries(itemAmounts).forEach(([itemId, amount]) => {
        setExpenseAmount(dayId, cat.id, amount, pType, parseInt(itemId), null);
      });
      recalculateBalance(dayId, selectedDate);
      onReload();
      onClose();
    } catch (e) {
      console.error('saveItems:', e);
    }
  };

  return (
    <Sheet visible={visible} onClose={onClose}>
      <View style={{ alignItems: 'center', marginBottom: S.xs }}>
        <IconBadge emoji={cat.icon} color={C.primary} size={56} />
      </View>
      <Text style={[s2b.title, { color: C.textPrimary, fontSize: T.sizes.xl, fontWeight: T.weights.bold, textAlign: 'center', marginTop: S.sm }]}>{cat.name}</Text>
      <Text style={[s2b.sub, { color: C.textSecondary, fontSize: T.sizes.sm, textAlign: 'center', marginBottom: S.lg }]}>{t('expense.enterAmount')}</Text>

      <View style={[sa.toggle, { backgroundColor: C.bgElevated, borderRadius: R.lg, marginBottom: S.base }]}>
        {[
          { k: 'cash', icon: 'cash-outline', lbl: t('expense.cash') },
          { k: 'online', icon: 'globe-outline', lbl: t('expense.onlineLabel') },
        ].map(({ k, icon, lbl }) => (
          <TouchableOpacity
            key={k}
            style={[sa.toggleBtn, pType === k && { backgroundColor: C.primary, borderRadius: R.md }]}
            onPress={() => setPType(k)}
          >
            <Ionicons name={icon} size={16} color={pType === k ? '#fff' : C.textSecondary} style={{ marginRight: 6 }} />
            <Text style={[sa.toggleTxt, { fontSize: T.sizes.sm, fontWeight: T.weights.bold, color: pType === k ? '#fff' : C.textSecondary }]}>{lbl}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {showItems ? (
        <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
          <View style={[sa.itemsGrid, { gap: S.sm, marginBottom: S.base }]}>
            {items.map((item) => {
              const amt = itemAmounts[item.id] || 0;
              const isActive = amt > 0;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    sa.itemCard,
                    {
                      borderRadius: R.xl, padding: S.sm,
                      backgroundColor: C.bgCard,
                      borderColor: isActive ? C.primary : C.border,
                      borderWidth: isActive ? 2 : 1,
                    },
                    Shadow.sm,
                  ]}
                  onPress={() => {
                    setEditingItemId(item.id);
                    setVal(String(amt || 0));
                    setShowItems(false);
                  }}
                  activeOpacity={0.82}
                >
                  {isActive && <View style={[sa.activeDot, { backgroundColor: C.primary }]} />}

                  <IconBadge
                    photoUri={item.icon_type === 'image' ? item.icon : undefined}
                    emoji={item.icon_type !== 'image' ? item.icon : undefined}
                    color={C.primary}
                    size={50}
                    style={{ marginBottom: 6, marginTop: 4 }}
                  />

                  <Text style={[sa.itemName, { color: C.textPrimary, fontSize: T.sizes.xs, fontWeight: T.weights.semibold }]} numberOfLines={1}>{item.name}</Text>

                  <Text style={[sa.itemAmt, { fontSize: T.sizes.sm, fontWeight: T.weights.black, color: isActive ? C.primary : C.textMuted }]}>
                    {isActive ? fmt(amt) : '—'}
                  </Text>

                  <View style={[sa.itemStepper, { backgroundColor: C.bgElevated, borderRadius: R.full }]}>
                    <TouchableOpacity
                      style={sa.stepBtn}
                      onPress={(e) => { e.stopPropagation(); handleItemStep(item.id, amt, -10); }}
                    >
                      <Ionicons name="remove" size={18} color={C.expense} />
                    </TouchableOpacity>
                    <Text style={[sa.stepVal, { color: C.textSecondary, fontWeight: T.weights.bold }]} numberOfLines={1}>
                      {fmtN(amt)}
                    </Text>
                    <TouchableOpacity
                      style={sa.stepBtn}
                      onPress={(e) => { e.stopPropagation(); handleItemStep(item.id, amt, 10); }}
                    >
                      <Ionicons name="add" size={18} color={C.income} />
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity
            style={[sa.commonBtn, { backgroundColor: C.bgCard, borderColor: C.border, borderRadius: R.lg, padding: S.md, marginBottom: S.base }]}
            onPress={() => { setShowItems(false); setEditingItemId(null); }}
          >
            <Ionicons name="wallet-outline" size={18} color={C.textSecondary} style={{ marginRight: S.sm }} />
            <Text style={[sa.commonTxt, { color: C.textSecondary, fontSize: T.sizes.sm, fontWeight: T.weights.semibold }]}>{t('expense.commonItem')}</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <>
          <View style={[s2.inputRow, { backgroundColor: C.bgInput, borderColor: C.primary, borderRadius: R.lg, paddingHorizontal: S.base, marginBottom: S.base }]}>
            <Text style={[s2.rupee, { color: C.primary, fontSize: T.sizes.xl, fontWeight: T.weights.black }]}>₹</Text>
            <TextInput
              style={[s2.input, { color: C.textPrimary, fontSize: T.sizes.xxl, fontWeight: T.weights.black }]}
              value={val}
              onChangeText={setVal}
              keyboardType="numeric"
              placeholder="0"
              placeholderTextColor={C.textMuted}
              autoFocus
              selectTextOnFocus
            />
          </View>
          {items.length > 0 && (
            <TouchableOpacity
              style={[sa.showItemsBtn, { backgroundColor: C.bgElevated, borderColor: C.border, borderRadius: R.md, padding: S.sm, marginBottom: S.base }]}
              onPress={() => setShowItems(true)}
            >
              <Ionicons name="cube-outline" size={16} color={C.textSecondary} style={{ marginRight: 6 }} />
              <Text style={[sa.showItemsTxt, { color: C.textSecondary, fontSize: T.sizes.sm, fontWeight: T.weights.semibold }]}>{t('expense.showItems')}</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      <View style={[s2.btnRow, { gap: S.sm }]}>
        <Button label={t('common.cancel')} variant="secondary" onPress={onClose} style={{ flex: 1 }} />
        <Button label={t('common.save')} variant="primary" onPress={showItems ? saveItems : save} style={{ flex: 1 }} />
      </View>
    </Sheet>
  );
};
const s2b = StyleSheet.create({
  title: { marginBottom: 4 },
  sub: {},
});
const sa = StyleSheet.create({
  toggle:    { flexDirection: 'row', padding: 4 },
  toggleBtn: { flex: 1, paddingVertical: 12, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  toggleTxt: {},
  itemsGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  itemCard:  { width: '48%', alignItems: 'center', position: 'relative' },
  activeDot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4 },
  itemName:  { textAlign: 'center', marginBottom: 2 },
  itemAmt:   { marginBottom: 8 },
  itemStepper: { flexDirection: 'row', alignItems: 'center', overflow: 'hidden', width: '100%', height: 32 },
  stepBtn:   { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  stepVal:   { flex: 1, textAlign: 'center', fontSize: 10 },
  commonBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed' },
  commonTxt: {},
  showItemsBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1 },
  showItemsTxt: {},
});

// ── Manage Categories Sheet ───────────────────────────────────────────────────
// NOTE: Uses ScrollView + map instead of FlatList — FlatList inside Modal
// crashes on Android Hermes in production builds.

const ManageCatsSheet = ({ visible, onClose, onRefresh, C, T, S, R, t }) => {
  const [cats, setCats] = useState([]);
  const [adding, setAdding] = useState(false);
  const [editing, setEditing] = useState(null);
  const [newName, setNewName] = useState('');
  const [newIcon, setNewIcon] = useState('💰');

  const load = () => {
    try { setCats(getAllCategories()); } catch (_) { setCats([]); }
  };

  React.useEffect(() => { if (visible) load(); }, [visible]);

  const doAdd = () => {
    if (!newName.trim()) return;
    addCategory(newName.trim(), newIcon);
    setNewName(''); setNewIcon('💰'); setAdding(false);
    load(); onRefresh();
  };

  const doEdit = () => {
    if (!editing || !newName.trim()) return;
    updateCategory(editing.id, newName.trim(), newIcon);
    setEditing(null); setNewName(''); setNewIcon('💰');
    load(); onRefresh();
  };

  const doDelete = (id) => {
    Alert.alert(t('expense.deleteCategory'), t('expense.removeCategory'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => { deleteCategory(id); load(); onRefresh(); } },
    ]);
  };

  const moveUp = (index) => {
    if (index === 0) return;
    const newCats = [...cats];
    [newCats[index - 1], newCats[index]] = [newCats[index], newCats[index - 1]];
    newCats.forEach((cat, i) => updateCategoryOrder(cat.id, i + 1));
    setCats(newCats);
    onRefresh();
  };

  const moveDown = (index) => {
    if (index === cats.length - 1) return;
    const newCats = [...cats];
    [newCats[index], newCats[index + 1]] = [newCats[index + 1], newCats[index]];
    newCats.forEach((cat, i) => updateCategoryOrder(cat.id, i + 1));
    setCats(newCats);
    onRefresh();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={t('expense.manageCategories')}>
      <ScrollView
        style={{ maxHeight: 320 }}
        contentContainerStyle={{ flexGrow: 0 }}
        showsVerticalScrollIndicator={false}
        nestedScrollEnabled
        scrollEnabled
        keyboardShouldPersistTaps="handled"
        removeClippedSubviews={false}
      >
        {cats.map((item, index) => (
          <View key={item.id} style={[mc.row, { borderBottomColor: C.divider }]}>
            <View style={mc.reorderBtns}>
              <TouchableOpacity onPress={() => moveUp(index)} disabled={index === 0}>
                <Ionicons name="chevron-up" size={14} color={C.textMuted} style={{ opacity: index === 0 ? 0.3 : 1 }} />
              </TouchableOpacity>
              <TouchableOpacity onPress={() => moveDown(index)} disabled={index === cats.length - 1}>
                <Ionicons name="chevron-down" size={14} color={C.textMuted} style={{ opacity: index === cats.length - 1 ? 0.3 : 1 }} />
              </TouchableOpacity>
            </View>
            <IconBadge emoji={item.icon} color={C.primary} size={34} style={{ marginHorizontal: S.xs }} />
            <Text style={[mc.name, { color: C.textPrimary, fontSize: T.sizes.base, fontWeight: T.weights.medium }]}>{item.name}</Text>
            <TouchableOpacity
              style={[mc.editBtn, { backgroundColor: C.primaryDim }]}
              onPress={() => { setEditing(item); setNewName(item.name); setNewIcon(item.icon); }}
            >
              <Ionicons name="create-outline" size={16} color={C.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={[mc.del, { backgroundColor: C.expenseLight }]}
              onPress={() => doDelete(item.id)}
            >
              <Ionicons name="trash-outline" size={16} color={C.expense} />
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {(adding || editing) ? (
        <View style={[mc.addForm, { backgroundColor: C.bgElevated, borderColor: C.border, borderRadius: R.lg, padding: S.base, marginTop: S.base }]}>
          <View style={[mc.addRow, { gap: S.sm, marginBottom: S.base }]}>
            <TextInput
              style={[mc.iconInput, { color: C.textPrimary, borderColor: C.border, backgroundColor: C.bgInput, borderRadius: R.sm }]}
              value={newIcon}
              onChangeText={setNewIcon}
              maxLength={2}
            />
            <Input
              style={{ flex: 1 }}
              value={newName}
              onChangeText={setNewName}
              placeholder={t('expense.categoryName')}
              autoFocus
            />
          </View>
          <View style={[s2.btnRow, { gap: S.sm }]}>
            <Button label={t('common.cancel')} variant="secondary" onPress={() => { setAdding(false); setEditing(null); }} style={{ flex: 1 }} />
            <Button label={editing ? t('common.save') : t('common.add')} variant="primary" onPress={editing ? doEdit : doAdd} style={{ flex: 1 }} />
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={[mc.addBtn, { backgroundColor: C.primaryDim, borderColor: C.primary, borderRadius: R.lg, padding: S.md, marginTop: S.base }]}
          onPress={() => setAdding(true)}
        >
          <Text style={[mc.addBtnTxt, { color: C.primary, fontSize: T.sizes.base, fontWeight: T.weights.bold }]}>{t('expense.addNewCategory')}</Text>
        </TouchableOpacity>
      )}
    </Sheet>
  );
};
const mc = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingVertical: 8, borderBottomWidth: 1 },
  reorderBtns: { flexDirection: 'column', gap: 2 },
  name: { flex: 1 },
  editBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  del: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  addForm: { borderWidth: 1 },
  addRow: { flexDirection: 'row' },
  iconInput: { width: 52, borderWidth: 1, textAlign: 'center', fontSize: 22, paddingVertical: 8 },
  addBtn: { alignItems: 'center', borderWidth: 1.5, borderStyle: 'dashed' },
  addBtnTxt: {},
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
      onPress={() => onTap(cat, cashAmt, onlineAmt)}
      onLongPress={() => onLongPress(cat)}
      activeOpacity={0.82}
    >
      {active && <View style={[{ position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4 }, { backgroundColor: accentColor }]} />}
      <IconBadge emoji={cat.icon} color={accentColor} size={50} style={{ marginBottom: 6, marginTop: 4 }} />
      <Text style={[{ fontSize: T.sizes.xs, fontWeight: T.weights.semibold, textAlign: 'center', marginBottom: 2 }, { color: C.textPrimary }]} numberOfLines={1}>{displayName}</Text>
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
        <Text style={[{ flex: 1, textAlign: 'center', fontSize: 10, fontWeight: T.weights.bold }, { color: C.textSecondary }]} numberOfLines={1}>
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
          <Text style={[{ fontSize: 9, fontWeight: T.weights.bold }, { color: C.online }]}>{fmt(onlineAmt)}</Text>
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

  const { width: screenWidth } = useWindowDimensions();
  const numColumns = scale >= 1.1 ? 2 : 3;
  const CARD_W = Math.max(80, (screenWidth - S.lg * 2 - S.sm * (numColumns - 1)) / numColumns);

  const [summary,     setSummary]     = useState([]);
  const [showDeposit, setShowDeposit] = useState(false);
  const [amtSheet,    setAmtSheet]    = useState({ visible: false, cat: null, cashAmt: 0 });
  const [showManage,  setShowManage]  = useState(false);

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

  const handleTap = (cat, cashAmt) => setAmtSheet({ visible: true, cat, cashAmt });

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

  const handleAmtSave = (amount, pType) => {
    if (!dayData?.id || !amtSheet.cat) return false;
    try {
      setExpenseAmount(dayData.id, amtSheet.cat.id, amount, pType);
      recalculateBalance(dayData.id, selectedDate);
      reload();
      return true;
    } catch (e) { Alert.alert(t('ledger.error'), t('book.saveError')); return false; }
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
    id: r.category_id, name: r.name, icon: r.icon, sort_order: r.sort_order,
    total: r.total,
    color: C.accents[idx % C.accents.length],
  }));

  const totalSpent = summary.reduce((s, r) => s + (r.total || 0), 0);

  return (
    <View style={[s.root, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={C.isDark ? 'light-content' : 'dark-content'} backgroundColor={C.bgCard} />
      <DayNavigator />

      <ScrollView style={s.scroll} contentContainerStyle={[s.content, { padding: S.lg, paddingBottom: 100 }]} showsVerticalScrollIndicator={false}>

        {/* Balance header */}
        <BalanceHeader dayData={dayData} C={C} T={T} S={S} R={R} t={t} />

        {/* Deposit row */}
        <DepositRow deposit={dayData?.deposit_today || 0} onPress={() => setShowDeposit(true)} C={C} T={T} S={S} R={R} Shadow={Shadow} t={t} />

        {/* Expenses header */}
        <View style={s.secHdr}>
          <Text style={[s.secLbl, { color: C.textSecondary }]}>{t('expense.expensesByCategory').toUpperCase()}</Text>
          {totalSpent > 0 && (
            <Badge label={`${t('expense.total')} ${fmt(totalSpent)}`} color={C.primary} />
          )}
        </View>

        <Text style={[s.hint, { color: C.textMuted }]}>{t('expense.tapToEnter')}</Text>
        <Text style={[s.hint, { color: C.textSecondary }]}>{t('book.gridScope')}</Text>
        <Button label={t('book.openDaily')} variant="secondary" onPress={() => navigation.navigate('DailyBook')} style={{ marginBottom: S.base }} />

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

        {/* Manage button */}
        <TouchableOpacity
          style={[s.manageBtn, { backgroundColor: C.bgCard, borderColor: C.border, borderRadius: R.lg, padding: S.base, marginTop: S.xs }]}
          onPress={() => setShowManage(true)}
        >
          <Ionicons name="settings-outline" size={16} color={C.textSecondary} style={{ marginRight: S.sm }} />
          <Text style={[s.manageTxt, { color: C.textSecondary }]}>{t('expense.manageCategories')}</Text>
        </TouchableOpacity>

        {/* Items button */}
        <TouchableOpacity
          style={[s.manageBtn, { backgroundColor: C.primaryDim, borderColor: C.primary, borderRadius: R.lg, padding: S.base, marginTop: S.sm }]}
          onPress={() => navigation.navigate('ExpenseItems')}
        >
          <Ionicons name="cube-outline" size={16} color={C.primary} style={{ marginRight: S.sm }} />
          <Text style={[s.manageTxt, { color: C.primary }]}>{t('expenseItems.title')}</Text>
        </TouchableOpacity>

      </ScrollView>

      <DepositSheet
        visible={showDeposit}
        current={dayData?.deposit_today || 0}
        onSave={handleDepositSave}
        onDelete={handleDepositDelete}
        onClose={() => setShowDeposit(false)}
        C={C} T={T} S={S} R={R} t={t}
      />
      <AmountSheet
        visible={amtSheet.visible}
        cat={amtSheet.cat}
        cashAmt={amtSheet.cashAmt}
        onSave={handleAmtSave}
        onClose={() => setAmtSheet(v => ({ ...v, visible: false }))}
        dayId={dayData?.id}
        selectedDate={selectedDate}
        onReload={reload}
        C={C} T={T} S={S} R={R} Shadow={Shadow} t={t}
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
  secHdr:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  secLbl:    { fontSize: 11, fontWeight: '700', letterSpacing: 1.5 },
  hint:      { fontSize: 11, marginBottom: 12 },
  grid:      { flexDirection: 'row', flexWrap: 'wrap' },
  manageBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderStyle: 'dashed' },
  manageTxt: { fontSize: 13, fontWeight: '600' },
});
