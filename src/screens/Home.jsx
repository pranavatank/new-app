import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, RefreshControl, TextInput, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { scaleTheme, makeShadow } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Card, Button, IconBadge, Chip, EmptyState, SectionHeader, FAB } from '../components/common';
import DayOverview from '../components/DayOverview';
import { useTheme } from '../store/ThemeContext';
import DayNavigator from '../components/DayNavigator';
import useAppStore from '../store/useAppStore';
import {
  updateDeposit,        // ← static import, NOT dynamic require()
} from '../db/queries';

const fmt = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

// ── Balance Card ──────────────────────────────────────────────────────────────

const BalanceCard = ({ dayData, onPress, t }) => {
  const { C, scale } = useTheme();
  const { Typography, Spacing, Radius } = scaleTheme(scale);
  const Shadow = makeShadow(C);

  const bal  = dayData?.closing_balance ?? 0;
  const open = dayData?.opening_balance ?? 0;
  const dep  = (dayData?.deposit_today ?? 0) + (dayData?.receipt_total ?? 0);
  const transfer = dayData?.transfer_net ?? 0;
  const cash = dayData?.cash_spent      ?? 0;
  const onl  = dayData?.online_spent    ?? 0;
  const pos  = bal >= 0;

  const bc = StyleSheet.create({
    card:   { borderRadius: Radius.xl, padding: Spacing.xl, marginBottom: Spacing.lg, overflow: 'hidden' },
    top:    { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
    lbl:    { fontSize: 10, color: C.gradientMuted, letterSpacing: 2, fontWeight: '700', marginBottom: 6 },
    bal:    { fontSize: Typography.sizes.hero, fontWeight: Typography.weights.black, letterSpacing: -1.5 },
    circle: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.gradientSubtle, alignItems: 'center', justifyContent: 'center' },
    hr:     { height: 1, backgroundColor: C.gradientBorder, marginVertical: Spacing.lg },
    row:    { flexDirection: 'row', alignItems: 'center' },
    col:    { flex: 1, alignItems: 'center' },
    colLbl: { fontSize: 10, color: C.gradientMuted, fontWeight: '600', letterSpacing: 0.5, marginBottom: 4 },
    colVal: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold },
    pipe:   { width: 1, height: 28, backgroundColor: C.gradientBorder },
    chip:   { marginTop: Spacing.md, alignSelf: 'flex-start', flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: C.gradientSubtle, paddingHorizontal: Spacing.md, paddingVertical: 6, borderRadius: Radius.full },
    chipTxt:{ fontSize: Typography.sizes.sm, color: C.textOnGradient, fontWeight: Typography.weights.semibold },
    hint:   { fontSize: Typography.sizes.xs, color: C.gradientMuted, marginTop: Spacing.md, textAlign: 'right', fontWeight: Typography.weights.semibold },
  });

  return (
    <TouchableOpacity activeOpacity={0.92} onPress={onPress} style={[Shadow.primary]}>
      <LinearGradient colors={C.gradients.primary} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }} style={bc.card}>
        {/* Main balance */}
        <View style={bc.top}>
          <View>
            <Text style={bc.lbl}>{t('home.cashBalance').toUpperCase()}</Text>
            <Text style={[bc.bal, { color: pos ? C.incomeOnGradient : C.expenseOnGradient }]}>{fmt(bal)}</Text>
          </View>
          <View style={bc.circle}>
            <Ionicons name="wallet" size={28} color={C.textOnGradient} />
          </View>
        </View>

        <View style={bc.hr} />

        {/* 3-col breakdown */}
        <View style={bc.row}>
          {[
            { l: t('home.opening'),   v: fmt(open),       c: C.gradientMuted },
            { l: t('ledger.receipts'), v: '+'+fmt(dep),     c: C.incomeOnGradient },
            { l: t('home.cashSpent'),v: '−'+fmt(cash),    c: C.expenseOnGradient },
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

        {transfer !== 0 && (
          <View style={bc.chip}>
            <Text style={bc.chipTxt}>{t(transfer > 0 ? 'ledger.locker_in' : 'ledger.locker_out')}: {transfer > 0 ? '+' : '−'}{fmt(Math.abs(transfer))}</Text>
          </View>
        )}
        {onl > 0 && (
          <View style={bc.chip}>
            <Ionicons name="globe-outline" size={13} color={C.onlineOnGradient} />
            <Text style={bc.chipTxt}>{t('home.online')}: {fmt(onl)}</Text>
          </View>
        )}

        <Text style={bc.hint}>{t('home.tapToExpense')}</Text>
      </LinearGradient>
    </TouchableOpacity>
  );
};

// ── Task Row ──────────────────────────────────────────────────────────────────

