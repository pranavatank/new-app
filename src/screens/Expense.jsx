import React, { useState, useCallback, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Modal, Pressable, Alert, KeyboardAvoidingView,
  Platform, StatusBar, useWindowDimensions, Image,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { scaleTheme, makeShadow, Typography, Spacing, Radius } from '../constants/theme';
import { useTheme } from '../store/ThemeContext';
import DayNavigator from '../components/DayNavigator';
import useAppStore from '../store/useAppStore';
import { translateCategoryName } from '../constants/defaultCategories';
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

// ── Bottom Sheet Base ─────────────────────────────────────────────────────────

const Sheet = ({ visible, onClose, children, C, Shadow }) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <View style={{ flex: 1 }}>
      <Pressable style={[bs.overlay, { backgroundColor: C.overlay }]} onPress={onClose} />
      <View style={[bs.sheet, { backgroundColor: C.bgCard }, Shadow.md]}>
        <View style={[bs.handle, { backgroundColor: C.border }]} />
        {children}
      </View>
    </View>
  </Modal>
);
const bs = StyleSheet.create({
  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  sheet:   { position: 'absolute', bottom: 0, left: 0, right: 0, borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: Spacing.xl, paddingBottom: 42 },
  handle:  { width: 44, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.lg },
});

// ── Balance Header ────────────────────────────────────────────────────────────

