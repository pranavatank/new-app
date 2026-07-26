import React, { useState, useCallback, useMemo } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, RefreshControl, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { scaleTheme, makeShadow, Typography, Spacing, Radius } from '../constants/theme';
import { useTheme } from '../store/ThemeContext';
import { translateCategoryName } from '../constants/defaultCategories';
import {
  getMonthlySummary,
  getMonthTotals,
  getDailyTotals,
  getTopSpendingDays,
  getAvailableMonths,
} from '../db/queries';

// ── Constants ─────────────────────────────────────────────────────────────────

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// Rich category colour palette — cycles through these
const CAT_COLORS = [
  '#5B5FEF','#F59E0B','#10B981','#EF4444','#8B5CF6',
  '#3B82F6','#EC4899','#14B8A6','#F97316','#6366F1',
  '#84CC16','#06B6D4',
];

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt  = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });
const fmtK = (n) => {
  if (n >= 100000) return '₹' + (n/100000).toFixed(1) + 'L';
  if (n >= 1000)   return '₹' + (n/1000).toFixed(1) + 'K';
  return '₹' + Math.round(n);
};

const getDaysInMonth = (y, m) => new Date(y, m, 0).getDate(); // m is 1-based here

// ── Month Selector ────────────────────────────────────────────────────────────

const MonthSelector = ({ year, month, onChange, C, Shadow }) => {
  const prevMonth = () => {
    if (month === 1) onChange(year - 1, 12);
    else onChange(year, month - 1);
  };
  const nextMonth = () => {
    const now = new Date();
    if (year === now.getFullYear() && month === now.getMonth() + 1) return;
    if (month === 12) onChange(year + 1, 1);
    else onChange(year, month + 1);
  };

  const isCurrentMonth = (() => {
    const now = new Date();
    return year === now.getFullYear() && month === now.getMonth() + 1;
  })();

  return (
    <View style={[ms.wrap, { backgroundColor: C.bgCard, borderColor: C.border }, Shadow.sm]}>
      <TouchableOpacity onPress={prevMonth} style={[ms.navBtn, { backgroundColor: C.bgElevated }]}>
        <Text style={[ms.navTxt, { color: C.primary }]}>‹</Text>
      </TouchableOpacity>

      <View style={ms.center}>
        <Text style={[ms.monthName, { color: C.textPrimary }]}>
          {MONTHS_FULL[month - 1]}
        </Text>
        <Text style={[ms.year, { color: C.textSecondary }]}>{year}</Text>
      </View>

      <TouchableOpacity
        onPress={nextMonth}
        style={[ms.navBtn, { backgroundColor: isCurrentMonth ? C.divider : C.bgElevated }]}
        activeOpacity={isCurrentMonth ? 1 : 0.7}
      >
        <Text style={[ms.navTxt, { color: isCurrentMonth ? C.textMuted : C.primary }]}>›</Text>
      </TouchableOpacity>
    </View>
  );
};
const ms = StyleSheet.create({
  wrap:    { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.xl, padding: Spacing.sm, marginBottom: Spacing.base, borderWidth: 1 },
  navBtn:  { width: 44, height: 44, borderRadius: Radius.full, alignItems: 'center', justifyContent: 'center' },
  navTxt:  { fontSize: 26, fontWeight: '700', lineHeight: 30 },
  center:  { flex: 1, alignItems: 'center' },
  monthName:{ fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold },
  year:    { fontSize: Typography.sizes.xs, marginTop: 2, letterSpacing: 1 },
});

// ── Summary Cards Row ─────────────────────────────────────────────────────────

