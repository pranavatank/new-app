import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, RefreshControl, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { scaleTheme, makeShadow } from '../constants/theme';
import { useTheme } from '../store/ThemeContext';
import { translateCategoryName } from '../constants/defaultCategories';
import { Card, IconBadge, EmptyState } from '../components/common';
import {
  getMonthlySummary,
  getMonthTotals,
  getDailyTotals,
  getTopSpendingDays,
} from '../db/queries';

// ── Constants ─────────────────────────────────────────────────────────────────

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];

// ── Helpers ───────────────────────────────────────────────────────────────────

const fmt  = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const getDaysInMonth = (y, m) => new Date(y, m, 0).getDate(); // m is 1-based here

// ── Month Selector ────────────────────────────────────────────────────────────

const MonthSelector = ({ year, month, onChange, C, T, S, R, Shadow }) => {
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
    <View style={[ms.wrap, { backgroundColor: C.bgCard, borderColor: C.border, borderRadius: R.xl, padding: S.sm, marginBottom: S.base }, Shadow.sm]}>
      <TouchableOpacity onPress={prevMonth} style={[ms.navBtn, { backgroundColor: C.bgElevated }]}>
        <Ionicons name="chevron-back" size={20} color={C.primary} />
      </TouchableOpacity>

      <View style={ms.center}>
        <Text style={[ms.monthName, { color: C.textPrimary, fontSize: T.sizes.xl, fontWeight: T.weights.bold }]}>
          {MONTHS_FULL[month - 1]}
        </Text>
        <Text style={[ms.year, { color: C.textSecondary, fontSize: T.sizes.xs }]}>{year}</Text>
      </View>

      <TouchableOpacity
        onPress={nextMonth}
        style={[ms.navBtn, { backgroundColor: isCurrentMonth ? C.divider : C.bgElevated }]}
        activeOpacity={isCurrentMonth ? 1 : 0.7}
      >
        <Ionicons name="chevron-forward" size={20} color={isCurrentMonth ? C.textMuted : C.primary} />
      </TouchableOpacity>
    </View>
  );
};
const ms = StyleSheet.create({
  wrap:    { flexDirection: 'row', alignItems: 'center', borderWidth: 1 },
  navBtn:  { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  center:  { flex: 1, alignItems: 'center' },
  monthName:{},
  year:    { marginTop: 2, letterSpacing: 1 },
});

// ── Summary Cards Row ─────────────────────────────────────────────────────────

const SummaryCards = ({ totals, C, T, S, R, Shadow, t }) => {
  const savings = totals.deposited - totals.cash_spent;
  const savingsPct = totals.deposited > 0 ? Math.round((savings / totals.deposited) * 100) : 0;

  const cards = [
    { label: t('analytics.deposited'),    value: fmt(totals.deposited),   color: C.income,  bg: C.incomeBg,   icon: 'cash-outline' },
    { label: t('analytics.cashSpent'),   value: fmt(totals.cash_spent),  color: C.expense, bg: C.expenseBg,  icon: 'trending-down' },
    { label: t('analytics.onlineSpent'), value: fmt(totals.online_spent),color: C.online,  bg: C.onlineBg,   icon: 'globe-outline' },
    { label: t('analytics.saved'),        value: fmt(Math.max(0,savings)), color: savings >= 0 ? C.income : C.expense,
      bg: savings >= 0 ? C.incomeBg : C.expenseBg, icon: savings >= 0 ? 'trophy-outline' : 'warning-outline',
      sub: savings >= 0 ? `${savingsPct}${t('analytics.pctSaved')}` : t('analytics.overBudget') },
  ];

  return (
    <View style={[sc.grid, { gap: S.sm, marginBottom: S.base }]}>
      {cards.map((card) => (
        <View key={card.label} style={[sc.card, { borderRadius: R.xl, padding: S.md, backgroundColor: card.bg, borderColor: card.color + '30' }, Shadow.sm]}>
          <IconBadge icon={card.icon} color={card.color} size={36} style={{ marginBottom: 4 }} />
          <Text style={[sc.cardValue, { fontSize: T.sizes.lg, fontWeight: T.weights.black, color: card.color }]}>{card.value}</Text>
          <Text style={[sc.cardLabel, { fontSize: T.sizes.xs, color: C.textSecondary }]}>{card.label}</Text>
          {card.sub && <Text style={[sc.cardSub, { fontSize: T.sizes.xs, fontWeight: T.weights.semibold, color: card.color }]}>{card.sub}</Text>}
        </View>
      ))}
    </View>
  );
};
const sc = StyleSheet.create({
  grid:      { flexDirection: 'row', flexWrap: 'wrap' },
  card:      { width: '47.5%', borderWidth: 1, alignItems: 'center' },
  cardValue: { letterSpacing: -0.3 },
  cardLabel: { marginTop: 2 },
  cardSub:   { marginTop: 2 },
});

// ── Section Header ────────────────────────────────────────────────────────────

const SectionHdr = ({ title, sub, C, T, S }) => (
  <View style={{ marginBottom: S.sm }}>
    <Text style={{ fontSize: T.sizes.md, fontWeight: T.weights.bold, color: C.textPrimary }}>{title}</Text>
    {sub && <Text style={{ fontSize: T.sizes.xs, marginTop: 2, color: C.textSecondary }}>{sub}</Text>}
  </View>
);

// ── Daily Trend Bar Chart (pure RN) ──────────────────────────────────────────
// Shows every day of the month as a bar — active days filled, empty days ghosted

const DailyTrendChart = ({ dailyData, year, month, C, T, S, R, Shadow, t }) => {
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
    <Card style={{ paddingBottom: S.sm, marginBottom: S.base }}>
      <SectionHdr
        title={t('analytics.dailyTrend')}
        sub={avgSpend > 0 ? `${t('analytics.avgDay')}: ${fmt(avgSpend)}` : t('analytics.noSpending')}
        C={C} T={T} S={S}
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
      <View style={[dt.legend, { gap: S.base, marginTop: S.sm }]}>
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
  legend:    { flexDirection: 'row' },
  legendItem:{ flexDirection: 'row', alignItems: 'center', gap: 4 },
  legendDot: { width: 8, height: 8, borderRadius: 4 },
  legendTxt: { fontSize: 11 },
});

