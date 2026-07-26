import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, RefreshControl, Animated, TextInput, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { scaleTheme, makeShadow, Typography, Spacing, Radius } from '../constants/theme';
import { useTheme } from '../store/ThemeContext';
import DayNavigator from '../components/DayNavigator';
import useAppStore from '../store/useAppStore';
import { translateCategoryName } from '../constants/defaultCategories';
import {
  getTasksForDay,
  getPlacesForDay,
  getNotesForDay,
  getExpenseSummaryForDay,
  completeTask,
  updateDeposit,        // ← static import, NOT dynamic require()
  getVehicleStats,
} from '../db/queries';

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

// ── Reusable bits ─────────────────────────────────────────────────────────────

const Card = ({ children, accent, C, Shadow, style }) => (
  <View style={[
    cv.card,
    { backgroundColor: C.bgCard, borderColor: C.border },
    accent && { borderLeftColor: accent, borderLeftWidth: 3 },
    Shadow.sm,
    style,
  ]}>
    {children}
  </View>
);
const cv = StyleSheet.create({
  card: { borderRadius: Radius.xl, padding: Spacing.lg, marginBottom: Spacing.lg, borderWidth: 1 },
});

const SecHdr = ({ icon, iconBg, title, count, onAll, C }) => (
  <View style={sh.row}>
    <View style={sh.left}>
      <View style={[sh.ib, { backgroundColor: iconBg + '22' }]}>
        <Text style={{ fontSize: 16 }}>{icon}</Text>
      </View>
      <Text style={[sh.title, { color: C.textPrimary }]}>{title}</Text>
      {count > 0 && (
        <View style={[sh.badge, { backgroundColor: iconBg + '22' }]}>
          <Text style={[sh.badgeTxt, { color: iconBg }]}>{count}</Text>
        </View>
      )}
    </View>
    {onAll && (
      <TouchableOpacity style={[sh.allBtn, { backgroundColor: C.primaryDim }]} onPress={onAll}>
        <Text style={[sh.allTxt, { color: C.primary }]}>See all →</Text>
      </TouchableOpacity>
    )}
  </View>
);
const sh = StyleSheet.create({
  row:    { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  left:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  ib:     { width: 36, height: 36, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  title:  { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold },
  badge:  { paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.full },
  badgeTxt:{ fontSize: Typography.sizes.xs, fontWeight: Typography.weights.bold },
  allBtn: { paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.full },
  allTxt: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold },
});

const Empty = ({ icon, text, C }) => (
  <View style={em.w}>
    <Text style={{ fontSize: 28, opacity: 0.4, marginBottom: 4 }}>{icon}</Text>
    <Text style={[em.t, { color: C.textMuted }]}>{text}</Text>
  </View>
);
const em = StyleSheet.create({
  w: { alignItems: 'center', paddingVertical: Spacing.base },
  t: { fontSize: Typography.sizes.xs },
});

const AddBtn = ({ label, onPress, C }) => (
  <TouchableOpacity style={[ab.btn, { borderTopColor: C.divider }]} onPress={onPress}>
    <Text style={[ab.txt, { color: C.primary }]}>{label}</Text>
  </TouchableOpacity>
);
const ab = StyleSheet.create({
  btn: { marginTop: Spacing.sm, paddingVertical: 8, alignItems: 'center', borderTopWidth: 1 },
  txt: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold, letterSpacing: 0.3 },
});

// ── Balance Card ──────────────────────────────────────────────────────────────

