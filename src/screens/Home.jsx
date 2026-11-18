import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, StatusBar, RefreshControl, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { scaleTheme, makeShadow } from '../constants/theme';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import DayOverview from '../components/DayOverview';
import { useTheme } from '../store/ThemeContext';
import DayNavigator from '../components/DayNavigator';
import useAppStore from '../store/useAppStore';

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
    lbl:    { fontSize: Typography.sizes.caption, color: C.gradientMuted, letterSpacing: 2, fontWeight: Typography.weights.bold, marginBottom: 6 },
    bal:    { fontSize: Typography.sizes.hero, fontWeight: Typography.weights.black, letterSpacing: -1.5 },
    circle: { width: 56, height: 56, borderRadius: 28, backgroundColor: C.gradientSubtle, alignItems: 'center', justifyContent: 'center' },
    hr:     { height: 1, backgroundColor: C.gradientBorder, marginVertical: Spacing.lg },
    row:    { flexDirection: 'row', alignItems: 'center' },
    col:    { flex: 1, alignItems: 'center' },
    colLbl: { fontSize: Typography.sizes.caption, color: C.gradientMuted, fontWeight: Typography.weights.semibold, letterSpacing: 0.5, marginBottom: 4 },
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

// ── Main HomeScreen ───────────────────────────────────────────────────────────

export default function HomeScreen({ navigation }) {
  const { t } = useTranslation();
  const { C, scale } = useTheme();
  const { Typography, Spacing } = scaleTheme(scale);
  const { selectedDate, dayData, refreshDayData } = useAppStore();

  const [refreshing, setRefreshing] = useState(false);

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


  const s = sStyles(Typography, Spacing);

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
          <Text style={{ flex: 1, color: C.textMuted, fontSize: Typography.sizes.base }} numberOfLines={1}>
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

        <DayOverview date={selectedDate} navigation={navigation} refreshKey={dayData} />

      </ScrollView>

    </View>
  );
}

const sStyles = (Typography, Spacing) => StyleSheet.create({
  root:    { flex: 1, maxWidth: Platform.OS === 'web' ? 1200 : '100%', width: '100%', alignSelf: 'center' },
  scroll:  { flex: 1 },
  content: { padding: Spacing.lg },

  secLblRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: Spacing.md, marginLeft: 2 },
  secLbl: { fontSize: Typography.sizes.xs, fontWeight: Typography.weights.bold, letterSpacing: 1.5 },

});
