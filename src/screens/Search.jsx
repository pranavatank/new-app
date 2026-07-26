import React, { useEffect, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  StatusBar, ActivityIndicator, Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { scaleTheme } from '../constants/theme';
import { useTheme } from '../store/ThemeContext';
import useAppStore from '../store/useAppStore';
import { translateCategoryName } from '../constants/defaultCategories';
import {
  Card, Input, Chip, Badge, Row, IconBadge, EmptyState, SectionHeader, ScreenHeader,
} from '../components/common';
import {
  searchExpenses, searchNotes, searchTasks, getAllCategories, SEARCH_MIN_QUERY_LENGTH,
} from '../db/queries';

const SEARCH_DEBOUNCE_MS = 280;
const EMPTY_RESULTS = { expenses: [], notes: [], tasks: [] };
const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const fmtAmount = (n) => '₹' + Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 });

const fmtDate = (ds) => {
  if (!ds) return '';
  const [y, m, d] = ds.split('-').map(Number);
  if (!y || !m || !d) return ds;
  return `${d} ${MONTHS_SHORT[m - 1]} ${y}`;
};

export default function SearchScreen({ navigation }) {
  const { t } = useTranslation();
  const { C, scale } = useTheme();
  const { Spacing } = scaleTheme(scale);
  const st = styles(scale);
  const setSelectedDate = useAppStore((s) => s.setSelectedDate);

  const [query,       setQuery]       = useState('');
  const [results,     setResults]     = useState(EMPTY_RESULTS);
  const [searching,   setSearching]   = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    const q = query.trim();
    if (q.length < SEARCH_MIN_QUERY_LENGTH) {
      setResults(EMPTY_RESULTS);
      setSearching(false);
      setHasSearched(false);
      return;
    }
    setSearching(true);
    const handle = setTimeout(() => {
      try {
        const qLower = q.toLowerCase();
        const matchedCategoryIds = getAllCategories()
          .filter((cat) => translateCategoryName(cat.name, t).toLowerCase().includes(qLower))
          .map((cat) => cat.id);
        setResults({
          expenses: searchExpenses(q, undefined, matchedCategoryIds),
          notes:    searchNotes(q),
          tasks:    searchTasks(q),
        });
      } catch (e) {
        console.error('search error:', e);
        setResults(EMPTY_RESULTS);
      } finally {
        setSearching(false);
        setHasSearched(true);
      }
    }, SEARCH_DEBOUNCE_MS);
    return () => clearTimeout(handle);
  }, [query]);

  useFocusEffect(
    React.useCallback(() => {
      return () => {
        setQuery('');
        setResults(EMPTY_RESULTS);
        setHasSearched(false);
      };
    }, [])
  );

  const openDay = (date, screen) => {
    if (date) setSelectedDate(date);
    navigation.navigate(screen);
  };

  const total = results.expenses.length + results.notes.length + results.tasks.length;
  const q = query.trim();
  const tooShort = q.length < SEARCH_MIN_QUERY_LENGTH;

  return (
    <View style={[st.root, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={C.isDark ? 'light-content' : 'dark-content'} backgroundColor={C.bgCard} />

      <ScreenHeader
        title={t('search.title')}
        subtitle={t('search.subtitle')}
        onBack={() => navigation.goBack()}
      />

      <View style={[st.searchRow, { backgroundColor: C.bgCard, borderBottomColor: C.border }]}>
        <Ionicons name="search" size={20} color={C.primary} style={{ marginRight: Spacing.sm }} />
        <Input
          style={{ flex: 1 }}
          value={query}
          onChangeText={setQuery}
          placeholder={t('search.placeholder')}
          autoFocus
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          maxLength={80}
        />
        {query.length > 0 && (
          <TouchableOpacity
            onPress={() => setQuery('')}
            style={st.clearBtn}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            accessibilityLabel={t('search.clear')}
          >
            <Ionicons name="close-circle" size={22} color={C.textMuted} />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView
        style={st.scroll}
        contentContainerStyle={st.content}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        {tooShort ? (
          <EmptyState
            icon="search-outline"
            title={t('search.prompt')}
            subtitle={q.length === 0 ? t('search.promptSub') : t('search.minChars')}
          />
        ) : searching ? (
          <View style={st.loadingBox}>
            <ActivityIndicator size="small" color={C.primary} />
            <Text style={[st.loadingTxt, { color: C.textSecondary }]}>{t('search.searching')}</Text>
          </View>
        ) : hasSearched && total === 0 ? (
          <EmptyState
            icon="alert-circle-outline"
            title={t('search.noResults')}
            subtitle={t('search.noResultsSub')}
          />
        ) : (
          <>
            {results.expenses.length > 0 && (
              <Card style={st.group}>
                <SectionHeader
                  icon="wallet"
                  color={C.iconExpense}
                  title={t('search.expenses')}
                  badge={results.expenses.length}
                />
                {results.expenses.map((r) => {
                  const useItemIcon = !!r.item_name;
                  const rawIcon     = useItemIcon ? r.item_icon      : r.category_icon;
                  const rawIconType = useItemIcon ? r.item_icon_type : r.category_icon_type;
                  const label = r.item_name
                    ? `${translateCategoryName(r.category_name, t)} · ${r.item_name}`
                    : translateCategoryName(r.category_name, t);
                  return (
                    <TouchableOpacity
                      key={`exp-${r.id}`}
                      activeOpacity={0.7}
                      onPress={() => openDay(r.date, 'Expense')}
                      style={[st.resultRow, { borderBottomColor: C.divider }]}
                    >
                      <IconBadge
                        photoUri={rawIconType === 'image' ? rawIcon : undefined}
                        emoji={rawIconType !== 'image' ? (rawIcon || '💰') : undefined}
                        size={38}
                        color={C.iconExpense}
                        style={{ marginRight: Spacing.md }}
                      />
                      <View style={{ flex: 1 }}>
                        <Text numberOfLines={1} style={[st.rowTitle, { color: C.textPrimary }]}>{label}</Text>
                        <Text numberOfLines={1} style={[st.rowSub, { color: C.textMuted }]}>
                          {fmtDate(r.date)}{r.note ? ` · ${r.note}` : ''}
                        </Text>
                      </View>
                      <View style={{ alignItems: 'flex-end', gap: 4 }}>
                        <Text style={[st.amount, { color: C.expense }]}>{fmtAmount(r.amount)}</Text>
                        <Chip
                          label={r.payment_type === 'online' ? t('expense.onlineLabel') : t('expense.cash')}
                          color={r.payment_type === 'online' ? C.online : C.income}
                        />
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </Card>
            )}

            {results.notes.length > 0 && (
              <Card style={st.group}>
                <SectionHeader
                  icon="document-text"
                  color={C.iconNotes}
                  title={t('search.notes')}
                  badge={results.notes.length}
                />
                {results.notes.map((n) => (
                  <TouchableOpacity
                    key={`note-${n.id}`}
                    activeOpacity={0.7}
                    onPress={() => openDay(n.date, 'Notes')}
                    style={[st.resultRow, { borderBottomColor: C.divider }]}
                  >
                    <IconBadge icon="reader-outline" size={38} color={C.iconNotes} style={{ marginRight: Spacing.md }} />
                    <View style={{ flex: 1 }}>
                      <Text numberOfLines={2} style={[st.rowTitle, { color: C.textPrimary }]}>{n.text}</Text>
                      <Text numberOfLines={1} style={[st.rowSub, { color: C.textMuted }]}>{fmtDate(n.date)}</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={18} color={C.textMuted} />
                  </TouchableOpacity>
                ))}
              </Card>
            )}

            {results.tasks.length > 0 && (
              <Card style={st.group}>
                <SectionHeader
                  icon="checkmark-circle"
                  color={C.iconTask}
                  title={t('search.tasks')}
                  badge={results.tasks.length}
                />
                {results.tasks.map((tk) => {
                  const done = tk.status === 'completed';
                  return (
                    <Row
                      key={`task-${tk.id}`}
                      icon={done ? 'checkmark-circle' : 'ellipse-outline'}
                      iconColor={done ? C.income : C.iconTask}
                      label={tk.title}
                      subtitle={fmtDate(tk.start_date)}
                      onPress={() => openDay(tk.start_date, 'Tasks')}
                      right={
                        <Badge
                          label={done ? t('tasks.completed') : t('tasks.pending')}
                          color={done ? C.income : C.iconTask}
                        />
                      }
                      style={{ borderBottomWidth: 1, borderBottomColor: C.divider }}
                    />
                  );
                })}
              </Card>
            )}
          </>
        )}

        <View style={{ height: 100 }} />
      </ScrollView>
    </View>
  );
}

const styles = (scale) => {
  const { Typography, Spacing } = scaleTheme(scale);
  return StyleSheet.create({
    root:       { flex: 1, maxWidth: Platform.OS === 'web' ? 1200 : '100%', width: '100%', alignSelf: 'center' },
    searchRow:  { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, borderBottomWidth: 1 },
    clearBtn:   { marginLeft: Spacing.sm, padding: 2 },
    scroll:     { flex: 1 },
    content:    { padding: Spacing.base },
    group:      { marginBottom: Spacing.base },
    resultRow:  { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.md, borderBottomWidth: 1 },
    rowTitle:   { fontSize: Typography.sizes.base, fontWeight: Typography.weights.semibold },
    rowSub:     { fontSize: Typography.sizes.xs, marginTop: 2 },
    amount:     { fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold },
    loadingBox: { alignItems: 'center', justifyContent: 'center', paddingVertical: Spacing.xxl, gap: Spacing.sm },
    loadingTxt: { fontSize: Typography.sizes.sm, marginTop: Spacing.sm },
  });
};