// ── Main HomeScreen ───────────────────────────────────────────────────────────

export default function HomeScreen({ navigation }) {
  const { t } = useTranslation();
  const { C, scale, showMileage } = useTheme();
  const { Typography, Spacing, Radius } = scaleTheme(scale);
  const Shadow = makeShadow(C);
  const { selectedDate, dayData, refreshDayData } = useAppStore();

  const [refreshing, setRefreshing] = useState(false);

  // FAB deposit state
  const [fabOpen,    setFabOpen]    = useState(false);
  const [fabAmount,  setFabAmount]  = useState('');

  const loadData = useCallback(() => {
    refreshDayData(selectedDate);
  }, [refreshDayData, selectedDate]);

  useEffect(() => {
    refreshDayData(selectedDate);
  }, [selectedDate, refreshDayData]);

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

  const s = sStyles(Typography, Spacing, Radius);

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
        {/* ── SEARCH ENTRY ───────────────────────────────────────── */}
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => navigation.navigate('Search')}
          style={{
            flexDirection: 'row',
            alignItems: 'center',
            gap: 10,
            backgroundColor: C.bgCard,
            borderColor: C.border,
            borderWidth: 1,
            borderRadius: 999,
            paddingHorizontal: 16,
            paddingVertical: 12,
            marginBottom: 16,
          }}
        >
          <Ionicons name="search" size={18} color={C.primary} />
          <Text style={{ flex: 1, color: C.textMuted, fontSize: 15 }} numberOfLines={1}>
            {t('search.homeHint')}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={C.textMuted} />
        </TouchableOpacity>

        {/* ── BALANCE ────────────────────────────────────────────── */}
        <View style={s.secLblRow}>
          <Ionicons name="wallet" size={14} color={C.iconBalance} />
          <Text style={[s.secLbl, { color: C.textSecondary }]}>{t('home.cashBalance').toUpperCase()}</Text>
        </View>
        <BalanceCard dayData={dayData} onPress={() => navigation.navigate('Expense')} t={t} />

        {/* Expense category chips */}
        {topCats.length > 0 && (
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={s.chips} contentContainerStyle={s.chipsRow}>
            {topCats.map((cat, i) => (
              <Chip
                key={cat.category_id}
                emoji={cat.icon}
                label={`${translateCategoryName(cat.name, t)} · ${fmt(cat.total)}`}
                color={C.accents[i % C.accents.length]}
                onPress={() => navigation.navigate('Expense')}
              />
            ))}
            {expSummary.filter(c => c.total > 0).length > 5 && (
              <Chip label="More" icon="arrow-forward" color={C.primary} onPress={() => navigation.navigate('Expense')} />
            )}
          </ScrollView>
        )}

        {/* ── TASKS ──────────────────────────────────────────────── */}
        <Card style={{ marginBottom: Spacing.lg }}>
          <SectionHeader
            icon="checkmark-circle"
            color={C.iconTask}
            title={t('home.tasks')}
            badge={pendingCount > 0 ? pendingCount : undefined}
            onSeeAll={() => navigation.navigate('Tasks')}
          />
          {visibleTasks.length === 0
            ? <EmptyState icon="flag-outline" title={t('home.noTasks')} />
            : visibleTasks.map(task => <TaskRow key={task.id} task={task} onComplete={handleComplete} translate={t} />)
          }
          {tasks.length > 3 && (
            <TouchableOpacity style={s.moreRow} onPress={() => navigation.navigate('Tasks')}>
              <Text style={[s.moreTxt, { color: C.textMuted }]}>+{tasks.length - 3} more</Text>
            </TouchableOpacity>
          )}
          <Button variant="ghost" size="sm" icon="add" label={t('home.addTask')} onPress={() => navigation.navigate('Tasks', { autoAdd: true })} style={s.addBtn} />
        </Card>

        {/* ── VISITED PLACES ─────────────────────────────────────── */}
        <Card style={{ marginBottom: Spacing.lg }}>
          <SectionHeader icon="location" color={C.iconPlaces} title={t('home.visitedPlaces')} badge={places.length > 0 ? places.length : undefined} onSeeAll={() => navigation.navigate('Places')} />
          {places.length === 0
            ? <EmptyState icon="map-outline" title={t('home.noPlaces')} />
            : (
              <View style={s.tagsWrap}>
                {places.map(p => (
                  <View key={p.id} style={[s.tag, { backgroundColor: C.bgElevated, borderColor: C.border }]}>
                    <IconBadge
                      photoUri={p.icon_type === 'image' ? p.icon : undefined}
                      emoji={p.icon_type !== 'image' ? (p.icon || '📍') : undefined}
                      size={22}
                      color={C.iconPlaces}
                    />
                    <Text style={[s.tagTxt, { color: C.textPrimary }]}>{p.name}</Text>
                  </View>
                ))}
              </View>
            )
          }
          <Button variant="ghost" size="sm" icon="add" label={t('home.addPlace')} onPress={() => navigation.navigate('Places')} style={s.addBtn} />
        </Card>

        {/* ── NOTES ──────────────────────────────────────────────── */}
        <Card style={{ marginBottom: Spacing.lg }}>
          <SectionHeader icon="document-text" color={C.iconNotes} title={t('home.notes')} badge={notes.length > 0 ? notes.length : undefined} onSeeAll={() => navigation.navigate('Notes')} />
          {notes.length === 0
            ? <EmptyState icon="create-outline" title={t('home.noNotes')} />
            : notes.slice(0, 2).map(n => (
              <View key={n.id} style={[s.noteRow, { borderBottomColor: C.divider }]}>
                <View style={[s.noteDot, { backgroundColor: C.iconNotes }]} />
                <Text style={[s.noteTxt, { color: C.textSecondary }]} numberOfLines={2}>{n.text}</Text>
              </View>
            ))
          }
          <Button variant="ghost" size="sm" icon="add" label={t('home.addNote')} onPress={() => navigation.navigate('Notes', { autoAdd: true })} style={s.addBtn} />
        </Card>

        {/* ── VEHICLE MILEAGE ────────────────────────────────────── */}
        {showMileage && (
          <Card style={{ marginBottom: Spacing.lg }}>
            <SectionHeader mciIcon="motorbike" color={C.primary} title="Bike Mileage" onSeeAll={() => navigation.navigate('Vehicle')} />
            <TouchableOpacity
              style={[s.vehicleBox, { backgroundColor: C.isDark ? C.bgElevated : C.primary + '10', borderColor: C.primary }]}
              onPress={() => navigation.navigate('Vehicle')}
              activeOpacity={0.8}
            >
              <View style={s.vehicleLeft}>
                <Ionicons name="speedometer-outline" size={30} color={C.primary} style={{ marginBottom: 4 }} />
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
            <Button variant="ghost" size="sm" icon="water-outline" label="Track Petrol" onPress={() => navigation.navigate('Vehicle')} style={s.addBtn} />
          </Card>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* ── Quick Deposit FAB ──────────────────────────────────── */}
      {/* {fabOpen ? (
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
            <Ionicons name="checkmark" size={18} color="#fff" />
          </TouchableOpacity>
          <TouchableOpacity style={[s.fabOk, { backgroundColor: C.bgElevated }]} onPress={() => { setFabOpen(false); setFabAmount(''); }}>
            <Ionicons name="close" size={18} color={C.textSecondary} />
          </TouchableOpacity>
        </View>
      ) : (
        <FAB icon="cash-outline" gradient={C.gradients.income} onPress={() => setFabOpen(true)} style={s.fab} />
      )} */}
    </View>
  );
}

