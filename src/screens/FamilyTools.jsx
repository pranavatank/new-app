import React from 'react';
import { ScrollView, StatusBar, Text, View } from 'react-native';
import { useTranslation } from 'react-i18next';
import { Card, Row, ScreenHeader } from '../components/common';
import { Layout, scaleTheme } from '../constants/theme';
import { useTheme } from '../store/ThemeContext';

const groups = [
  ['everyday', [
    ['Tasks', 'tasks', 'checkbox-outline', 'iconTask'],
    ['Places', 'places', 'location-outline', 'iconPlaces'],
    ['Purchases', 'purchases', 'bag-handle-outline', 'iconExpense'],
  ]],
  ['money', [
    ['Expense', 'expense', 'cart-outline', 'iconExpense'],
    ['ExpenseItems', 'expenseItems', 'pricetag-outline', 'iconExpense'],
    ['Recurring', 'recurring', 'repeat-outline', 'iconBalance'],
    ['Analytics', 'analytics', 'bar-chart-outline', 'iconStats'],
    ['Vehicle', 'vehicle', 'speedometer-outline', 'iconPlaces'],
  ]],
  ['app', [
    ['Search', 'search', 'search-outline', 'iconHome'],
    ['Settings', 'settings', 'settings-outline', 'iconSettings'],
  ]],
];

export default function FamilyTools({ navigation }) {
  const { C, scale } = useTheme();
  const { Spacing, Typography } = scaleTheme(scale);
  const { t } = useTranslation();

  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle={C.isDark ? 'light-content' : 'dark-content'} backgroundColor={C.bgCard} />
      <ScreenHeader title={t('ledger.family_tools')} />
      <ScrollView contentContainerStyle={{ width: '100%', maxWidth: Layout.contentWidth, alignSelf: 'center', padding: Spacing.base, paddingBottom: Spacing.xl, gap: Spacing.lg }}>
        {groups.map(([group, links]) => (
          <View key={group} style={{ gap: Spacing.sm }}>
            <Text accessibilityRole="header" style={{ color: C.textPrimary, fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold }}>
              {t('ledger.tools_' + group)}
            </Text>
            <Card padding="none">
              {links.map(([route, label, icon, accent], index) => (
                <Row key={route} icon={icon} iconColor={C[accent]} label={t('ledger.tool_' + label)}
                  onPress={() => navigation.navigate(route)}
                  style={{ paddingHorizontal: Spacing.lg, borderTopWidth: index ? 1 : 0, borderTopColor: C.divider }} />
              ))}
            </Card>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}