const SummaryCards = ({ totals, C, Shadow, t }) => {
  const savings = totals.deposited - totals.cash_spent;
  const savingsPct = totals.deposited > 0 ? Math.round((savings / totals.deposited) * 100) : 0;

  const cards = [
    { label: t('analytics.deposited'),    value: fmt(totals.deposited),   color: C.income,  bg: C.incomeBg,   icon: '💵' },
    { label: t('analytics.cashSpent'),   value: fmt(totals.cash_spent),  color: C.expense, bg: C.expenseBg,  icon: '💸' },
    { label: t('analytics.onlineSpent'), value: fmt(totals.online_spent),color: C.online,  bg: C.onlineBg,   icon: '🌐' },
    { label: t('analytics.saved'),        value: fmt(Math.max(0,savings)), color: savings >= 0 ? C.income : C.expense,
      bg: savings >= 0 ? C.incomeBg : C.expenseBg, icon: savings >= 0 ? '🏦' : '⚠️',
      sub: savings >= 0 ? `${savingsPct}${t('analytics.pctSaved')}` : t('analytics.overBudget') },
  ];

  return (
    <View style={sc.grid}>
      {cards.map((card) => (
        <View key={card.label} style={[sc.card, { backgroundColor: card.bg, borderColor: card.color + '30' }, Shadow.sm]}>
          <Text style={sc.cardIcon}>{card.icon}</Text>
          <Text style={[sc.cardValue, { color: card.color }]}>{card.value}</Text>
          <Text style={[sc.cardLabel, { color: C.textSecondary }]}>{card.label}</Text>
          {card.sub && <Text style={[sc.cardSub, { color: card.color }]}>{card.sub}</Text>}
        </View>
      ))}
    </View>
  );
};
const sc = StyleSheet.create({
  grid:      { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.base },
  card:      { width: '47.5%', borderRadius: Radius.xl, padding: Spacing.md, borderWidth: 1, alignItems: 'center' },
  cardIcon:  { fontSize: 24, marginBottom: 4 },
  cardValue: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.black, letterSpacing: -0.3 },
  cardLabel: { fontSize: Typography.sizes.xs, marginTop: 2 },
  cardSub:   { fontSize: Typography.sizes.xs, fontWeight: Typography.weights.semibold, marginTop: 2 },
});

// ── Section Header ────────────────────────────────────────────────────────────

const SectionHdr = ({ title, sub, C }) => (
  <View style={sh.wrap}>
    <Text style={[sh.title, { color: C.textPrimary }]}>{title}</Text>
    {sub && <Text style={[sh.sub, { color: C.textSecondary }]}>{sub}</Text>}
  </View>
);
const sh = StyleSheet.create({
  wrap:  { marginBottom: Spacing.sm },
  title: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold },
  sub:   { fontSize: Typography.sizes.xs, marginTop: 2 },
});

// ── Card wrapper ──────────────────────────────────────────────────────────────

const Card = ({ children, style, C, Shadow }) => (
  <View style={[cw.card, { backgroundColor: C.bgCard, borderColor: C.border }, Shadow.sm, style]}>
    {children}
  </View>
);
const cw = StyleSheet.create({
  card: { borderRadius: Radius.xl, padding: Spacing.base, marginBottom: Spacing.base, borderWidth: 1 },
});

// ── Daily Trend Bar Chart (pure RN) ──────────────────────────────────────────
// Shows every day of the month as a bar — active days filled, empty days ghosted