const BalanceHeader = ({ dayData, C, Shadow, t }) => {
  const bal  = dayData?.closing_balance ?? 0;
  const dep  = dayData?.deposit_today   ?? 0;
  const cash = dayData?.cash_spent      ?? 0;
  const onl  = dayData?.online_spent    ?? 0;
  const pos  = bal >= 0;

  return (
    <View style={[bh.card, { backgroundColor: C.isDark ? C.bgElevated : C.primary }, Shadow.primary]}>
      <View style={bh.topRow}>
        <View>
          <Text style={bh.lbl}>{t('expense.cashBalance').toUpperCase()}</Text>
          <Text style={[bh.bal, { color: pos ? '#A7F3D0' : '#FCA5A5' }]}>{fmt(bal)}</Text>
        </View>
        <View style={bh.circle}><Text style={{ fontSize: 30 }}>💰</Text></View>
      </View>

      <View style={bh.hr} />

      <View style={bh.statsRow}>
        {[
          { l: t('analytics.deposited'),  v: '+' + fmt(dep),  c: '#A7F3D0' },
          { l: t('analytics.cashSpent'), v: '−' + fmt(cash), c: '#FCA5A5' },
          { l: t('analytics.onlineSpent'),     v: fmt(onl),         c: '#C4B5FD' },
        ].map((x, i) => (
          <React.Fragment key={x.l}>
            {i > 0 && <View style={bh.pipe} />}
            <View style={bh.stat}>
              <Text style={bh.statLbl}>{x.l}</Text>
              <Text style={[bh.statVal, { color: x.c }]}>{x.v}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>
    </View>
  );
};
const bh = StyleSheet.create({
  card:     { borderRadius: Radius.xl, padding: Spacing.xl, marginBottom: Spacing.md },
  topRow:   { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  lbl:      { fontSize: 10, color: 'rgba(255,255,255,0.65)', letterSpacing: 2, fontWeight: '700', marginBottom: 6 },
  bal:      { fontSize: Typography.sizes.hero, fontWeight: Typography.weights.black, letterSpacing: -1.5 },
  circle:   { width: 58, height: 58, borderRadius: 29, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  hr:       { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: Spacing.lg },
  statsRow: { flexDirection: 'row', alignItems: 'center' },
  stat:     { flex: 1, alignItems: 'center' },
  statLbl:  { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '600', letterSpacing: 0.5, marginBottom: 4 },
  statVal:  { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold },
  pipe:     { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.2)' },
});

// ── Deposit Row ───────────────────────────────────────────────────────────────

const DepositRow = ({ deposit, onPress, C, Shadow, t }) => (
  <TouchableOpacity
    style={[dr.wrap, { backgroundColor: C.incomeBg, borderColor: C.income + '60' }, Shadow.sm]}
    onPress={onPress}
    activeOpacity={0.8}
  >
    <View style={[dr.iconBox, { backgroundColor: C.income + '20' }]}>
      <Text style={{ fontSize: 24 }}>💵</Text>
    </View>
    <View style={{ flex: 1 }}>
      <Text style={[dr.lbl, { color: C.income }]}>{t('expense.cashDeposit')}</Text>
      <Text style={[dr.val, { color: C.textPrimary }]}>
        {deposit > 0 ? fmt(deposit) : t('expense.tapToSet')}
      </Text>
    </View>
    <View style={[dr.pill, { backgroundColor: C.income }]}>
      <Text style={dr.pillTxt}>{deposit > 0 ? t('common.edit') : t('common.add')}</Text>
    </View>
  </TouchableOpacity>
);
const dr = StyleSheet.create({
  wrap:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, padding: Spacing.base, borderRadius: Radius.xl, borderWidth: 1.5, marginBottom: Spacing.md },
  iconBox: { width: 48, height: 48, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  lbl:     { fontSize: 11, fontWeight: Typography.weights.bold, letterSpacing: 0.8, textTransform: 'uppercase', marginBottom: 3 },
  val:     { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold },
  pill:    { paddingHorizontal: Spacing.md, paddingVertical: 8, borderRadius: Radius.full },
  pillTxt: { color: '#fff', fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold },
});

// ── Deposit Sheet ─────────────────────────────────────────────────────────────

const DepositSheet = ({ visible, current, onSave, onDelete, onClose, C, Shadow, t }) => {
  const [val, setVal] = useState('');
  const PRESETS = [500, 1000, 2000, 5000, 10000];

  React.useEffect(() => {
    if (visible) setVal(current > 0 ? String(current) : '');
  }, [visible]);

  const save = () => {
    const n = parseFloat(val);
    if (isNaN(n) || n < 0) { Alert.alert('Invalid', 'Please enter a valid amount'); return; }
    onSave(n); onClose();
  };

  const handleDelete = () => {
    Alert.alert(t('common.delete'), t('expense.deleteDeposit'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => { onDelete(); onClose(); } },
    ]);
  };

  return (
    <Sheet visible={visible} onClose={onClose} C={C} Shadow={Shadow}>
      <Text style={[s2.title, { color: C.textPrimary }]}>{t('expense.depositTitle')}</Text>
      <Text style={[s2.sub, { color: C.textSecondary }]}>{t('expense.depositPrompt')}</Text>

      <View style={[s2.inputRow, { backgroundColor: C.bgInput, borderColor: C.primary }]}>
        <Text style={[s2.rupee, { color: C.primary }]}>₹</Text>
        <TextInput
          style={[s2.input, { color: C.textPrimary }]}
          value={val}
          onChangeText={setVal}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={C.textMuted}
          autoFocus
          selectTextOnFocus
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s2.presets}>
        {PRESETS.map(p => (
          <TouchableOpacity
            key={p}
            style={[s2.preset, {
              backgroundColor: val === String(p) ? C.income : C.incomeBg,
              borderColor: C.income,
            }]}
            onPress={() => setVal(String(p))}
          >
            <Text style={[s2.presetTxt, { color: val === String(p) ? '#fff' : C.income }]}>₹{fmtN(p)}</Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <View style={s2.btnRow}>
        <TouchableOpacity style={[s2.btn, { borderColor: C.border, borderWidth: 1 }]} onPress={onClose}>
          <Text style={[s2.btnTxt, { color: C.textSecondary }]}>{t('common.cancel')}</Text>
        </TouchableOpacity>
        {current > 0 && (
          <TouchableOpacity style={[s2.btn, { backgroundColor: C.expense }]} onPress={handleDelete}>
            <Text style={[s2.btnTxt, { color: '#fff' }]}>{t('common.delete')}</Text>
          </TouchableOpacity>
        )}
        <TouchableOpacity style={[s2.btn, { backgroundColor: C.income, flex: current > 0 ? 1 : 1 }]} onPress={save}>
          <Text style={[s2.btnTxt, { color: '#fff' }]}>{t('expense.saveDeposit')}</Text>
        </TouchableOpacity>
      </View>
    </Sheet>
  );
};
const s2 = StyleSheet.create({
  title:   { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold, marginBottom: 4 },
  sub:     { fontSize: Typography.sizes.sm, marginBottom: Spacing.lg },
  inputRow:{ flexDirection: 'row', alignItems: 'center', borderRadius: Radius.lg, borderWidth: 2, paddingHorizontal: Spacing.base, marginBottom: Spacing.base },
  rupee:   { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.black, marginRight: Spacing.xs },
  input:   { flex: 1, fontSize: Typography.sizes.xxl, fontWeight: Typography.weights.black, paddingVertical: Spacing.base },
  presets: { gap: Spacing.sm, paddingBottom: Spacing.base },
  preset:  { paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, borderRadius: Radius.full, borderWidth: 1.5 },
  presetTxt:{ fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold },
  btnRow:  { flexDirection: 'row', gap: Spacing.sm },
  btn:     { flex: 1, paddingVertical: Spacing.md, borderRadius: Radius.lg, alignItems: 'center' },
  btnTxt:  { fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold },
});

// ── Amount Entry Sheet ────────────────────────────────────────────────────────

const AmountSheet = ({ visible, cat, cashAmt, onSave, onClose, C, Shadow, t, dayId, selectedDate, onReload }) => {
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

  if (!cat) return null;

  const save = () => {
    const n = parseFloat(val);
    if (editingItemId) {
      setItemAmounts(prev => ({ ...prev, [editingItemId]: isNaN(n) ? 0 : Math.max(0, n) }));
      setEditingItemId(null);
      setShowItems(true);
      setVal('');
    } else {
      onSave(isNaN(n) ? 0 : Math.max(0, n), pType);
      onClose();
    }
  };

  const handleItemStep = (itemId, currentAmt, delta) => {
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
    <Sheet visible={visible} onClose={onClose} C={C} Shadow={Shadow}>
      <Text style={[sa.emoji]}>{cat.icon}</Text>
      <Text style={[s2.title, { color: C.textPrimary, textAlign: 'center' }]}>{cat.name}</Text>
      <Text style={[s2.sub, { color: C.textSecondary, textAlign: 'center' }]}>{t('expense.enterAmount')}</Text>

      <View style={[sa.toggle, { backgroundColor: C.bgElevated }]}>
        {[{ k: 'cash', lbl: '💵  ' + t('expense.cash') }, { k: 'online', lbl: '🌐  ' + t('expense.onlineLabel') }].map(({ k, lbl }) => (
          <TouchableOpacity
            key={k}
            style={[sa.toggleBtn, pType === k && { backgroundColor: C.primary, borderRadius: Radius.md }]}
            onPress={() => setPType(k)}
          >
            <Text style={[sa.toggleTxt, { color: pType === k ? '#fff' : C.textSecondary }]}>{lbl}</Text>
          </TouchableOpacity>
        ))}
      </View>

      {showItems ? (
        <ScrollView style={{ maxHeight: 380 }} showsVerticalScrollIndicator={false}>
          <View style={sa.itemsGrid}>
            {items.map((item) => {
              const amt = itemAmounts[item.id] || 0;
              const isActive = amt > 0;
              return (
                <TouchableOpacity
                  key={item.id}
                  style={[
                    sa.itemCard,
                    { 
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
                  
                  <View style={[sa.itemIconBox, { backgroundColor: C.primary + (isActive ? '20' : '12') }]}>
                    {item.icon_type === 'image' ? (
                      <Image source={{ uri: item.icon }} style={sa.itemIconImg} />
                    ) : (
                      <Text style={{ fontSize: 26 }}>{item.icon}</Text>
                    )}
                  </View>
                  
                  <Text style={[sa.itemName, { color: C.textPrimary }]} numberOfLines={1}>{item.name}</Text>
                  
                  <Text style={[sa.itemAmt, { color: isActive ? C.primary : C.textMuted }]}>
                    {isActive ? fmt(amt) : '—'}
                  </Text>
                  
                  <View style={[sa.itemStepper, { backgroundColor: C.bgElevated }]}>
                    <TouchableOpacity
                      style={sa.stepBtn}
                      onPress={(e) => { e.stopPropagation(); handleItemStep(item.id, Math.max(0, amt - 10), -10); }}
                    >
                      <Text style={[sa.stepTxt, { color: C.expense }]}>−</Text>
                    </TouchableOpacity>
                    <Text style={[sa.stepVal, { color: C.textSecondary }]} numberOfLines={1}>
                      {fmtN(amt)}
                    </Text>
                    <TouchableOpacity
                      style={sa.stepBtn}
                      onPress={(e) => { e.stopPropagation(); handleItemStep(item.id, amt + 10, 10); }}
                    >
                      <Text style={[sa.stepTxt, { color: C.income }]}>+</Text>
                    </TouchableOpacity>
                  </View>
                </TouchableOpacity>
              );
            })}
          </View>
          <TouchableOpacity
            style={[sa.commonBtn, { backgroundColor: C.bgCard, borderColor: C.border }]}
            onPress={() => { setShowItems(false); setEditingItemId(null); }}
          >
            <Text style={{ fontSize: 20 }}>💰</Text>
            <Text style={[sa.commonTxt, { color: C.textSecondary }]}>{t('expense.commonItem')}</Text>
          </TouchableOpacity>
        </ScrollView>
      ) : (
        <>
          <View style={[s2.inputRow, { backgroundColor: C.bgInput, borderColor: C.primary }]}>
            <Text style={[s2.rupee, { color: C.primary }]}>₹</Text>
            <TextInput
              style={[s2.input, { color: C.textPrimary }]}
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
              style={[sa.showItemsBtn, { backgroundColor: C.bgElevated, borderColor: C.border }]}
              onPress={() => setShowItems(true)}
            >
              <Text style={[sa.showItemsTxt, { color: C.textSecondary }]}>📦 {t('expense.showItems')}</Text>
            </TouchableOpacity>
          )}
        </>
      )}

      <View style={s2.btnRow}>
        <TouchableOpacity style={[s2.btn, { borderColor: C.border, borderWidth: 1 }]} onPress={onClose}>
          <Text style={[s2.btnTxt, { color: C.textSecondary }]}>{t('common.cancel')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s2.btn, { backgroundColor: C.primary }]}
          onPress={showItems ? saveItems : save}
        >
          <Text style={[s2.btnTxt, { color: '#fff' }]}>{t('common.save')}</Text>
        </TouchableOpacity>
      </View>
    </Sheet>
  );
};
const sa = StyleSheet.create({
  emoji:     { fontSize: 46, textAlign: 'center', marginBottom: 6 },
  toggle:    { flexDirection: 'row', borderRadius: Radius.lg, padding: 4, marginBottom: Spacing.base },
  toggleBtn: { flex: 1, paddingVertical: Spacing.md, alignItems: 'center' },
  toggleTxt: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold },
  itemsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.base },
  itemCard:  { width: '48%', borderRadius: Radius.xl, padding: Spacing.sm, alignItems: 'center', position: 'relative' },
  activeDot: { position: 'absolute', top: 8, right: 8, width: 8, height: 8, borderRadius: 4 },
  itemIconBox: { width: 50, height: 50, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', marginBottom: 6, marginTop: 4 },
  itemIconImg: { width: 32, height: 32, borderRadius: 8 },
  itemName:  { fontSize: Typography.sizes.xs, fontWeight: Typography.weights.semibold, textAlign: 'center', marginBottom: 2 },
  itemAmt:   { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.black, marginBottom: 8 },
  itemStepper: { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.full, overflow: 'hidden', width: '100%', height: 32 },
  stepBtn:   { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  stepTxt:   { fontSize: 22, fontWeight: Typography.weights.black, lineHeight: 26 },
  stepVal:   { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: Typography.weights.bold },
  commonBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1, borderStyle: 'dashed', marginBottom: Spacing.base },
  commonTxt: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold },
  showItemsBtn: { padding: Spacing.sm, borderRadius: Radius.md, alignItems: 'center', borderWidth: 1, marginBottom: Spacing.base },
  showItemsTxt: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold },
});

// ── Manage Categories Sheet ───────────────────────────────────────────────────
// NOTE: Uses ScrollView + map instead of FlatList — FlatList inside Modal
// crashes on Android Hermes in production builds.

const ManageCatsSheet = ({ visible, onClose, onRefresh, C, Shadow, t }) => {
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
    <Sheet visible={visible} onClose={onClose} C={C} Shadow={Shadow}>
      <View style={mc.hdr}>
        <Text style={[mc.title, { color: C.textPrimary }]}>{t('expense.manageCategories')}</Text>
        <TouchableOpacity style={[mc.closeBtn, { backgroundColor: C.bgElevated }]} onPress={onClose}>
          <Text style={[mc.closeTxt, { color: C.textSecondary }]}>✕</Text>
        </TouchableOpacity>
      </View>

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
                <Text style={[mc.arrow, { opacity: index === 0 ? 0.3 : 1 }]}>▲</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={() => moveDown(index)} disabled={index === cats.length - 1}>
                <Text style={[mc.arrow, { opacity: index === cats.length - 1 ? 0.3 : 1 }]}>▼</Text>
              </TouchableOpacity>
            </View>
            <Text style={mc.icon}>{item.icon}</Text>
            <Text style={[mc.name, { color: C.textPrimary }]}>{item.name}</Text>
            <TouchableOpacity
              style={[mc.editBtn, { backgroundColor: C.primaryDim }]}
              onPress={() => { setEditing(item); setNewName(item.name); setNewIcon(item.icon); }}
            >
              <Text style={{ fontSize: 14 }}>✏️</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[mc.del, { backgroundColor: C.expenseLight }]}
              onPress={() => doDelete(item.id)}
            >
              <Text style={[mc.delTxt, { color: C.expense }]}>✕</Text>
            </TouchableOpacity>
          </View>
        ))}
      </ScrollView>

      {(adding || editing) ? (
        <View style={[mc.addForm, { backgroundColor: C.bgElevated, borderColor: C.border }]}>
          <View style={mc.addRow}>
            <TextInput
              style={[mc.iconInput, { color: C.textPrimary, borderColor: C.border, backgroundColor: C.bgInput }]}
              value={newIcon}
              onChangeText={setNewIcon}
              maxLength={2}
            />
            <TextInput
              style={[mc.nameInput, { color: C.textPrimary, borderColor: C.border, backgroundColor: C.bgInput }]}
              value={newName}
              onChangeText={setNewName}
              placeholder={t('expense.categoryName')}
              placeholderTextColor={C.textMuted}
              autoFocus
            />
          </View>
          <View style={s2.btnRow}>
            <TouchableOpacity style={[s2.btn, { borderColor: C.border, borderWidth: 1 }]} onPress={() => { setAdding(false); setEditing(null); }}>
              <Text style={[s2.btnTxt, { color: C.textSecondary }]}>{t('common.cancel')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[s2.btn, { backgroundColor: C.primary }]} onPress={editing ? doEdit : doAdd}>
              <Text style={[s2.btnTxt, { color: '#fff' }]}>{editing ? t('common.save') : t('common.add')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={[mc.addBtn, { backgroundColor: C.primaryDim, borderColor: C.primary }]}
          onPress={() => setAdding(true)}
        >
          <Text style={[mc.addBtnTxt, { color: C.primary }]}>{t('expense.addNewCategory')}</Text>
        </TouchableOpacity>
      )}
    </Sheet>
  );
};
const mc = StyleSheet.create({
  hdr: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.lg },
  title: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold },
  closeBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  closeTxt: { fontSize: 16, fontWeight: '700' },
  row: { flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, paddingVertical: Spacing.sm, borderBottomWidth: 1 },
  reorderBtns: { flexDirection: 'column', gap: 2 },
  arrow: { fontSize: 10, color: '#666' },
  icon: { fontSize: 22, width: 34 },
  name: { flex: 1, fontSize: Typography.sizes.base, fontWeight: Typography.weights.medium },
  editBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  del: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  delTxt: { fontSize: 13, fontWeight: '700' },
  addForm: { borderRadius: Radius.lg, padding: Spacing.base, marginTop: Spacing.base, borderWidth: 1 },
  addRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.base },
  iconInput: { width: 52, borderRadius: Radius.sm, borderWidth: 1, textAlign: 'center', fontSize: 22, paddingVertical: 8 },
  nameInput: { flex: 1, borderRadius: Radius.sm, borderWidth: 1, paddingHorizontal: Spacing.sm, paddingVertical: 8, fontSize: Typography.sizes.base },
  addBtn: { marginTop: Spacing.base, padding: Spacing.md, borderRadius: Radius.lg, alignItems: 'center', borderWidth: 1.5, borderStyle: 'dashed' },
  addBtnTxt: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold },
});

