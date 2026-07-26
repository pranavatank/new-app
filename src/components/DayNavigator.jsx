import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Modal, Pressable, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { scaleTheme, makeShadow } from '../constants/theme';
import { useTheme } from '../store/ThemeContext';
import useAppStore from '../store/useAppStore';
import { useTranslation } from 'react-i18next';

// ── Helpers ───────────────────────────────────────────────────────────────────

const MONTHS      = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const MONTHS_SHORT= ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const DAYS_SHORT  = ['Su','Mo','Tu','We','Th','Fr','Sa'];

const toDStr = (d) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

const parseD = (s) => { const [y,m,d] = s.split('-').map(Number); return new Date(y,m-1,d); };

// ── Mini Calendar ─────────────────────────────────────────────────────────────

const CalModal = ({ visible, selected, onSelect, onClose }) => {
  const { C, scale } = useTheme();
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
            <Text style={[{ fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold }, { color: C.textPrimary }]}>Select Date</Text>
            <TouchableOpacity style={[{ width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' }, { backgroundColor: C.bgElevated }]} onPress={onClose}>
              <Text style={[{ fontSize: 18, fontWeight: '700', lineHeight: 20 }, { color: C.textSecondary }]}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Month nav */}
          <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md }}>
            <TouchableOpacity style={[{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }, { backgroundColor: C.bgElevated }]} onPress={prev}>
              <Text style={[{ fontSize: 24, fontWeight: '700', lineHeight: 28 }, { color: C.primary }]}>‹</Text>
            </TouchableOpacity>
            <Text style={[{ fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold }, { color: C.textPrimary }]}>{MONTHS[mo]} {yr}</Text>
            <TouchableOpacity style={[{ width: 40, height: 40, borderRadius: 20, alignItems: 'center', justifyContent: 'center' }, { backgroundColor: C.bgElevated }]} onPress={next}>
              <Text style={[{ fontSize: 24, fontWeight: '700', lineHeight: 28 }, { color: C.primary }]}>›</Text>
            </TouchableOpacity>
          </View>

          {/* Day headers */}
          <View style={{ flexDirection: 'row', marginBottom: Spacing.xs }}>
            {DAYS_SHORT.map(d => (
              <Text key={d} style={[{ flex: 1, textAlign: 'center', fontSize: 11, fontWeight: '600', letterSpacing: 0.5 }, { color: C.textMuted }]}>{d}</Text>
            ))}
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
                    { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.medium },
                    { color: C.textSecondary },
                    isSel && { color: '#fff', fontWeight: '700' },
                    isT && !isSel && { color: C.primary, fontWeight: '700' },
                    isSun && !isSel && { color: C.expense },
                  ]}>{day}</Text>
                </TouchableOpacity>
              );
            })}
          </View>

          {/* Today shortcut */}
          <TouchableOpacity
            style={[{ marginTop: Spacing.sm, paddingVertical: Spacing.md, borderRadius: Radius.full, alignItems: 'center' }, { backgroundColor: C.primaryDim }]}
            onPress={() => { onSelect(toDStr(new Date())); onClose(); }}
          >
            <Text style={[{ fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold }, { color: C.primary }]}>Jump to Today</Text>
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
  const { t } = useTranslation();
  const insets = useSafeAreaInsets();
  const topInset = Platform.OS === 'ios' ? (insets?.top || 0) : 0;
  const [calOpen, setCalOpen] = useState(false);
  const { selectedDate, goToPrevDay, goToNextDay, setSelectedDate } = useAppStore();
  const lastClickRef = React.useRef(0);

  const display = (dateStr) => {
    const d = parseD(dateStr);
    const dayKeys = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
    const dayName = t(`days.${dayKeys[d.getDay()]}`);
    const dateOnly = `${d.getDate()} ${MONTHS_SHORT[d.getMonth()]} ${d.getFullYear()}`;
    return { label: dayName, sub: dateOnly };
  };

  const handlePrev = () => {
    const now = Date.now();
    if (now - lastClickRef.current < 500) return;
    lastClickRef.current = now;
    goToPrevDay();
  };

  const handleNext = () => {
    const now = Date.now();
    if (now - lastClickRef.current < 500) return;
    lastClickRef.current = now;
    goToNextDay();
  };

  const { label, sub } = display(selectedDate);
  const isToday = selectedDate === toDStr(new Date());

  return (
    <>
      <View style={[{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base, paddingTop: topInset + Spacing.xs, paddingBottom: Spacing.sm, borderBottomWidth: 1 }, { backgroundColor: C.bgCard, borderBottomColor: C.border }, Shadow.sm]}>
        {/* Prev */}
        <TouchableOpacity style={[{ width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' }, { backgroundColor: C.bgElevated }]} onPress={handlePrev} activeOpacity={0.7}>
          <Text style={[{ fontSize: 26, fontWeight: '700', lineHeight: 30 }, { color: C.primary }]}>‹</Text>
        </TouchableOpacity>

        {/* Date tap */}
        <TouchableOpacity style={{ flex: 1, alignItems: 'center', paddingVertical: 4 }} onPress={() => setCalOpen(true)} activeOpacity={0.8}>
          {isToday && (
            <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 3, borderRadius: Radius.full, marginBottom: 3 }, { backgroundColor: C.primaryDim }]}>
              <View style={[{ width: 5, height: 5, borderRadius: 3 }, { backgroundColor: C.primary }]} />
              <Text style={[{ fontSize: 9, fontWeight: '800', letterSpacing: 1.5 }, { color: C.primary }]}>TODAY</Text>
            </View>
          )}
          <Text style={[{ fontSize: Typography.sizes.lg, fontWeight: Typography.weights.black, letterSpacing: 0.2 }, { color: C.textPrimary }]}>{label}</Text>
          <View style={{ flexDirection: 'row', alignItems: 'center' }}>
            <Text style={[{ fontSize: Typography.sizes.xs, marginTop: 2, letterSpacing: 0.3 }, { color: C.textSecondary }]}>{sub}</Text>
            <Text style={[{ fontSize: 11, marginTop: 2 }, { color: C.textMuted }]}>  ▾</Text>
          </View>
        </TouchableOpacity>

        {/* Next */}
        <TouchableOpacity style={[{ width: 42, height: 42, borderRadius: 21, alignItems: 'center', justifyContent: 'center' }, { backgroundColor: C.bgElevated }]} onPress={handleNext} activeOpacity={0.7}>
          <Text style={[{ fontSize: 26, fontWeight: '700', lineHeight: 30 }, { color: C.primary }]}>›</Text>
        </TouchableOpacity>
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