const DailyTrendChart = ({ dailyData, year, month, C, Shadow, t }) => {
  const daysInMonth = getDaysInMonth(year, month);
  const maxVal      = Math.max(...dailyData.map(d => d.total), 1);
  const BAR_H       = 80; // max bar height in px
  const today       = new Date();
  const todayDate   = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;

  // Map date → data
  const dataMap = {};
  dailyData.forEach(d => { dataMap[d.date] = d; });

  // Build full month array
  const bars = Array.from({ length: daysInMonth }, (_, i) => {
    const dayNum = i + 1;
    const dateStr = `${year}-${String(month).padStart(2,'0')}-${String(dayNum).padStart(2,'0')}`;
    const d = dataMap[dateStr];
    return {
      day: dayNum,
      date: dateStr,
      total: d?.total || 0,
      cash:  d?.cash_total || 0,
      online:d?.online_total || 0,
      isToday: dateStr === todayDate,
      isFuture: dateStr > todayDate,
    };
  });

  const avgSpend = dailyData.length > 0
    ? Math.round(dailyData.reduce((s,d) => s + d.total, 0) / dailyData.length)
    : 0;

  return (
    <Card C={C} Shadow={Shadow} style={{ paddingBottom: Spacing.sm }}>
      <SectionHdr
        title={t('analytics.dailyTrend')}
        sub={avgSpend > 0 ? `${t('analytics.avgDay')}: ${fmt(avgSpend)}` : t('analytics.noSpending')}
        C={C}
      />

      {/* Bars */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false}>
        <View style={[dt.chartArea, { height: BAR_H + 36 }]}>
          {bars.map((bar) => {
            const barH = bar.total > 0 ? Math.max(4, Math.round((bar.total / maxVal) * BAR_H)) : 0;
            const cashH = bar.cash > 0 ? Math.round((bar.cash / bar.total) * barH) : 0;
            const onlineH = barH - cashH;

            return (
              <View key={bar.day} style={dt.barCol}>
                {/* Bar itself */}
                <View style={[dt.barSlot, { height: BAR_H }]}>
                  {bar.total > 0 ? (
                    <View style={[dt.barFill, { height: barH }]}>
                      {/* Cash portion */}
                      {cashH > 0 && (
                        <View style={[dt.barSegment, { height: cashH, backgroundColor: C.expense }]} />
                      )}
                      {/* Online portion */}
                      {onlineH > 0 && (
                        <View style={[dt.barSegment, { height: onlineH, backgroundColor: C.online }]} />
                      )}
                    </View>
                  ) : (
                    <View style={[dt.barEmpty, { backgroundColor: bar.isFuture ? 'transparent' : C.bgElevated }]} />
                  )}
                  {/* Today indicator */}
                  {bar.isToday && <View style={[dt.todayLine, { backgroundColor: C.primary }]} />}
                </View>
                {/* Day label */}
                <Text style={[dt.dayLabel,
                  { color: bar.isToday ? C.primary : C.textMuted },
                  bar.isToday && { fontWeight: '700' },
                ]}>
                  {bar.day}
                </Text>
              </View>
            );
          })}
        </View>
      </ScrollView>

      {/* Legend */}
      <View style={dt.legend}>
        <View style={dt.legendItem}>
          <View style={[dt.legendDot, { backgroundColor: C.expense }]} />
          <Text style={[dt.legendTxt, { color: C.textSecondary }]}>{t('expense.cash')}</Text>
        </View>
        <View style={dt.legendItem}>
          <View style={[dt.legendDot, { backgroundColor: C.online }]} />
          <Text style={[dt.legendTxt, { color: C.textSecondary }]}>{t('expense.onlineLabel')}</Text>
        </View>
        {avgSpend > 0 && (
          <View style={dt.legendItem}>
            <View style={[dt.legendDot, { backgroundColor: C.primary }]} />
            <Text style={[dt.legendTxt, { color: C.textSecondary }]}>Today</Text>
          </View>
        )}
      </View>
    </Card>
  );
};
const dt = StyleSheet.create({
  chartArea: { flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal: 2 },
  barCol:    { width: 18, alignItems: 'center', marginHorizontal: 2 },
  barSlot:   { width: 10, justifyContent: 'flex-end', alignItems: 'center', position: 'relative' },
  barFill:   { width: 10, borderRadius: 3, overflow: 'hidden', justifyContent: 'flex-end' },
  barSegment:{ width: 10 },
  barEmpty:  { width: 6, height: 3, borderRadius: 2 },
  todayLine: { position: 'absolute', bottom: -4, width: 10, height: 2, borderRadius: 1 },
  dayLabel:  { fontSize: 9, marginTop: 4 },
  legend:    { flexDirection: 'row', gap: Spacing.base, marginTop: Spacing.sm },
  legendItem:{ flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendTxt: { fontSize: Typography.sizes.xs },
});

// ── Category Breakdown (horizontal bars) ─────────────────────────────────────

const CategoryBreakdown = ({ catData, totalSpent, C, Shadow, t }) => {
  if (catData.length === 0) return null;

  return (
    <Card C={C} Shadow={Shadow}>
      <SectionHdr
        title={t('analytics.categoryBreakdown')}
        sub={`${catData.length} ${t('analytics.categoriesWithSpending')}`}
        C={C}
      />
      {catData.map((cat, idx) => {
        const pct  = totalSpent > 0 ? (cat.total / totalSpent) * 100 : 0;
        const color = CAT_COLORS[idx % CAT_COLORS.length];
        const displayName = translateCategoryName(cat.name, t);
        return (
          <View key={cat.name} style={cb.row}>
            {/* Icon + Name */}
            <View style={cb.left}>
              <View style={[cb.iconBox, { backgroundColor: color + '18' }]}>
                <Text style={cb.icon}>{cat.icon}</Text>
              </View>
              <View style={cb.nameWrap}>
                <Text style={[cb.name, { color: C.textPrimary }]} numberOfLines={1}>{displayName}</Text>
                <View style={cb.subRow}>
                  {cat.cash_total > 0 && (
                    <Text style={[cb.sub, { color: C.expense }]}>💵 {fmt(cat.cash_total)}</Text>
                  )}
                  {cat.online_total > 0 && (
                    <Text style={[cb.sub, { color: C.online }]}>🌐 {fmt(cat.online_total)}</Text>
                  )}
                </View>
              </View>
            </View>

            {/* Bar + amount */}
            <View style={cb.right}>
              <Text style={[cb.amount, { color: color }]}>{fmt(cat.total)}</Text>
              <View style={[cb.barTrack, { backgroundColor: C.bgElevated }]}>
                <View style={[cb.barFill, { width: `${Math.min(100, pct)}%`, backgroundColor: color }]} />
              </View>
              <Text style={[cb.pct, { color: C.textMuted }]}>{pct.toFixed(1)}%</Text>
            </View>
          </View>
        );
      })}
    </Card>
  );
};
const cb = StyleSheet.create({
  row:     { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, gap: Spacing.sm },
  left:    { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, flex: 1 },
  iconBox: { width: 36, height: 36, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  icon:    { fontSize: 18 },
  nameWrap:{ flex: 1 },
  name:    { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold },
  subRow:  { flexDirection: 'row', gap: Spacing.xs, marginTop: 2 },
  sub:     { fontSize: 10, fontWeight: Typography.weights.medium },
  right:   { width: 100, alignItems: 'flex-end' },
  amount:  { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold, marginBottom: 3 },
  barTrack:{ width: 100, height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  pct:     { fontSize: 10, marginTop: 2 },
});

// ── Donut-style Pie Chart (pure RN) ──────────────────────────────────────────
// Uses nested Views with border-radius to fake pie slices — works for 2-3 segments

const SpendingDonut = ({ cashSpent, onlineSpent, deposited, C, Shadow, t }) => {
  const total = cashSpent + onlineSpent;
  if (total === 0) return null;

  const saved = Math.max(0, deposited - cashSpent);
  const cashPct   = (cashSpent / (deposited || 1)) * 100;
  const onlinePct = (onlineSpent / (deposited || 1)) * 100;
  const savedPct  = Math.max(0, 100 - cashPct);

  const SIZE = 130;
  const STROKE = 18;

  // We'll use a bar-based donut (arc via overflow+rotation trick)
  // For simplicity and Hermes compatibility use a linear representation
  const segments = [
    { label: t('analytics.cashSpent'),  value: cashSpent,   pct: cashPct,   color: C.expense },
    { label: t('expense.onlineLabel'),      value: onlineSpent, pct: onlinePct, color: C.online },
    { label: t('analytics.saved'),       value: saved,        pct: savedPct,  color: C.income },
  ].filter(s => s.value > 0);

  return (
    <Card C={C} Shadow={Shadow}>
      <SectionHdr title={t('analytics.breakdown')} sub={t('analytics.ofDeposited')} C={C} />

      {/* Stacked horizontal progress bar acting as donut alternative */}
      <View style={[pb.track, { backgroundColor: C.bgElevated }]}>
        {segments.map((seg, i) => (
          <View
            key={seg.label}
            style={[
              pb.segment,
              { width: `${seg.pct}%`, backgroundColor: seg.color },
              i === 0 && { borderTopLeftRadius: Radius.full, borderBottomLeftRadius: Radius.full },
              i === segments.length - 1 && { borderTopRightRadius: Radius.full, borderBottomRightRadius: Radius.full },
            ]}
          />
        ))}
      </View>

      {/* Legend */}
      <View style={pb.legend}>
        {segments.map(seg => (
          <View key={seg.label} style={pb.legendRow}>
            <View style={[pb.dot, { backgroundColor: seg.color }]} />
            <View style={{ flex: 1 }}>
              <Text style={[pb.legendLabel, { color: C.textSecondary }]}>{seg.label}</Text>
              <Text style={[pb.legendVal, { color: C.textPrimary }]}>{fmt(seg.value)}</Text>
            </View>
            <Text style={[pb.legendPct, { color: seg.color }]}>{seg.pct.toFixed(1)}%</Text>
          </View>
        ))}
      </View>
    </Card>
  );
};
const pb = StyleSheet.create({
  track:      { height: 20, borderRadius: Radius.full, flexDirection: 'row', marginBottom: Spacing.base, overflow: 'hidden' },
  segment:    { height: 20 },
  legend:     { gap: Spacing.sm },
  legendRow:  { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  dot:        { width: 12, height: 12, borderRadius: 6 },
  legendLabel:{ fontSize: Typography.sizes.xs },
  legendVal:  { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold },
  legendPct:  { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold },
});

// ── Top Spending Days ─────────────────────────────────────────────────────────

const TopDays = ({ topDays, C, Shadow, t }) => {
  if (topDays.length === 0) return null;
  const maxVal = topDays[0]?.total || 1;

  const formatDay = (ds) => {
    const [y, m, d] = ds.split('-').map(Number);
    return `${d} ${MONTHS[m - 1]}`;
  };

  return (
    <Card C={C} Shadow={Shadow}>
      <SectionHdr title={t('analytics.topDays')} sub={t('analytics.top5')} C={C} />
      {topDays.map((day, idx) => {
        const pct = (day.total / maxVal) * 100;
        const medals = ['🥇','🥈','🥉','4️⃣','5️⃣'];
        return (
          <View key={day.date} style={td.row}>
            <Text style={td.medal}>{medals[idx]}</Text>
            <Text style={[td.date, { color: C.textSecondary }]}>{formatDay(day.date)}</Text>
            <View style={[td.barTrack, { backgroundColor: C.bgElevated }]}>
              <View style={[td.barFill, { width: `${pct}%`, backgroundColor: CAT_COLORS[idx] }]} />
            </View>
            <Text style={[td.amt, { color: C.textPrimary }]}>{fmt(day.total)}</Text>
          </View>
        );
      })}
    </Card>
  );
};
const td = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, paddingVertical: Spacing.xs },
  medal:    { fontSize: 16, width: 24 },
  date:     { fontSize: Typography.sizes.xs, fontWeight: Typography.weights.medium, width: 52 },
  barTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill:  { height: 8, borderRadius: 4 },
  amt:      { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold, width: 70, textAlign: 'right' },
});

// ── No Data State ─────────────────────────────────────────────────────────────

const NoData = ({ month, year, C, t }) => (
  <View style={[nd.wrap, { borderColor: C.border }]}>
    <Text style={nd.icon}>📊</Text>
    <Text style={[nd.title, { color: C.textPrimary }]}>{t('analytics.noData')} {MONTHS_FULL[month - 1]}</Text>
    <Text style={[nd.sub, { color: C.textSecondary }]}>
      {t('analytics.noDataSub')}
    </Text>
  </View>
);
const nd = StyleSheet.create({
  wrap:  { borderWidth: 1, borderStyle: 'dashed', borderRadius: Radius.xl, padding: Spacing.xxl, alignItems: 'center', gap: Spacing.sm, marginTop: Spacing.base },
  icon:  { fontSize: 52 },
  title: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, textAlign: 'center' },
  sub:   { fontSize: Typography.sizes.sm, textAlign: 'center', lineHeight: 20 },
});