const sStyles = (Typography, Spacing, Radius) => StyleSheet.create({
  root:    { flex: 1, maxWidth: Platform.OS === 'web' ? 1200 : '100%', width: '100%', alignSelf: 'center' },
  scroll:  { flex: 1 },
  content: { padding: Spacing.lg },

  secLblRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.md, marginLeft: 2 },
  secLbl: { fontSize: 11, fontWeight: Typography.weights.bold, letterSpacing: 1.5 },

  moreRow: { alignItems: 'center', paddingVertical: Spacing.xs },
  moreTxt: { fontSize: Typography.sizes.xs },

  chips:    { marginBottom: Spacing.lg },
  chipsRow: { gap: Spacing.md, paddingRight: Spacing.lg },

  tagsWrap: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm },
  tag:      { flexDirection: 'row', alignItems: 'center', gap: 6, borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: 7, borderWidth: 1 },
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

  addBtn: { marginTop: Spacing.sm, alignSelf: 'center' },

  // FAB
  fab:     { position: 'absolute', bottom: Platform.OS === 'web' ? 24 : 30, right: Platform.OS === 'web' ? 24 : 28 },
  fabBar:  { position: 'absolute', bottom: Platform.OS === 'web' ? 18 : 24, left: Spacing.lg, right: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, padding: Spacing.sm, borderRadius: Radius.full, borderWidth: 1, maxWidth: Platform.OS === 'web' ? 500 : '100%', alignSelf: 'center' },
  fabRupee:{ fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, paddingHorizontal: 4 },
  fabInput:{ flex: 1, fontSize: Typography.sizes.base, paddingVertical: 6, outlineStyle: 'none' },
  fabOk:   { width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' },
});
