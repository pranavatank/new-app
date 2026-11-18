import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { Layout, makeShadow, scaleTheme } from '../constants/theme';
import { useTheme } from '../store/ThemeContext';

const tabs = [
  { name: 'DailyBook', label: 'ledger.nav_today', icon: 'today', accent: 'iconHome' },
  { name: 'MonthlyLedger', label: 'ledger.nav_month', icon: 'book', accent: 'iconStats' },
  { name: 'Notes', label: 'ledger.nav_notes', icon: 'document-text', accent: 'iconNotes' },
  { name: 'FamilyTools', label: 'ledger.nav_tools', icon: 'grid', accent: 'iconPlaces' },
];

export default function AppTabBar({ state, navigation }) {
  const { C, scale } = useTheme();
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const { Typography, Spacing, Radius } = scaleTheme(scale);
  const selected = state.routes[state.index]?.name;
  const section = tabs.some(tab => tab.name === selected) ? selected : 'FamilyTools';

  return (
    <View style={[styles.wrap, {
      backgroundColor: C.bg,
      paddingTop: Spacing.xs,
      paddingBottom: insets.bottom + Spacing.sm,
      paddingLeft: insets.left + Spacing.md,
      paddingRight: insets.right + Spacing.md,
    }]}>
      <View accessibilityRole="tablist" style={[styles.bar, makeShadow(C).md, {
        backgroundColor: C.bgCard, borderColor: C.border, borderRadius: Radius.full,
        padding: Spacing.xs, gap: Spacing.xs,
      }]}>
        {tabs.map(tab => {
          const route = state.routes.find(route => route.name === tab.name);
          const focused = selected === tab.name;
          const highlighted = section === tab.name;
          const accent = C[tab.accent];
          const label = t(tab.label);
          const iconStyle = [styles.icon, { borderRadius: Radius.full, paddingHorizontal: Spacing.md }];

          const open = () => {
            const event = navigation.emit({ type: 'tabPress', target: route.key, canPreventDefault: true });
            if (!focused && !event.defaultPrevented) navigation.navigate(tab.name);
          };

          return (
            <Pressable key={route.key} accessibilityRole="tab" accessibilityLabel={label}
              accessibilityState={{ selected: focused }} onPress={open}
              onLongPress={() => navigation.emit({ type: 'tabLongPress', target: route.key })}
              style={({ pressed }) => [styles.item, {
                borderRadius: Radius.xl, paddingVertical: Spacing.xs, gap: Spacing.xs,
                backgroundColor: pressed ? C.bgElevated : C.bgCard,
              }]}>
              {highlighted ? (
                <LinearGradient colors={[accent, C.navAccentEnd]} start={{ x: 0, y: 0 }} end={{ x: 1, y: 1 }}
                  style={[iconStyle, { backgroundColor: accent }]}>
                  <Ionicons name={tab.icon} size={22} color={C.textOnPrimary} />
                </LinearGradient>
              ) : (
                <View style={iconStyle}>
                  <Ionicons name={tab.icon + '-outline'} size={22} color={C.textSecondary} />
                </View>
              )}
              <Text style={[styles.label, {
                color: highlighted ? C.textPrimary : C.textSecondary,
                fontSize: Typography.sizes.sm,
                fontWeight: highlighted ? Typography.weights.bold : Typography.weights.medium,
              }]}>{label}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { alignItems: 'center' },
  bar: { flexDirection: 'row', width: '100%', maxWidth: Layout.navigationWidth, borderWidth: 1 },
  item: { flex: 1, minWidth: 0, minHeight: 56, alignItems: 'center', justifyContent: 'center' },
  icon: { minHeight: 32, minWidth: 44, alignItems: 'center', justifyContent: 'center' },
  label: { maxWidth: '100%', textAlign: 'center' },
});
