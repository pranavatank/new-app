import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Ionicons from '@expo/vector-icons/Ionicons';
import { scaleTheme, makeShadow } from '../constants/theme';
import { useTheme } from '../store/ThemeContext';
import useAppStore from '../store/useAppStore';
import { useTranslation } from 'react-i18next';
import IconButton from './common/IconButton';

// ── Helpers ───────────────────────────────────────────────────────────────────

const WEEKDAY_INDICES = Array.from({ length: 7 }, (_, index) => index);

const toDStr = (d) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

const parseD = (s) => { const [y,m,d] = s.split('-').map(Number); return new Date(y,m-1,d); };

// ── Mini Calendar ─────────────────────────────────────────────────────────────

const CalModal = ({ visible, selected, onSelect, onClose }) => {
  const { C, scale } = useTheme();
  const { t, i18n } = useTranslation();
  const { Typography, Spacing, Radius } = scaleTheme(scale);
  const Shadow = makeShadow(C);
  const pd   = parseD(selected);
  const [yr, setYr] = useState(pd.getFullYear());
  const [mo, setMo] = useState(pd.getMonth());

  React.useEffect(() => {
    if (visible) {
      const d = parseD(selected);
      setYr(d.getFullYear());
      setMo(d.getMonth());
    }
  }, [visible, selected]);

  const todayStr = toDStr(new Date());
  const days     = new Date(yr, mo+1, 0).getDate();
  const first    = new Date(yr, mo, 1).getDay();
  const cells    = Array(first).fill(null).concat(Array.from({length:days},(_,i)=>i+1));

  const prev = () => mo===0 ? (setYr(y=>y-1),setMo(11)) : setMo(m=>m-1);
  const next = () => mo===11 ? (setYr(y=>y+1),setMo(0)) : setMo(m=>m+1);

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.lg }, { backgroundColor: C.overlay }]} onPress={onClose}>
        <Pressable style={[{ width: '100%', maxWidth: 360, borderRadius: Radius.xxl, padding: Spacing.lg, borderWidth: 1 }, { backgroundColor: C.bgCard, borderColor: C.border }, Shadow.md]} onPress={e=>e.stopPropagation()}>

          {/* Header with close button */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md }}>
            <Text style={[{ fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold }, { color: C.textPrimary }]}>{t('ledger.select_date')}</Text>
            <IconButton icon="close" label={t('common.close')} onPress={onClose} />
          </View>

          {/* Month nav */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md }}>
            <IconButton icon="chevron-back" label={t('ledger.previous_month')} onPress={prev} />
            <Text style={[{ fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold }, { color: C.textPrimary }]}>{new Date(yr,mo,1).toLocaleDateString(i18n.language === 'gu' ? 'gu-IN-u-nu-latn' : 'en-IN', { month:'long', year:'numeric' })}</Text>
            <IconButton icon="chevron-forward" label={t('ledger.next_month')} onPress={next} />
          </View>

          {/* Day headers */}
          <View style={{ flexDirection: 'row', marginBottom: Spacing.xs }}>
            {WEEKDAY_INDICES.map(i => {
              const d = new Date(2023, 0, 1 + i).toLocaleDateString(i18n.language === 'gu' ? 'gu-IN-u-nu-latn' : 'en-IN', { weekday: 'short' });
              return <Text key={i} style={[{ flex: 1, textAlign: 'center', fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold, letterSpacing: 0.5 }, { color: C.textMuted }]}>{d}</Text>;
            })}
          </View>

          {/* Grid */}
          <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: Spacing.sm }}>
            {cells.map((day, i) => {
              if (!day) return <View key={`e${i}`} style={{ width: `${100/7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', padding: 2 }} />;
              const ds    = `${yr}-${String(mo+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
              const isSel = ds === selected;
              const isT   = ds === todayStr;
              const isSun = new Date(yr, mo, day).getDay() === 0;
              return (
                <TouchableOpacity
                  key={ds}
                  style={[
                    { width: `${100/7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center', padding: 2 },
                    isSel && { backgroundColor: C.primary, borderRadius: Radius.sm },
                    isT && !isSel && { borderWidth: 1.5, borderColor: C.primary, borderRadius: Radius.sm },
                  ]}
                  onPress={() => { onSelect(ds); onClose(); }}
                >
                  <Text style={[
                    { fontSize: Math.max(16, Typography.sizes.sm), fontWeight: Typography.weights.medium },
                    { color: C.textSecondary },
                    isSel && { color: C.textOnPrimary, fontWeight: Typography.weights.bold },
                    isT && !isSel && { color: C.primary, fontWeight: Typography.weights.bold },
                    isSun && !isSel && { color: C.expense },
                  ]}>{new Date(yr, mo, day).toLocaleDateString(i18n.language === 'gu' ? 'gu-IN-u-nu-latn' : 'en-IN', { day: 'numeric' })}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Today shortcut */}
          <TouchableOpacity
            style={[{ marginTop: Spacing.sm, paddingVertical: Spacing.md, borderRadius: Radius.full, alignItems: 'center' }, { backgroundColor: C.primaryDim }]}
            onPress={() => { onSelect(toDStr(new Date())); onClose(); }}
          >
            <Text style={[{ fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold }, { color: C.primary }]}>{t('ledger.jump_to_today')}</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

// ── Main DayNavigator ─────────────────────────────────────────────────────────

export default function DayNavigator() {
  const { C, scale } = useTheme();
  const { Typography, Spacing, Radius } = scaleTheme(scale);
  const Shadow = makeShadow(C);
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'ios' ? (insets?.top || 0) : 0;
  const [calOpen, setCalOpen] = useState(false);
  const { selectedDate, goToPrevDay, goToNextDay, setSelectedDate } = useAppStore();
  const lastClickRef = React.useRef(0);

  const display = (dateStr) => {
    const d = parseD(dateStr);
    const locale = i18n.language === 'gu' ? 'gu-IN-u-nu-latn' : 'en-IN';
    const dayName = d.toLocaleDateString(locale, { weekday: 'long' });
    const dateOnly = d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
    return { label: dayName, sub: dateOnly };
  };

  const handlePrev = () => {
    const now = Date.now();
    if (now - lastClickRef.current < 230) return;
    lastClickRef.current = now;
    goToPrevDay();
  };

  const handleNext = () => {
    const now = Date.now();
    if (now - lastClickRef.current < 230) return;
    lastClickRef.current = now;
    goToNextDay();
  };

  const { label, sub } = display(selectedDate);
  const isToday = selectedDate === toDStr(new Date());

  return (
    <>
      <View style={[{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base, paddingTop: topInset + Spacing.xs, paddingBottom: Spacing.sm, borderBottomWidth: 1 }, { backgroundColor: C.bgCard, borderBottomColor: C.border }, Shadow.sm]}>
        {/* Prev */}
        <IconButton icon="chevron-back" label={t('ledger.previous_day')} onPress={handlePrev} />

        {/* Date tap */}
        <TouchableOpacity accessibilityRole="button" accessibilityLabel={t('ledger.select_date') + ', ' + label + ' ' + sub} style={{ flex: 1, alignItems: 'center', paddingVertical: Spacing.xs }} onPress={() => setCalOpen(true)} activeOpacity={0.8}>
          <Text style={{ fontSize: Typography.sizes.md, fontWeight: Typography.weights.heavy, color: isToday ? C.primary : C.textPrimary, textAlign: 'center' }}>
            {isToday ? t('ledger.today') + ' · ' + label : label}
          </Text>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 2 }}>
            <Text style={[{ fontSize: Typography.sizes.xs, marginTop: 2, letterSpacing: 0.3 }, { color: C.textSecondary }]}>{sub}</Text>
            <Ionicons name="chevron-down" size={12} color={C.textMuted} style={{ marginTop: 2 }} />
          </View>
        </TouchableOpacity>

        {/* Next */}
        <IconButton icon="chevron-forward" label={t('ledger.next_day')} onPress={handleNext} />
      </View>

      <CalModal
        visible={calOpen}
        selected={selectedDate}
        onSelect={setSelectedDate}
        onClose={() => setCalOpen(false)}
      />
    </>
  );
}
