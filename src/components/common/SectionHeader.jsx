import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { scaleTheme } from '../../constants/theme';
import { useTheme } from '../../store/ThemeContext';
import IconBadge from './IconBadge';
import { useTranslation } from 'react-i18next';

/**
 * Icon + title (+ optional badge/count) + optional "see all" action.
 * Replaces the local `SecHdr` pattern used on Home.jsx and others.
 */
export default function SectionHeader({ icon, mciIcon, color, title, badge, onSeeAll, seeAllLabel, style }) {
  const { C, scale } = useTheme();
  const { t } = useTranslation();
  const { Typography, Spacing } = scaleTheme(scale);

  return (
    <View style={[styles.row, { marginBottom: Spacing.md }, style]}>
      <View style={styles.left}>
        {(icon || mciIcon) && (
          <IconBadge icon={icon} mciIcon={mciIcon} color={color || C.primary} size={32} style={{ marginRight: Spacing.sm }} />
        )}
        <Text style={{ flex: 1, minWidth: 0, flexShrink: 1, fontSize: Typography.sizes.md, fontWeight: Typography.weights.black, color: C.textPrimary }}>
          {title}
        </Text>
        {badge != null && badge !== '' && (
          <View
            style={{
              marginLeft: Spacing.sm,
              backgroundColor: (color || C.primary) + '22',
              borderRadius: 999,
              paddingHorizontal: 8,
              paddingVertical: 2,
            }}
          >
            <Text style={{ fontSize: Typography.sizes.xs, fontWeight: Typography.weights.black, color: color || C.primary }}>
              {badge}
            </Text>
          </View>
        )}
      </View>

      {onSeeAll && (
        <TouchableOpacity onPress={onSeeAll} activeOpacity={0.7} style={[styles.seeAll, { minHeight: 44 }]}>
          <Text style={{ fontSize: Typography.sizes.xs, fontWeight: Typography.weights.bold, color: C.primary }}>
          {seeAllLabel || t('common.seeAll', 'See all')}
          </Text>
          <Ionicons name="chevron-forward" size={14} color={C.primary} />
        </TouchableOpacity>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  left: { flexDirection: 'row', alignItems: 'center', flex: 1, minWidth: 0, flexShrink: 1 },
  seeAll: { flexDirection: 'row', alignItems: 'center', gap: 2, flexShrink: 0 },
});
