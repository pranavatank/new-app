import React, { useCallback, useEffect, useState } from 'react';
import { Alert, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { scaleTheme } from '../constants/theme';
import { useTheme } from '../store/ThemeContext';
import { Card, Button, IconBadge, ActionTile, SectionHeader } from './common';
import { getDayOverview } from '../db/dayOverview';
import { completeTask } from '../db/queries';
import { translateCategoryName } from '../constants/defaultCategories';

const emptyData = () => ({
  tasks: [], expenses: [], places: [], notes: [], fuel: [], error: false,
  vehicleStats: { totalAvg: 0, last10Avg: 0, totalDistance: 0 },
});
const numberLocale = language => language === 'gu' ? 'gu-IN-u-nu-latn' : 'en-IN';
const money = (amount, language) => '\u20B9' + new Intl.NumberFormat(numberLocale(language), { maximumFractionDigits: 2 }).format(Number(amount || 0));

export default function DayOverview({ date, navigation, refreshKey }) {
  const { t, i18n } = useTranslation();
  const { C, scale, showMileage } = useTheme();
  const { Spacing, Radius, Typography } = scaleTheme(scale);
  const [data, setData] = useState(emptyData);
  const load = useCallback(() => {
    try { setData(getDayOverview(date)); }
    catch (error) {
      console.error('DayOverview load failed', error);
      setData({ ...emptyData(), error: true });
    }
  }, [date]);
  useEffect(() => { load(); }, [load, refreshKey]);
  useFocusEffect(useCallback(() => { load(); }, [load]));

  const complete = id => {
    try { completeTask(id); load(); }
    catch (_) { Alert.alert(t('ledger.error')); }
  };
  const pendingCount = data.tasks.filter(task => task.status === 'pending').length;
  const topCategories = data.expenses.filter(row => Number(row.total) > 0)
    .sort((a, b) => b.total - a.total).slice(0, 5);
  const nav = screen => navigation.navigate(screen);
  const addFuel = () => navigation.navigate('Vehicle', { addDate: date });

  if (data.error) {
    return <Text accessibilityRole="alert" style={{ color: C.expense }}>{t('ledger.overview_load_error')}</Text>;
  }

  return <View style={{ gap: Spacing.md }}>
    {topCategories.length > 0 && <Card padding="md" elevation="none" style={{ borderWidth: 0 }}>
      <SectionHeader icon="cart" color={C.iconExpense} title={t('expense.expensesByCategory')} onSeeAll={() => nav('Expense')} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
        {topCategories.map((category, index) => {
          const color = C.accents[index % C.accents.length];
          return <TouchableOpacity key={category.category_id} onPress={() => nav('Expense')} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, maxWidth: '100%', paddingVertical: Spacing.xs, paddingHorizontal: Spacing.sm, borderRadius: Radius.full, backgroundColor: color + '1A', borderWidth: 1, borderColor: color + '33' }}>
            <IconBadge photoUri={category.icon_type === 'image' ? category.icon : undefined} emoji={category.icon_type !== 'image' ? (category.icon || '\uD83D\uDCE6') : undefined} size={22} color={color} />
            <Text style={{ flexShrink: 1, color: C.textPrimary, fontSize: Typography.sizes.xs, fontWeight: Typography.weights.bold }}>{translateCategoryName(category.name, t)} · {money(category.total, i18n.language)}</Text>
          </TouchableOpacity>;
        })}
      </View>
    </Card>}

    {data.tasks.length > 0 && <Card>
      <SectionHeader icon="checkmark-circle" color={C.iconTask} title={t('home.tasks')} badge={pendingCount || undefined} onSeeAll={() => nav('Tasks')} />
      {data.tasks.slice(0, 3).map(task => {
        const done = task.status === 'completed';
        return <View key={task.id} style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.md, paddingVertical: Spacing.xs }}>
          <TouchableOpacity onPress={() => complete(task.id)} disabled={done} style={{ width: 44, height: 44, alignItems: 'center', justifyContent: 'center' }}>
            <View style={{ width: 24, height: 24, borderRadius: 12, borderWidth: 2, borderColor: done ? C.income : C.iconTask, backgroundColor: done ? C.income : C.transparent, alignItems: 'center', justifyContent: 'center' }}>{done && <Ionicons name="checkmark" size={14} color={C.textOnPrimary} />}</View>
          </TouchableOpacity>
          <View style={{ flex: 1 }}>
            <Text style={{ fontSize: Typography.sizes.base, fontWeight: Typography.weights.semibold, color: done ? C.textMuted : C.textPrimary, textDecorationLine: done ? 'line-through' : 'none' }}>{task.title}</Text>
            <Text style={{ fontSize: Typography.sizes.xs, color: C.textSecondary, marginTop: 3 }}>{t('common.from')} {task.start_date}</Text>
          </View>
        </View>;
      })}
      {data.tasks.length > 3 && <Button variant="ghost" size="sm" label={`+${data.tasks.length - 3}`} onPress={() => nav('Tasks')} />}
    </Card>}

    {data.places.length > 0 && <Card>
      <SectionHeader icon="location" color={C.iconPlaces} title={t('home.visitedPlaces')} badge={data.places.length || undefined} onSeeAll={() => nav('Places')} />
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
        {data.places.map(place => <View key={place.id} style={{ flexDirection: 'row', alignItems: 'center', gap: 6, maxWidth: '100%', borderRadius: Radius.full, paddingHorizontal: Spacing.md, paddingVertical: 7, borderWidth: 1, borderColor: C.border, backgroundColor: C.bgElevated }}>
          <IconBadge photoUri={place.icon_type === 'image' ? place.icon : undefined} emoji={place.icon_type !== 'image' ? (place.icon || '\uD83D\uDCCD') : undefined} size={22} color={C.iconPlaces} />
          <Text style={{ flexShrink: 1, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold, color: C.textPrimary }}>{place.name}</Text>
        </View>)}
      </View>
    </Card>}

    {data.notes.length > 0 && <Card>
      <SectionHeader icon="document-text" color={C.iconNotes} title={t('home.notes')} badge={data.notes.length || undefined} onSeeAll={() => nav('Notes')} />
      {data.notes.slice(0, 2).map(note => <View key={note.id} style={{ flexDirection: 'row', alignItems: 'flex-start', gap: Spacing.md, paddingVertical: Spacing.sm }}>
        <View style={{ width: 6, height: 6, borderRadius: 3, marginTop: 8, backgroundColor: C.iconNotes }} />
        <Text style={{ flex: 1, fontSize: Typography.sizes.base, lineHeight: 22, color: C.textSecondary }} numberOfLines={2}>{note.text}</Text>
      </View>)}
    </Card>}

    {showMileage && data.fuel.length > 0 && (
      <Card>
        <SectionHeader icon="water" color={C.online} title={`${t('ledger.overview_daily_fuel')} · ${date}`} onSeeAll={() => nav('Vehicle')} />
        {data.fuel.map(record => <View key={record.id} style={{ flexDirection: 'row', justifyContent: 'space-between', paddingVertical: Spacing.sm }}>
          <Text style={{ color: C.textSecondary }}>{Number(record.liters || 0).toLocaleString(numberLocale(i18n.language))} L · {Number(record.reading || 0).toLocaleString(numberLocale(i18n.language))} km</Text>
          <Text style={{ color: C.textPrimary, fontWeight: Typography.weights.bold }}>{money(record.amount, i18n.language)}</Text>
        </View>)}
        <Button variant="ghost" size="sm" icon="add" label={t('ledger.add_fuel')} onPress={addFuel} style={{ marginTop: Spacing.sm, alignSelf: 'center' }} />
      </Card>
    )}
    {showMileage && data.vehicleStats.totalDistance > 0 && (
      <Card>
        <SectionHeader mciIcon="motorbike" color={C.primary} title={t('ledger.overview_mileage_all_time')} onSeeAll={() => nav('Vehicle')} />
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', gap: Spacing.md }}>
          {[[t('ledger.overview_average'), `${data.vehicleStats.totalAvg.toFixed(2)} km/L`], [t('ledger.overview_last_10'), data.vehicleStats.last10Avg.toFixed(2)], [t('ledger.overview_total_km'), Number(data.vehicleStats.totalDistance).toLocaleString(numberLocale(i18n.language))]].map(([label, value]) => <View key={label} style={{ flex: 1, alignItems: 'center' }}>
            <Text style={{ fontSize: Typography.sizes.xs, color: C.textSecondary }}>{label}</Text>
            <Text style={{ fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, color: C.primary }}>{value}</Text>
          </View>)}
        </View>
      </Card>
    )}
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm }}>
      {[
        ['Tasks', t('home.addTask'), 'checkbox-outline', C.iconTask, C.onlineBg],
        ['Places', t('home.addPlace'), 'location-outline', C.iconPlaces, C.skyBg],
        ['Purchases', t('purchases.addTitle'), 'bag-handle-outline', C.warning, C.sandBg],
        ['Notes', t('home.addNote'), 'document-text-outline', C.iconNotes, C.expenseBg],
      ].map(([screen, label, icon, color, background]) => (
        <ActionTile key={screen} label={label} icon={icon} color={color} background={background} style={{ flexBasis: '44%' }}
          onPress={() => navigation.navigate(screen, { autoAdd: true, ...(screen === 'Purchases' ? { addDate: date } : {}) })} />
      ))}
    </View>
    {showMileage && !data.fuel.length && <Button variant="ghost" size="sm" icon="add"
      label={t('ledger.add_fuel')} onPress={addFuel} />}
  </View>;
}