// ── Category Card ─────────────────────────────────────────────────────────────

const CARD_COLORS = [
  '#5B5FEF','#F59E0B','#10B981','#EF4444','#8B5CF6',
  '#3B82F6','#EC4899','#14B8A6','#F97316','#06B6D4',
  '#84CC16','#6366F1',
];

const CatCard = ({ cat, cashAmt, onlineAmt, onStep, onTap, onLongPress, cardW, accentColor, C, T, S, R, Shadow, t }) => {
  const total  = (cashAmt || 0) + (onlineAmt || 0);
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
      <View style={[{ width: 50, height: 50, borderRadius: R.lg, alignItems: 'center', justifyContent: 'center', marginBottom: 6, marginTop: 4 }, { backgroundColor: accentColor + (active ? '20' : '12') }]}>
        <Text style={{ fontSize: 26 }}>{cat.icon}</Text>
      </View>
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
          <Text style={[{ fontSize: 22, fontWeight: T.weights.black, lineHeight: 26 }, { color: C.expense }]}>−</Text>
        </TouchableOpacity>
        <Text style={[{ flex: 1, textAlign: 'center', fontSize: 10, fontWeight: T.weights.bold }, { color: C.textSecondary }]} numberOfLines={1}>
          {fmtN(cashAmt || 0)}
        </Text>
        <TouchableOpacity
          style={{ width: 32, height: 32, alignItems: 'center', justifyContent: 'center' }}
          onPress={() => onStep(cat, (cashAmt || 0) + 10, 'cash')}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[{ fontSize: 22, fontWeight: T.weights.black, lineHeight: 26 }, { color: C.income }]}>+</Text>
        </TouchableOpacity>
      </View>
      {(onlineAmt || 0) > 0 && (
        <View style={[{ marginTop: 5, paddingHorizontal: 7, paddingVertical: 2, borderRadius: R.full }, { backgroundColor: C.onlineBg }]}>
          <Text style={[{ fontSize: 9, fontWeight: T.weights.bold }, { color: C.online }]}>🌐 {fmt(onlineAmt)}</Text>
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

  const cashFor   = (id) => summary.find(r => r.category_id === id)?.cash_total   || 0;
  const onlineFor = (id) => summary.find(r => r.category_id === id)?.online_total || 0;

  const handleStep = (cat, newAmt, pType) => {
    if (!dayData?.id) return;
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
    if (!dayData?.id || !amtSheet.cat) return;
    try {
      setExpenseAmount(dayData.id, amtSheet.cat.id, amount, pType);
      recalculateBalance(dayData.id, selectedDate);
      reload();
    } catch (e) { console.error('amtSave:', e); }
  };

  const handleDepositSave = (amount) => {
    try { updateDeposit(selectedDate, amount); reload(); }
    catch (e) { console.error('deposit:', e); }
  };

  const handleDepositDelete = () => {
    try { updateDeposit(selectedDate, 0); reload(); }
    catch (e) { console.error('deposit delete:', e); }
  };

  const categories = summary.map((r, idx) => ({
    id: r.category_id, name: r.name, icon: r.icon, sort_order: r.sort_order,
    color: CARD_COLORS[idx % CARD_COLORS.length],
  }));

  const totalSpent = summary.reduce((s, r) => s + (r.total || 0), 0);

  return (
    <View style={[s.root, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={C.isDark ? 'light-content' : 'dark-content'} backgroundColor={C.bgCard} />
      <DayNavigator />

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* Balance header */}
        <BalanceHeader dayData={dayData} C={C} Shadow={Shadow} t={t} />

        {/* Deposit row */}
        <DepositRow deposit={dayData?.deposit_today || 0} onPress={() => setShowDeposit(true)} C={C} Shadow={Shadow} t={t} />

        {/* Expenses header */}
        <View style={s.secHdr}>
          <Text style={[s.secLbl, { color: C.textSecondary }]}>{t('expense.expensesByCategory').toUpperCase()}</Text>
          {totalSpent > 0 && (
            <View style={[s.totalPill, { backgroundColor: C.primaryDim }]}>
              <Text style={[s.totalTxt, { color: C.primary }]}>{t('expense.total')} {fmt(totalSpent)}</Text>
            </View>
          )}
        </View>

        <Text style={[s.hint, { color: C.textMuted }]}>{t('expense.tapToEnter')}</Text>

        {/* 3-column category grid */}
        <View style={s.grid}>
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
          style={[s.manageBtn, { backgroundColor: C.bgCard, borderColor: C.border }]}
          onPress={() => setShowManage(true)}
        >
          <Text style={{ fontSize: 16 }}>⚙️</Text>
          <Text style={[s.manageTxt, { color: C.textSecondary }]}>{t('expense.manageCategories')}</Text>
        </TouchableOpacity>

        {/* Items button */}
        <TouchableOpacity
          style={[s.manageBtn, { backgroundColor: C.primaryDim, borderColor: C.primary, marginTop: S.sm }]}
          onPress={() => navigation.navigate('ExpenseItems')}
        >
          <Text style={{ fontSize: 16 }}>📦</Text>
          <Text style={[s.manageTxt, { color: C.primary }]}>{t('expenseItems.title')}</Text>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>

      <DepositSheet
        visible={showDeposit}
        current={dayData?.deposit_today || 0}
        onSave={handleDepositSave}
        onDelete={handleDepositDelete}
        onClose={() => setShowDeposit(false)}
        C={C} Shadow={Shadow} t={t}
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
        C={C} Shadow={Shadow} t={t}
      />
      <ManageCatsSheet
        visible={showManage}
        onClose={() => setShowManage(false)}
        onRefresh={reload}
        C={C} Shadow={Shadow} t={t}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root:      { flex: 1 },
  scroll:    { flex: 1 },
  content:   { padding: Spacing.lg },
  secHdr:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  secLbl:    { fontSize: 11, fontWeight: Typography.weights.bold, letterSpacing: 1.5 },
  totalPill: { paddingHorizontal: Spacing.sm, paddingVertical: 4, borderRadius: Radius.full },
  totalTxt:  { fontSize: Typography.sizes.xs, fontWeight: Typography.weights.bold },
  hint:      { fontSize: 11, marginBottom: Spacing.md },
  grid:      { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  manageBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.sm, padding: Spacing.base, borderRadius: Radius.lg, borderWidth: 1, borderStyle: 'dashed', marginTop: Spacing.xs },
  manageTxt: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold },
});
