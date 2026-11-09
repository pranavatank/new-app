import React from 'react';
import { View, Text, ScrollView, TouchableOpacity, StatusBar } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import ScreenHeader from '../components/common/ScreenHeader';
import useLedgerTheme from '../components/ledger/useLedgerTheme';

const LINKS = [
  ['Home', 'home', 'home-outline'], ['Expense', 'expense', 'cart-outline'], ['Notes', 'notes', 'document-text-outline'],
  ['Tasks', 'tasks', 'checkbox-outline'], ['Places', 'places', 'location-outline'], ['Analytics', 'analytics', 'bar-chart-outline'],
  ['Settings', 'settings', 'settings-outline'], ['Search', 'search', 'search-outline'], ['Recurring', 'recurring', 'repeat-outline'],
  ['ExpenseItems', 'expenseItems', 'pricetag-outline'], ['Vehicle', 'vehicle', 'speedometer-outline'], ['Purchases', 'purchases', 'bag-handle-outline'],
];

export default function FamilyTools({ navigation }) {
  const { C } = useLedgerTheme();
  const { t } = useTranslation();
  return <View style={{ flex: 1, backgroundColor: C.bg }}>
    <StatusBar barStyle={C.isDark ? 'light-content' : 'dark-content'} backgroundColor={C.bgCard} />
    <ScreenHeader title={t('ledger.family_tools')} onBack={() => navigation.goBack()} />
    <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 32 }}>
      <Text style={{ color: C.textSecondary, fontSize: 15, lineHeight: 22, marginBottom: 16 }}>{t('ledger.tools_hint')}</Text>
      {LINKS.map(([route, label, icon]) => <TouchableOpacity key={route} onPress={() => navigation.navigate(route)} activeOpacity={0.75} style={{ minHeight: 60, flexDirection: 'row', alignItems: 'center', gap: 13, backgroundColor: C.bgCard, borderWidth: 1, borderColor: C.border, borderRadius: 16, paddingHorizontal: 15, marginBottom: 9 }}>
        <View style={{ width: 38, height: 38, borderRadius: 13, backgroundColor: C.primaryDim, alignItems: 'center', justifyContent: 'center' }}><Ionicons name={icon} size={20} color={C.primary} /></View>
        <Text style={{ flex: 1, color: C.textPrimary, fontSize: 16, fontWeight: '700' }}>{t(`ledger.tool_${label}`)}</Text><Ionicons name="chevron-forward" size={18} color={C.textMuted} />
      </TouchableOpacity>)}
    </ScrollView>
  </View>;
}