// ── Main Analytics Screen ─────────────────────────────────────────────────────

export default function AnalyticsScreen() {
  const { t } = useTranslation();
  const { C, scale } = useTheme();
  const { Typography, Spacing, Radius } = scaleTheme(scale);
  const Shadow = makeShadow(C);

  const now = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [refreshing, setRefreshing] = useState(false);

  const [totals,    setTotals]    = useState({ deposited: 0, cash_spent: 0, online_spent: 0 });
  const [catData,   setCatData]   = useState([]);
  const [dailyData, setDailyData] = useState([]);
  const [topDays,   setTopDays]   = useState([]);
  const [hasData,   setHasData]   = useState(false);

  const load = useCallback(() => {
    const t  = getMonthTotals(year, month);
    const c  = getMonthlySummary(year, month);
    const dd = getDailyTotals(year, month);
    const td = getTopSpendingDays(year, month, 5);

    setTotals(t);
    setCatData(c);
    setDailyData(dd);
    setTopDays(td);
    setHasData(t.deposited > 0 || t.cash_spent > 0 || t.online_spent > 0 || dd.length > 0);
  }, [year, month]);

  useFocusEffect(useCallback(() => { load(); }, [year, month]));

  const onRefresh = () => {
    setRefreshing(true);
    load();
    setTimeout(() => setRefreshing(false), 700);
  };

  const totalSpent = totals.cash_spent + totals.online_spent;

  const handleMonthChange = (y, m) => {
    setYear(y);
    setMonth(m);
  };

  return (
    <View style={[s.root, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={C.isDark ? 'light-content' : 'dark-content'} backgroundColor={C.bgCard} />

      {/* Header */}
      <View style={[s.header, { backgroundColor: C.bgCard, borderBottomColor: C.border }]}>
        <Text style={[s.headerTitle, { color: C.textPrimary }]}>{t('analytics.title')}</Text>
        <Text style={[s.headerSub, { color: C.textSecondary }]}>{t('analytics.subtitle')}</Text>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} />}
      >
        {/* Month Selector */}
        <MonthSelector year={year} month={month} onChange={handleMonthChange} C={C} Shadow={Shadow} />

        {!hasData ? (
          <NoData month={month} year={year} C={C} t={t} />
        ) : (
          <>
            {/* Summary Cards */}
            <SummaryCards totals={totals} C={C} Shadow={Shadow} t={t} />

            {/* Spending Breakdown donut */}
            <SpendingDonut
              cashSpent={totals.cash_spent}
              onlineSpent={totals.online_spent}
              deposited={totals.deposited}
              C={C} Shadow={Shadow} t={t}
            />

            {/* Daily Trend */}
            <DailyTrendChart
              dailyData={dailyData}
              year={year}
              month={month}
              C={C} Shadow={Shadow} t={t}
            />

            {/* Category Breakdown */}
            <CategoryBreakdown
              catData={catData}
              totalSpent={totalSpent}
              C={C} Shadow={Shadow} t={t}
            />

            {/* Top Spending Days */}
            <TopDays topDays={topDays} C={C} Shadow={Shadow} t={t} />

            {/* Quick insight footer */}
            <View style={[s.insightCard, { backgroundColor: C.primaryDim, borderColor: C.primary + '40' }]}>
              <Text style={s.insightIcon}>💡</Text>
              <Text style={[s.insightTxt, { color: C.primary }]}>
                {totals.deposited > 0
                  ? totals.cash_spent > totals.deposited
                    ? `You overspent by ${fmt(totals.cash_spent - totals.deposited)} this month`
                    : topDays[0]
                      ? `Highest spending day was ${(() => { const [,m,d]=topDays[0].date.split('-'); return `${parseInt(d)} ${MONTHS[parseInt(m)-1]}`; })()} with ${fmt(topDays[0].total)}`
                      : `You saved ${fmt(totals.deposited - totals.cash_spent)} this month — great job!`
                  : 'Add deposits and expenses to see insights here'
                }
              </Text>
            </View>
          </>
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, maxWidth: Platform.OS === 'web' ? 1200 : '100%', width: '100%', alignSelf: 'center' },
  header: { paddingHorizontal: Spacing.base, paddingTop: Spacing.lg, paddingBottom: Spacing.base, borderBottomWidth: 1 },
  headerTitle: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold },
  headerSub:   { fontSize: Typography.sizes.xs, marginTop: 2 },
  scroll:  { flex: 1 },
  content: { padding: Spacing.base },
  insightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    padding: Spacing.base,
    borderRadius: Radius.xl,
    borderWidth: 1,
    marginTop: Spacing.xs,
  },
  insightIcon: { fontSize: 18 },
  insightTxt:  { flex: 1, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.medium, lineHeight: 20 },
});
