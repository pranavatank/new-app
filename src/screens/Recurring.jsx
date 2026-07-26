import React, { useState, useCallback } from 'react';
import {
  View, Text, StyleSheet, ScrollView, StatusBar, Alert, Platform, TouchableOpacity,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';

import { scaleTheme } from '../constants/theme';
import { useTheme } from '../store/ThemeContext';
import {
  Card, Button, Sheet, Input, Chip, Badge, IconBadge,
  EmptyState, SectionHeader, ScreenHeader, FAB,
} from '../components/common';
import {
  getAllRecurringExpenses,
  addRecurringExpense,
  updateRecurringExpense,
  deleteRecurringExpense,
  toggleRecurringExpenseActive,
  getAllCategories,
  getAllCategoryItems,
} from '../db/queries';

const DAYS_OF_MONTH = Array.from({ length: 28 }, (_, i) => i + 1);
const WEEKDAY_KEYS  = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat'];

export default function RecurringScreen() {
  const navigation = useNavigation();
  const { C, scale } = useTheme();
  const { Typography, Spacing, Radius } = scaleTheme(scale);
  const { t } = useTranslation();

  const [rules, setRules]           = useState([]);
  const [categories, setCategories] = useState([]);
  const [items, setItems]           = useState([]);
  const [sheetOpen, setSheetOpen]   = useState(false);
  const [editingId, setEditingId]   = useState(null);

  const [categoryId, setCategoryId]   = useState(null);
  const [itemId, setItemId]           = useState(null);
  const [amount, setAmount]           = useState('');
  const [paymentType, setPaymentType] = useState('cash');
  const [note, setNote]               = useState('');
  const [frequency, setFrequency]     = useState('monthly');
  const [dayOfMonth, setDayOfMonth]   = useState(1);
  const [dayOfWeek, setDayOfWeek]     = useState(1);

  const load = useCallback(() => {
    try {
      setRules(getAllRecurringExpenses());
      setCategories(getAllCategories());
    } catch (e) {
      console.warn('Recurring load failed:', e?.message || e);
    }
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  const loadItems = (catId) => {
    if (!catId) { setItems([]); return; }
    try { setItems(getAllCategoryItems(catId)); }
    catch (_) { setItems([]); }
  };

  const resetForm = () => {
    setEditingId(null);
    setCategoryId(null);
    setItemId(null);
    setAmount('');
    setPaymentType('cash');
    setNote('');
    setFrequency('monthly');
    setDayOfMonth(1);
    setDayOfWeek(1);
    setItems([]);
  };

  const openAdd = () => { resetForm(); setSheetOpen(true); };

  const openEdit = (rule) => {
    setEditingId(rule.id);
    setCategoryId(rule.category_id);
    setItemId(rule.item_id ?? null);
    setAmount(String(rule.amount ?? ''));
    setPaymentType(rule.payment_type || 'cash');
    setNote(rule.note || '');
    setFrequency(rule.frequency === 'weekly' ? 'weekly' : 'monthly');
    setDayOfMonth(rule.day_of_month || 1);
    setDayOfWeek(rule.day_of_week ?? 1);
    loadItems(rule.category_id);
    setSheetOpen(true);
  };

  const pickCategory = (id) => {
    setCategoryId(id);
    setItemId(null);
    loadItems(id);
  };

  const handleSave = () => {
    const amt = parseFloat(amount);
    if (!categoryId)             { Alert.alert(t('recurring.title'), t('recurring.errNoCategory')); return; }
    if (!amt || amt <= 0)        { Alert.alert(t('recurring.title'), t('recurring.errNoAmount')); return; }

    const payload = {
      categoryId,
      itemId,
      amount: amt,
      paymentType,
      note: note.trim() ? note.trim() : null,
      frequency,
      dayOfMonth,
      dayOfWeek,
    };

    try {
      if (editingId) updateRecurringExpense(editingId, payload);
      else           addRecurringExpense(payload);
      setSheetOpen(false);
      resetForm();
      load();
    } catch (e) {
      Alert.alert(t('recurring.title'), String(e?.message || e));
    }
  };

  const handleDelete = (rule) => {
    Alert.alert(
      t('recurring.deleteTitle'),
      t('recurring.deleteMsg'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            try { deleteRecurringExpense(rule.id); load(); }
            catch (e) { Alert.alert(t('recurring.title'), String(e?.message || e)); }
          },
        },
      ]
    );
  };

  const handleToggle = (rule) => {
    try { toggleRecurringExpenseActive(rule.id); load(); }
    catch (e) { Alert.alert(t('recurring.title'), String(e?.message || e)); }
  };

  const freqLabel = (rule) => {
    if (rule.frequency === 'weekly') {
      return `${t('recurring.weekly')} · ${t(`recurring.weekdays.${WEEKDAY_KEYS[rule.day_of_week ?? 1]}`)}`;
    }
    return `${t('recurring.monthly')} · ${t('recurring.dayN', { day: rule.day_of_month })}`;
  };

  const activeRules = rules.filter(r => r.is_active === 1);
  const pausedRules = rules.filter(r => r.is_active !== 1);

  const renderRule = (rule) => {
    const paused  = rule.is_active !== 1;
    const isPhoto = rule.category_icon_type === 'photo';
    return (
      <Card key={rule.id} style={{ marginTop: Spacing.sm, opacity: paused ? 0.55 : 1 }}>
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => openEdit(rule)}
          style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md }}
        >
          <IconBadge
            emoji={isPhoto ? undefined : rule.category_icon}
            photoUri={isPhoto ? rule.category_icon : undefined}
            color={C.iconExpense}
            size={44}
          />
          <View style={{ flex: 1 }}>
            <Text
              numberOfLines={1}
              style={{ fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold, color: C.textPrimary }}
            >
              {rule.item_name ? `${rule.category_name} · ${rule.item_name}` : rule.category_name}
            </Text>
            <Text
              numberOfLines={1}
              style={{ fontSize: Typography.sizes.xs, color: C.textSecondary, marginTop: 2 }}
            >
              {freqLabel(rule)}
            </Text>
            <Text
              numberOfLines={1}
              style={{ fontSize: Typography.sizes.xs, color: C.textMuted, marginTop: 2 }}
            >
              {t('recurring.nextDue')}: {rule.next_due_date}
            </Text>
          </View>
          <View style={{ alignItems: 'flex-end', gap: 4 }}>
            <Text style={{ fontSize: Typography.sizes.lg, fontWeight: Typography.weights.black, color: C.expense }}>
              ₹{rule.amount}
            </Text>
            <Badge
              label={rule.payment_type === 'online' ? t('recurring.online') : t('recurring.cash')}
              color={rule.payment_type === 'online' ? C.online : C.income}
            />
          </View>
        </TouchableOpacity>

        <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.md }}>
          <Button
            variant="ghost"
            size="sm"
            icon={paused ? 'play' : 'pause'}
            label={paused ? t('recurring.resume') : t('recurring.pause')}
            onPress={() => handleToggle(rule)}
            style={{ flex: 1 }}
          />
          <Button
            variant="ghost"
            size="sm"
            icon="trash-outline"
            label={t('common.delete')}
            onPress={() => handleDelete(rule)}
            style={{ flex: 1 }}
          />
        </View>
      </Card>
    );
  };

  return (
    <View style={[s.root, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={C.isDark ? 'light-content' : 'dark-content'} backgroundColor={C.bgCard} />

      <ScreenHeader
        title={t('recurring.title')}
        subtitle={t('recurring.subtitle')}
        onBack={() => navigation.goBack()}
      />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={{ padding: Spacing.base, paddingBottom: 140 }}
        showsVerticalScrollIndicator={false}
      >
        {rules.length === 0 ? (
          <EmptyState
            icon="repeat-outline"
            title={t('recurring.emptyTitle')}
            subtitle={t('recurring.emptySubtitle')}
            style={{ marginTop: Spacing.xxl }}
          />
        ) : (
          <>
            {activeRules.length > 0 && (
              <>
                <SectionHeader
                  title={t('recurring.activeSection')}
                  icon="repeat"
                  color={C.income}
                  badge={String(activeRules.length)}
                  style={{ marginTop: Spacing.sm }}
                />
                {activeRules.map(renderRule)}
              </>
            )}
            {pausedRules.length > 0 && (
              <>
                <SectionHeader
                  title={t('recurring.pausedSection')}
                  icon="pause-circle"
                  color={C.textMuted}
                  badge={String(pausedRules.length)}
                  style={{ marginTop: Spacing.xl }}
                />
                {pausedRules.map(renderRule)}
              </>
            )}
          </>
        )}
      </ScrollView>

      <FAB icon="add" onPress={openAdd} />

      <Sheet
        visible={sheetOpen}
        onClose={() => { setSheetOpen(false); resetForm(); }}
        title={editingId ? t('recurring.editTitle') : t('recurring.addTitle')}
        scroll
      >
        <Text style={[s.lbl, { color: C.textSecondary, fontSize: Typography.sizes.xs }]}>
          {t('recurring.category')}
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs }}>
          {categories.map(cat => (
            <Chip
              key={cat.id}
              label={cat.name}
              emoji={cat.icon_type === 'photo' ? undefined : cat.icon}
              color={C.iconExpense}
              active={categoryId === cat.id}
              onPress={() => pickCategory(cat.id)}
            />
          ))}
        </View>

        {categoryId && items.length > 0 && (
          <>
            <Text style={[s.lbl, { color: C.textSecondary, fontSize: Typography.sizes.xs, marginTop: Spacing.base }]}>
              {t('recurring.item')}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs }}>
              <Chip
                label={t('recurring.noItem')}
                color={C.textMuted}
                active={itemId === null}
                onPress={() => setItemId(null)}
              />
              {items.map(it => (
                <Chip
                  key={it.id}
                  label={it.name}
                  emoji={it.icon_type === 'photo' ? undefined : it.icon}
                  color={C.iconExpense}
                  active={itemId === it.id}
                  onPress={() => setItemId(it.id)}
                />
              ))}
            </View>
          </>
        )}

        <Input
          label={t('recurring.amount')}
          value={amount}
          onChangeText={setAmount}
          keyboardType="numeric"
          placeholder="0"
          placeholderTextColor={C.textMuted}
          style={{ marginTop: Spacing.base }}
        />

        <Text style={[s.lbl, { color: C.textSecondary, fontSize: Typography.sizes.xs, marginTop: Spacing.base }]}>
          {t('recurring.paymentType')}
        </Text>
        <View style={{ flexDirection: 'row', gap: Spacing.xs }}>
          <Chip
            label={t('recurring.cash')}
            icon="cash-outline"
            color={C.income}
            active={paymentType === 'cash'}
            onPress={() => setPaymentType('cash')}
          />
          <Chip
            label={t('recurring.online')}
            icon="card-outline"
            color={C.online}
            active={paymentType === 'online'}
            onPress={() => setPaymentType('online')}
          />
        </View>

        <Text style={[s.lbl, { color: C.textSecondary, fontSize: Typography.sizes.xs, marginTop: Spacing.base }]}>
          {t('recurring.frequency')}
        </Text>
        <View style={{ flexDirection: 'row', gap: Spacing.xs }}>
          <Chip
            label={t('recurring.monthly')}
            icon="calendar-outline"
            color={C.primary}
            active={frequency === 'monthly'}
            onPress={() => setFrequency('monthly')}
          />
          <Chip
            label={t('recurring.weekly')}
            icon="calendar-number-outline"
            color={C.primary}
            active={frequency === 'weekly'}
            onPress={() => setFrequency('weekly')}
          />
        </View>

        {frequency === 'monthly' ? (
          <>
            <Text style={[s.lbl, { color: C.textSecondary, fontSize: Typography.sizes.xs, marginTop: Spacing.base }]}>
              {t('recurring.dayOfMonth')}
            </Text>
            <Text style={{ fontSize: Typography.sizes.xs, color: C.textMuted, marginBottom: Spacing.xs }}>
              {t('recurring.dayOfMonthHint')}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs }}>
              {DAYS_OF_MONTH.map(d => {
                const active = dayOfMonth === d;
                return (
                  <TouchableOpacity
                    key={d}
                    onPress={() => setDayOfMonth(d)}
                    activeOpacity={0.8}
                    style={{
                      width: 40, height: 40, borderRadius: Radius.md,
                      alignItems: 'center', justifyContent: 'center',
                      borderWidth: 1.5,
                      borderColor: active ? C.primary : C.border,
                      backgroundColor: active ? C.primaryDim : 'transparent',
                    }}
                  >
                    <Text style={{
                      fontSize: Typography.sizes.sm,
                      fontWeight: Typography.weights.bold,
                      color: active ? C.primary : C.textPrimary,
                    }}>{d}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </>
        ) : (
          <>
            <Text style={[s.lbl, { color: C.textSecondary, fontSize: Typography.sizes.xs, marginTop: Spacing.base }]}>
              {t('recurring.dayOfWeek')}
            </Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs }}>
              {WEEKDAY_KEYS.map((key, idx) => (
                <Chip
                  key={key}
                  label={t(`recurring.weekdays.${key}`)}
                  color={C.primary}
                  active={dayOfWeek === idx}
                  onPress={() => setDayOfWeek(idx)}
                />
              ))}
            </View>
          </>
        )}

        <Input
          label={t('recurring.note')}
          value={note}
          onChangeText={setNote}
          placeholder={t('recurring.notePlaceholder')}
          placeholderTextColor={C.textMuted}
          style={{ marginTop: Spacing.base }}
        />

        <View style={{ flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg }}>
          <Button
            variant="ghost"
            label={t('common.cancel')}
            onPress={() => { setSheetOpen(false); resetForm(); }}
            style={{ flex: 1 }}
          />
          <Button
            variant="primary"
            label={t('common.save')}
            onPress={handleSave}
            style={{ flex: 1 }}
          />
        </View>
      </Sheet>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, maxWidth: Platform.OS === 'web' ? 1200 : '100%', width: '100%', alignSelf: 'center' },
  scroll: { flex: 1 },
  lbl:    { fontWeight: '700', marginBottom: 6, letterSpacing: 0.5, textTransform: 'uppercase' },
});