const BalanceCard = ({ dayData, onPress, C, Shadow, t }) => {
  const bal  = dayData?.closing_balance ?? 0;
  const open = dayData?.opening_balance ?? 0;
  const dep  = dayData?.deposit_today   ?? 0;
  const cash = dayData?.cash_spent      ?? 0;
  const onl  = dayData?.online_spent    ?? 0;
  const pos  = bal >= 0;

  return (
    <TouchableOpacity style={[bc.card, { backgroundColor: C.isDark ? C.bgElevated : C.primary }, Shadow.primary]} onPress={onPress} activeOpacity={0.92}>
      {/* Main balance */}
      <View style={bc.top}>
        <View>
          <Text style={bc.lbl}>{t('home.cashBalance').toUpperCase()}</Text>
          <Text style={[bc.bal, { color: pos ? '#A7F3D0' : '#FCA5A5' }]}>{fmt(bal)}</Text>
        </View>
        <View style={bc.circle}>
          <Text style={{ fontSize: 28 }}>💰</Text>
        </View>
      </View>

      <View style={bc.hr} />

      {/* 3-col breakdown */}
      <View style={bc.row}>
        {[
          { l: t('home.opening'),   v: fmt(open),       c: 'rgba(255,255,255,0.8)' },
          { l: t('home.deposited'), v: '+'+fmt(dep),     c: '#A7F3D0' },
          { l: t('home.cashSpent'),v: '−'+fmt(cash),    c: '#FCA5A5' },
        ].map((x, i) => (
          <React.Fragment key={x.l}>
            {i > 0 && <View style={bc.pipe} />}
            <View style={bc.col}>
              <Text style={bc.colLbl}>{x.l}</Text>
              <Text style={[bc.colVal, { color: x.c }]}>{x.v}</Text>
            </View>
          </React.Fragment>
        ))}
      </View>

      {onl > 0 && (
        <View style={bc.chip}>
          <Text style={bc.chipTxt}>🌐  {t('home.online')}: {fmt(onl)}</Text>
        </View>
      )}

      <Text style={bc.hint}>{t('home.tapToExpense')}</Text>
    </TouchableOpacity>
  );
};
const bc = StyleSheet.create({
  card:   { borderRadius: Radius.xl, padding: Spacing.xl, marginBottom: Spacing.lg, overflow: 'hidden' },
  top:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  lbl:    { fontSize: 10, color: 'rgba(255,255,255,0.65)', letterSpacing: 2, fontWeight: '700', marginBottom: 6 },
  bal:    { fontSize: Typography.sizes.hero, fontWeight: Typography.weights.black, letterSpacing: -1.5 },
  circle: { width: 56, height: 56, borderRadius: 28, backgroundColor: 'rgba(255,255,255,0.18)', alignItems: 'center', justifyContent: 'center' },
  hr:     { height: 1, backgroundColor: 'rgba(255,255,255,0.2)', marginVertical: Spacing.lg },
  row:    { flexDirection: 'row', alignItems: 'center' },
  col:    { flex: 1, alignItems: 'center' },
  colLbl: { fontSize: 10, color: 'rgba(255,255,255,0.6)', fontWeight: '600', letterSpacing: 0.5, marginBottom: 4 },
  colVal: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold },
  pipe:   { width: 1, height: 28, backgroundColor: 'rgba(255,255,255,0.2)' },
  chip:   { marginTop: Spacing.md, alignSelf: 'flex-start', backgroundColor: 'rgba(255,255,255,0.15)', paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.full },
  chipTxt:{ fontSize: Typography.sizes.sm, color: '#E0E7FF', fontWeight: Typography.weights.semibold },
  hint:   { fontSize: Typography.sizes.xs, color: 'rgba(255,255,255,0.45)', marginTop: Spacing.md, textAlign: 'right', fontWeight: Typography.weights.semibold },
});

// ── Task Row ──────────────────────────────────────────────────────────────────

const TaskRow = ({ task, onComplete, C, translate }) => {
  const [localCompleted, setLocalCompleted] = useState(false);
  const isCompleted = task.status === 'completed' || localCompleted;

  const handleComplete = () => {
    if (task.status === 'completed') return;
    setLocalCompleted(true);
    setTimeout(() => {
      onComplete(task.id);
    }, 2000);
  };

  return (
    <View style={[tr.row, { borderBottomColor: C.divider }]}>
      <TouchableOpacity 
        style={[tr.check, { borderColor: isCompleted ? C.income : C.iconTask, backgroundColor: isCompleted ? C.income : 'transparent' }]} 
        onPress={handleComplete} 
        activeOpacity={isCompleted ? 1 : 0.7}
        disabled={isCompleted}
      >
        {isCompleted && <Text style={tr.checkmark}>✓</Text>}
      </TouchableOpacity>
      <View style={tr.body}>
        <Text style={[tr.title, { color: isCompleted ? C.textMuted : C.textPrimary, textDecorationLine: isCompleted ? 'line-through' : 'none' }]} numberOfLines={1}>{task.title}</Text>
        <Text style={[tr.from, { color: C.textMuted }]}>{translate('common.from')} {task.start_date}</Text>
      </View>
    </View>
  );
};
const tr = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.md, borderBottomWidth: 1 },
  check: { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center' },
  checkmark: { color: '#fff', fontSize: 14, fontWeight: 'bold' },
  body:  { flex: 1 },
  title: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.semibold },
  from:  { fontSize: Typography.sizes.xs, marginTop: 3 },
});