// ── Category Breakdown (horizontal bars) ─────────────────────────────────────

const CategoryBreakdown = ({ catData, totalSpent, C, T, S, R, Shadow, t }) => {
  if (catData.length === 0) return null;

  return (
    <Card style={{ marginBottom: S.base }}>
      <SectionHdr
        title={t('analytics.categoryBreakdown')}
        sub={`${catData.length} ${t('analytics.categoriesWithSpending')}`}
        C={C} T={T} S={S}
      />
      {catData.map((cat, idx) => {
        const pct  = totalSpent > 0 ? (cat.total / totalSpent) * 100 : 0;
        const color = C.accents[idx % C.accents.length];
        const displayName = translateCategoryName(cat.name, t);
        return (
          <View key={cat.name} style={[cb.row, { paddingVertical: S.sm, gap: S.sm }]}>
            {/* Icon + Name */}
            <View style={[cb.left, { gap: S.sm }]}>
              <IconBadge emoji={cat.icon} color={color} size={36} />
              <View style={cb.nameWrap}>
                <Text style={[cb.name, { fontSize: T.sizes.sm, fontWeight: T.weights.semibold, color: C.textPrimary }]} numberOfLines={1}>{displayName}</Text>
                <View style={[cb.subRow, { gap: S.xs }]}>
                  {cat.cash_total > 0 && (
                    <Text style={[cb.sub, { color: C.expense }]}>{fmt(cat.cash_total)}</Text>
                  )}
                  {cat.online_total > 0 && (
                    <Text style={[cb.sub, { color: C.online }]}>{fmt(cat.online_total)}</Text>
                  )}
                </View>
              </View>
            </View>

            {/* Bar + amount */}
            <View style={cb.right}>
              <Text style={[cb.amount, { fontSize: T.sizes.sm, fontWeight: T.weights.bold, color: color }]}>{fmt(cat.total)}</Text>
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
  row:     { flexDirection: 'row', alignItems: 'center' },
  left:    { flexDirection: 'row', alignItems: 'center', flex: 1 },
  nameWrap:{ flex: 1 },
  name:    {},
  subRow:  { flexDirection: 'row', marginTop: 2 },
  sub:     { fontSize: 10, fontWeight: '500' },
  right:   { width: 100, alignItems: 'flex-end' },
  amount:  { marginBottom: 3 },
  barTrack:{ width: 100, height: 6, borderRadius: 3, overflow: 'hidden' },
  barFill: { height: 6, borderRadius: 3 },
  pct:     { fontSize: 10, marginTop: 2 },
});

// ── Donut-style Pie Chart (pure RN) ──────────────────────────────────────────
// Uses nested Views with border-radius to fake pie slices — works for 2-3 segments

const SpendingDonut = ({ cashSpent, onlineSpent, deposited, C, T, S, R, Shadow, t }) => {
  const total = cashSpent + onlineSpent;
  if (total === 0) return null;

  // All three segments share one pool (cash spent + online spent + what's
  // left of the deposit) so their percentages always sum to exactly 100 —
  // computing cashPct/onlinePct against `deposited` independently let the
  // bar overflow past 100% whenever there was online spending or overspend.
  const saved = Math.max(0, deposited - cashSpent);
  const pool = cashSpent + onlineSpent + saved || 1;
  const cashPct   = (cashSpent / pool) * 100;
  const onlinePct = (onlineSpent / pool) * 100;
  const savedPct  = (saved / pool) * 100;

  const segments = [
    { label: t('analytics.cashSpent'),  value: cashSpent,   pct: cashPct,   color: C.expense },
    { label: t('expense.onlineLabel'),      value: onlineSpent, pct: onlinePct, color: C.online },
    { label: t('analytics.saved'),       value: saved,        pct: savedPct,  color: C.income },
  ].filter(s => s.value > 0);

  return (
    <Card style={{ marginBottom: S.base }}>
      <SectionHdr title={t('analytics.breakdown')} sub={t('analytics.ofDeposited')} C={C} T={T} S={S} />

      {/* Stacked horizontal progress bar acting as donut alternative */}
      <View style={[pb.track, { backgroundColor: C.bgElevated, borderRadius: R.full, marginBottom: S.base }]}>
        {segments.map((seg, i) => (
          <View
            key={seg.label}
            style={[
              pb.segment,
              { width: `${seg.pct}%`, backgroundColor: seg.color },
              i === 0 && { borderTopLeftRadius: R.full, borderBottomLeftRadius: R.full },
              i === segments.length - 1 && { borderTopRightRadius: R.full, borderBottomRightRadius: R.full },
            ]}
          />
        ))}
      </View>

      {/* Legend */}
      <View style={{ gap: S.sm }}>
        {segments.map(seg => (
          <View key={seg.label} style={[pb.legendRow, { gap: S.sm }]}>
            <View style={[pb.dot, { backgroundColor: seg.color }]} />
            <View style={{ flex: 1 }}>
              <Text style={[pb.legendLabel, { fontSize: T.sizes.xs, color: C.textSecondary }]}>{seg.label}</Text>
              <Text style={[pb.legendVal, { fontSize: T.sizes.sm, fontWeight: T.weights.bold, color: C.textPrimary }]}>{fmt(seg.value)}</Text>
            </View>
            <Text style={[pb.legendPct, { fontSize: T.sizes.sm, fontWeight: T.weights.bold, color: seg.color }]}>{seg.pct.toFixed(1)}%</Text>
          </View>
        ))}
      </View>
    </Card>
  );
};
const pb = StyleSheet.create({
  track:      { height: 20, flexDirection: 'row', overflow: 'hidden' },
  segment:    { height: 20 },
  legendRow:  { flexDirection: 'row', alignItems: 'center' },
  dot:        { width: 12, height: 12, borderRadius: 6 },
  legendLabel:{},
  legendVal:  {},
  legendPct:  {},
});

// ── Top Spending Days ─────────────────────────────────────────────────────────

const TopDays = ({ topDays, C, T, S, R, Shadow, t }) => {
  if (topDays.length === 0) return null;
  const maxVal = topDays[0]?.total || 1;

  const formatDay = (ds) => {
    const [y, m, d] = ds.split('-').map(Number);
    return `${d} ${MONTHS[m - 1]}`;
  };

  const RANK_ICONS = ['trophy', 'medal', 'medal', 'ribbon', 'ribbon'];
  const RANK_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];

  return (
    <Card style={{ marginBottom: S.base }}>
      <SectionHdr title={t('analytics.topDays')} sub={t('analytics.top5')} C={C} T={T} S={S} />
      {topDays.map((day, idx) => {
        const pct = (day.total / maxVal) * 100;
        return (
          <View key={day.date} style={[td.row, { gap: S.sm, paddingVertical: S.xs }]}>
            <IconBadge icon={RANK_ICONS[idx] || 'ribbon'} color={RANK_COLORS[idx] || C.accents[idx % C.accents.length]} size={26} iconRatio={0.6} />
            <Text style={[td.date, { fontSize: T.sizes.xs, fontWeight: T.weights.medium, color: C.textSecondary }]}>{formatDay(day.date)}</Text>
            <View style={[td.barTrack, { backgroundColor: C.bgElevated }]}>
              <View style={[td.barFill, { width: `${pct}%`, backgroundColor: C.accents[idx % C.accents.length] }]} />
            </View>
            <Text style={[td.amt, { fontSize: T.sizes.sm, fontWeight: T.weights.bold, color: C.textPrimary }]}>{fmt(day.total)}</Text>
          </View>
        );
      })}
    </Card>
  );
};
const td = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center' },
  date:     { width: 52 },
  barTrack: { flex: 1, height: 8, borderRadius: 4, overflow: 'hidden' },
  barFill:  { height: 8, borderRadius: 4 },
  amt:      { width: 70, textAlign: 'right' },
});

// ── Main Analytics Screen ─────────────────────────────────────────────────────

export default function AnalyticsScreen() {
  const { t } = useTranslation();
  const { C, scale } = useTheme();
  const { Typography: T, Spacing: S, Radius: R } = scaleTheme(scale);
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
      <View style={[s.header, { backgroundColor: C.bgCard, borderBottomColor: C.border, paddingHorizontal: S.base, paddingTop: S.lg, paddingBottom: S.base }]}>
        <Text style={[s.headerTitle, { fontSize: T.sizes.xl, fontWeight: T.weights.bold, color: C.textPrimary }]}>{t('analytics.title')}</Text>
        <Text style={[s.headerSub, { fontSize: T.sizes.xs, color: C.textSecondary }]}>{t('analytics.subtitle')}</Text>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, { padding: S.base, paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} tintColor={C.primary} colors={[C.primary]} />}
      >
        {/* Month Selector */}
        <MonthSelector year={year} month={month} onChange={handleMonthChange} C={C} T={T} S={S} R={R} Shadow={Shadow} />

        {!hasData ? (
          <EmptyState
            icon="bar-chart-outline"
            title={`${t('analytics.noData')} ${MONTHS_FULL[month - 1]}`}
            subtitle={t('analytics.noDataSub')}
            style={{ marginTop: S.base }}
          />
        ) : (
          <>
            {/* Summary Cards */}
            <SummaryCards totals={totals} C={C} T={T} S={S} R={R} Shadow={Shadow} t={t} />

            {/* Spending Breakdown donut */}
            <SpendingDonut
              cashSpent={totals.cash_spent}
              onlineSpent={totals.online_spent}
              deposited={totals.deposited}
              C={C} T={T} S={S} R={R} Shadow={Shadow} t={t}
            />

            {/* Daily Trend */}
            <DailyTrendChart
              dailyData={dailyData}
              year={year}
              month={month}
              C={C} T={T} S={S} R={R} Shadow={Shadow} t={t}
            />

            {/* Category Breakdown */}
            <CategoryBreakdown
              catData={catData}
              totalSpent={totalSpent}
              C={C} T={T} S={S} R={R} Shadow={Shadow} t={t}
            />

            {/* Top Spending Days */}
            <TopDays topDays={topDays} C={C} T={T} S={S} R={R} Shadow={Shadow} t={t} />

            {/* Quick insight footer */}
            <View style={[s.insightCard, { gap: S.sm, padding: S.base, borderRadius: R.xl, marginTop: S.xs, backgroundColor: C.primaryDim, borderColor: C.primary + '40' }]}>
              <Ionicons name="bulb-outline" size={18} color={C.primary} />
              <Text style={[s.insightTxt, { fontSize: T.sizes.sm, fontWeight: T.weights.medium, color: C.primary }]}>
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
      </ScrollView>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, maxWidth: Platform.OS === 'web' ? 1200 : '100%', width: '100%', alignSelf: 'center' },
  header: { borderBottomWidth: 1 },
  headerTitle: {},
  headerSub:   { marginTop: 2 },
  scroll:  { flex: 1 },
  content: {},
  insightCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
  },
  insightTxt:  { flex: 1, lineHeight: 20 },
});