// ── Main HomeScreen ───────────────────────────────────────────────────────────

export default function HomeScreen({ navigation }) {
  const { t } = useTranslation();
  const { C, scale, showMileage } = useTheme();
  const { Typography, Spacing, Radius } = scaleTheme(scale);
  const Shadow = makeShadow(C);
  const { selectedDate, dayData, refreshDayData } = useAppStore();

  const [tasks,      setTasks]      = useState([]);
  const [expSummary, setExpSummary] = useState([]);
  const [places,     setPlaces]     = useState([]);
  const [notes,      setNotes]      = useState([]);
  const [vehicleStats, setVehicleStats] = useState({ totalAvg: 0, last10Avg: 0, totalDistance: 0 });
  const [refreshing, setRefreshing] = useState(false);

  // FAB deposit state
  const [fabOpen,    setFabOpen]    = useState(false);
  const [fabAmount,  setFabAmount]  = useState('');

  const loadData = useCallback(() => {
    refreshDayData(selectedDate);
    setVehicleStats(getVehicleStats());
  }, [refreshDayData, selectedDate]);

  const loadSections = useCallback(() => {
    if (!dayData) return;
    const allTasks = getTasksForDay(selectedDate);
    const completedToday = allTasks.filter(t => t.status === 'completed' && t.completed_date === selectedDate);
    const pending = allTasks.filter(t => t.status === 'pending');
    setTasks([...pending, ...completedToday]);
    setExpSummary(getExpenseSummaryForDay(dayData.id));
    setPlaces(getPlacesForDay(dayData.id));
    setNotes(getNotesForDay(dayData.id));
  }, [dayData, selectedDate]);

  useEffect(() => { 
    refreshDayData(selectedDate);
  }, [selectedDate, refreshDayData]);
  useEffect(() => { loadSections(); }, [dayData]);

  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  const onRefresh = () => {
    setRefreshing(true);
    loadData();
    setTimeout(() => setRefreshing(false), 700);
  };

  const handleComplete = (id) => { completeTask(id); loadData(); loadSections(); };

  // Quick deposit via FAB — uses static import, not dynamic require
  const handleFabDeposit = () => {
    const n = parseFloat(fabAmount);
    if (!isNaN(n) && n > 0) {
      updateDeposit(selectedDate, (dayData?.deposit_today || 0) + n);
      loadData();
    }
    setFabOpen(false);
    setFabAmount('');
  };

  const visibleTasks  = tasks.slice(0, 3);
  const pendingCount = tasks.filter(t => t.status === 'pending').length;
  const topCats       = expSummary.filter(c => c.total > 0).slice(0, 5);

  return (
    <View style={[s.root, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={C.isDark ? 'light-content' : 'dark-content'} backgroundColor={C.bgCard} />
      <DayNavigator />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} />}
      >
        {/* ── BALANCE ────────────────────────────────────────────── */}
        <Text style={[s.secLbl, { color: C.textSecondary }]}>💰  {t('home.cashBalance').toUpperCase()}</Text>
        <BalanceCard dayData={dayData} onPress={() => navigation.navigate('Expense')} C={C} Shadow={Shadow} t={t} />

        {/* Expense category chips */}
        {topCats.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chips} contentContainerStyle={s.chipsRow}>
            {topCats.map(cat => (
              <TouchableOpacity
                key={cat.category_id}
                style={[s.chip, { backgroundColor: C.bgCard, borderColor: C.border }, Shadow.sm]}
                onPress={() => navigation.navigate('Expense')}
                activeOpacity={0.8}
              >
                <Text style={{ fontSize: 22, marginBottom: 4 }}>{cat.icon}</Text>
                <Text style={[s.chipName, { color: C.textSecondary }]}>{translateCategoryName(cat.name, t)}</Text>
                <Text style={[s.chipAmt, { color: C.primary }]}>{fmt(cat.total)}</Text>
              </TouchableOpacity>
            ))}
            {expSummary.filter(c => c.total > 0).length > 5 && (
              <TouchableOpacity
                style={[s.chip, s.chipMore, { backgroundColor: C.primaryDim, borderColor: C.primary }]}
                onPress={() => navigation.navigate('Expense')}
              >
                <Text style={[s.chipAmt, { color: C.primary }]}>More →</Text>
              </TouchableOpacity>
            )}
          </ScrollView>
        )}

        {/* ── TASKS ──────────────────────────────────────────────── */}
        <Card accent={C.iconTask} C={C} Shadow={Shadow}>
          <SecHdr icon="✅" iconBg={C.iconTask} title={t('home.tasks')} count={pendingCount} onAll={() => navigation.navigate('Tasks')} C={C} />
          {visibleTasks.length === 0
            ? <Empty icon="🎯" text={t('home.noTasks')} C={C} />
            : visibleTasks.map(task => <TaskRow key={task.id} task={task} onComplete={handleComplete} C={C} translate={t} />)
          }
          {tasks.length > 3 && (
            <TouchableOpacity style={s.moreRow} onPress={() => navigation.navigate('Tasks')}>
              <Text style={[s.moreTxt, { color: C.textMuted }]}>+{tasks.length - 3} more</Text>
            </TouchableOpacity>
          )}
          <AddBtn label={t('home.addTask')} onPress={() => navigation.navigate('Tasks', { autoAdd: true })} C={C} />
        </Card>

        {/* ── VISITED PLACES ─────────────────────────────────────── */}
        <Card accent={C.iconPlaces} C={C} Shadow={Shadow}>
          <SecHdr icon="📍" iconBg={C.iconPlaces} title={t('home.visitedPlaces')} count={places.length} onAll={() => navigation.navigate('Places')} C={C} />
          {places.length === 0
            ? <Empty icon="🗺️" text={t('home.noPlaces')} C={C} />
            : (
              <View style={s.tagsWrap}>
                {places.map(p => (
                  <View key={p.id} style={[s.tag, { backgroundColor: C.bgElevated, borderColor: C.border }]}>
                    <Text style={[s.tagTxt, { color: C.textPrimary }]}>{p.icon || '📍'} {p.name}</Text>
                  </View>
                ))}
              </View>
            )
          }
          <AddBtn label={t('home.addPlace')} onPress={() => navigation.navigate('Places')} C={C} />
        </Card>

        {/* ── NOTES ──────────────────────────────────────────────── */}
        <Card accent={C.iconNotes} C={C} Shadow={Shadow}>
          <SecHdr icon="📝" iconBg={C.iconNotes} title={t('home.notes')} count={notes.length} onAll={() => navigation.navigate('Notes')} C={C} />
          {notes.length === 0
            ? <Empty icon="✏️" text={t('home.noNotes')} C={C} />
            : notes.slice(0, 2).map(n => (
              <View key={n.id} style={[s.noteRow, { borderBottomColor: C.divider }]}>
                <View style={[s.noteDot, { backgroundColor: C.iconNotes }]} />
                <Text style={[s.noteTxt, { color: C.textSecondary }]} numberOfLines={2}>{n.text}</Text>
              </View>
            ))
          }
          <AddBtn label={t('home.addNote')} onPress={() => navigation.navigate('Notes', { autoAdd: true })} C={C} />
        </Card>

        {/* ── VEHICLE MILEAGE ────────────────────────────────────── */}
        {showMileage && (
          <Card accent={C.primary} C={C} Shadow={Shadow}>
            <SecHdr icon="🏍️" iconBg={C.primary} title="Bike Mileage" count={0} onAll={() => navigation.navigate('Vehicle')} C={C} />
            <TouchableOpacity 
              style={[s.vehicleBox, { backgroundColor: C.isDark ? C.bgElevated : C.primary + '10', borderColor: C.primary }]}
              onPress={() => navigation.navigate('Vehicle')}
              activeOpacity={0.8}
            >
              <View style={s.vehicleLeft}>
                <Text style={{ fontSize: 32, marginBottom: 4 }}>⛽</Text>
                <Text style={[s.vehicleLabel, { color: C.textSecondary }]}>Average</Text>
                <Text style={[s.vehicleValue, { color: C.primary }]}>{vehicleStats.totalAvg.toFixed(2)} km/L</Text>
              </View>
              <View style={s.vehicleRight}>
                <View style={s.vehicleStat}>
                  <Text style={[s.vehicleStatLabel, { color: C.textMuted }]}>Last 10</Text>
                  <Text style={[s.vehicleStatValue, { color: C.income }]}>{vehicleStats.last10Avg.toFixed(2)}</Text>
                </View>
                <View style={s.vehicleStat}>
                  <Text style={[s.vehicleStatLabel, { color: C.textMuted }]}>Total km</Text>
                  <Text style={[s.vehicleStatValue, { color: C.expense }]}>{Number(vehicleStats.totalDistance).toLocaleString('en-IN')}</Text>
                </View>
              </View>
            </TouchableOpacity>
            <AddBtn label="Track Petrol" onPress={() => navigation.navigate('Vehicle')} C={C} />
          </Card>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Quick Deposit FAB ──────────────────────────────────── */}
      {fabOpen ? (
        <View style={[s.fabBar, { backgroundColor: C.bgCard, borderColor: C.border }, Shadow.md]}>
          <Text style={[s.fabRupee, { color: C.income }]}>₹</Text>
          <TextInput
            style={[s.fabInput, { color: C.textPrimary }]}
            placeholder={t('home.quickDeposit')}
            placeholderTextColor={C.textMuted}
            keyboardType="numeric"
            value={fabAmount}
            onChangeText={setFabAmount}
            autoFocus
            returnKeyType="done"
            onSubmitEditing={handleFabDeposit}
          />
          <TouchableOpacity style={[s.fabOk, { backgroundColor: C.income }]} onPress={handleFabDeposit}>
            <Text style={s.fabOkTxt}>✓</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.fabOk, { backgroundColor: C.bgElevated }]} onPress={() => { setFabOpen(false); setFabAmount(''); }}>
            <Text style={[s.fabOkTxt, { color: C.textSecondary }]}>✕</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <TouchableOpacity
          style={[s.fab, { backgroundColor: C.income }, Shadow.primary]}
          onPress={() => setFabOpen(true)}
          activeOpacity={0.88}
        >
          <Text style={s.fabIcon}>+₹</Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

const s = StyleSheet.create({
  root:    { flex: 1, maxWidth: Platform.OS === 'web' ? 1200 : '100%', width: '100%', alignSelf: 'center' },
  scroll:  { flex: 1 },
  content: { padding: Spacing.lg },

  secLbl: { fontSize: 11, fontWeight: Typography.weights.bold, letterSpacing: 1.5, marginBottom: Spacing.md, marginLeft: 2 },

  moreRow: { alignItems: 'center', paddingVertical: Spacing.xs },
  moreTxt: { fontSize: Typography.sizes.xs },

  chips:    { marginBottom: Spacing.lg },
  chipsRow: { gap: Spacing.md, paddingRight: Spacing.lg },
  chip:     { borderRadius: Radius.lg, paddingHorizontal: Spacing.md, paddingVertical: Spacing.sm, alignItems: 'center', borderWidth: 1, minWidth: 78 },
  chipMore: { justifyContent: 'center', minWidth: 60 },
  chipName: { fontSize: 10, marginBottom: 2 },
  chipAmt:  { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.black },

  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tag:      { borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: 7, borderWidth: 1 },
  tagTxt:   { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold },

  noteRow: { flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, paddingVertical: Spacing.sm, borderBottomWidth: 1 },
  noteDot: { width: 6, height: 6, borderRadius: 3, marginTop: 8 },
  noteTxt: { flex: 1, fontSize: Typography.sizes.base, lineHeight: 22 },

  vehicleBox: { borderRadius: Radius.lg, padding: Spacing.lg, flexDirection: 'row', gap: Spacing.lg, borderWidth: 2 },
  vehicleLeft: { flex: 1 },
  vehicleLabel: { fontSize: Typography.sizes.xs, fontWeight: Typography.weights.semibold, marginBottom: 2 },
  vehicleValue: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.black },
  vehicleRight: { gap: Spacing.md },
  vehicleStat: { alignItems: 'flex-end' },
  vehicleStatLabel: { fontSize: Typography.sizes.xs, marginBottom: 2 },
  vehicleStatValue: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold },

  // FAB
  fab:     { position: 'absolute', bottom: Platform.OS === 'web' ? 24 : 30, right: Platform.OS === 'web' ? 24 : 28, width: 64, height: 64, borderRadius: 32, alignItems: 'center', justifyContent: 'center' },
  fabIcon: { fontSize: 24, color: '#fff', fontWeight: Typography.weights.black },
  fabBar:  { position: 'absolute', bottom: Platform.OS === 'web' ? 18 : 24, left: Spacing.lg, right: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, padding: Spacing.sm, borderRadius: Radius.full, borderWidth: 1, maxWidth: Platform.OS === 'web' ? 500 : '100%', alignSelf: 'center' },
  fabRupee:{ fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, paddingHorizontal: 4 },
  fabInput:{ flex: 1, fontSize: Typography.sizes.base, paddingVertical: 6, outlineStyle: 'none' },
  fabOk:   { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
  fabOkTxt:{ color: '#fff', fontSize: 18, fontWeight: Typography.weights.bold },
});
