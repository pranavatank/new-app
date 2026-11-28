import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, StatusBar,
  Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { scaleTheme } from '../constants/theme';
import { useTheme } from '../store/ThemeContext';
import { getOrCreateDay, setExpenseAmount, recalculateBalance, getAllCategories, getAllVehicleRecords, addVehicleRecord, updateVehicleRecord, deleteVehicleRecord, getVehicleStats } from '../db/queries';
import { Card, Button, IconBadge, Sheet, Input, Chip, EmptyState, ScreenHeader } from '../components/common';
import { getOdometerNeighbors } from '../utils/vehicleRecords';
import { parseCashAmount } from '../utils/cash';

const toISODate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

const parseISODate = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

const DatePickerModal = ({ visible, selected, onSelect, onClose }) => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'gu' ? 'gu-IN-u-nu-latn' : 'en-IN';
  const { C, scale } = useTheme();
  const { Typography, Spacing, Radius } = scaleTheme(scale);

  const parsed = parseISODate(selected);
  const [yr, setYr] = useState(parsed.getFullYear());
  const [mo, setMo] = useState(parsed.getMonth());

  useEffect(() => {
    if (visible) {
      const d = parseISODate(selected);
      setYr(d.getFullYear());
      setMo(d.getMonth());
    }
  }, [visible, selected]);

  const todayStr = toISODate(new Date());
  const daysInMonth = new Date(yr, mo + 1, 0).getDate();
  const first = new Date(yr, mo, 1).getDay();
  const cells = Array(first).fill(null).concat(Array.from({ length: daysInMonth }, (_, i) => i + 1));

  const prevMonth = () => mo === 0 ? (setYr(y => y - 1), setMo(11)) : setMo(m => m - 1);
  const nextMonth = () => mo === 11 ? (setYr(y => y + 1), setMo(0)) : setMo(m => m + 1);

  return (
    <Sheet visible={visible} onClose={onClose} title={t('ledger.select_date')}>
      <View style={[dp.monthRow, { marginBottom: Spacing.md }]}>
        <TouchableOpacity style={[dp.navBtn, { backgroundColor: C.bgElevated }]} onPress={prevMonth}>
          <Ionicons name="chevron-back" size={18} color={C.primary} />
        </TouchableOpacity>
        <Text style={[dp.monthTxt, { color: C.textPrimary, fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold }]}>
          {new Date(yr, mo, 1).toLocaleDateString(locale, { month: 'long', year: 'numeric' })}
        </Text>
        <TouchableOpacity style={[dp.navBtn, { backgroundColor: C.bgElevated }]} onPress={nextMonth}>
          <Ionicons name="chevron-forward" size={18} color={C.primary} />
        </TouchableOpacity>
      </View>

      <View style={[dp.weekRow, { marginBottom: Spacing.sm }]}>
        {Array.from({ length: 7 }, (_, i) => (
          <Text key={i} style={[dp.weekTxt, { color: C.textMuted, fontSize: Typography.sizes.xs, fontWeight: Typography.weights.semibold }]}>
            {new Date(2026, 0, 4 + i).toLocaleDateString(locale, { weekday: 'narrow' })}
          </Text>
        ))}
      </View>

      <View style={[dp.grid, { gap: Spacing.xs }]}>
        {cells.map((day, idx) => {
          if (!day) return <View key={`e-${idx}`} style={dp.cell} />;
          const dateStr = `${yr}-${String(mo + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
          const isSel = dateStr === selected;
          const isToday = dateStr === todayStr;
          return (
            <TouchableOpacity
              key={dateStr}
              style={[
                dp.cell,
                dp.dayCell, { borderColor: C.transparent },
                { borderRadius: Radius.full },
                isSel && { backgroundColor: C.primary },
                !isSel && isToday && { borderColor: C.primary },
              ]}
              onPress={() => { onSelect(dateStr); onClose(); }}
            >
              <Text
                style={[
                  dp.dayTxt,
                  { color: isSel ? C.textOnPrimary : C.textPrimary, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.medium },
                  !isSel && isToday && { color: C.primary },
                ]}
              >
                {day}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      <TouchableOpacity
        style={[dp.todayBtn, { backgroundColor: C.primaryDim, marginTop: Spacing.sm, paddingVertical: Spacing.md, borderRadius: Radius.full }]}
        onPress={() => { onSelect(todayStr); onClose(); }}
      >
        <Text style={[dp.todayTxt, { color: C.primary, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold }]}>{t('ledger.jump_to_today')}</Text>
      </TouchableOpacity>
    </Sheet>
  );
};

const dp = StyleSheet.create({
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  navBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  monthTxt: {},
  weekRow: { flexDirection: 'row', justifyContent: 'space-between' },
  weekTxt: { width: 36, textAlign: 'center' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  dayCell: { borderWidth: 1 },
  dayTxt: {},
  todayBtn: { alignItems: 'center' },
  todayTxt: {},
});

// ── Add Record Modal ──────────────────────────────────────────────────────────
const AddRecordModal = ({ visible, onClose, records, editingRecord, initialDate, onSave }) => {
  const { C, scale } = useTheme();
  const { t } = useTranslation();
  const { Typography, Spacing, Radius } = scaleTheme(scale);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [reading, setReading] = useState('');
  const [liters, setLiters] = useState('2');
  const [pricePerLiter, setPricePerLiter] = useState('100');
  const [totalAmount, setTotalAmount] = useState('');
  const [editMode, setEditMode] = useState('liters');
  const [paymentType, setPaymentType] = useState('online');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const isoDate = toISODate(selectedDate);
  const { previous, next } = getOdometerNeighbors(records, isoDate, editingRecord?.id);
  const lastReading = previous?.reading || 0;
  const previousLiters = previous?.liters || 0;

  React.useEffect(() => {
    if (visible) {
      if (editingRecord) {
        const dateStr = editingRecord.rawDate || editingRecord.date;
        let editDate = new Date(dateStr);
        if (dateStr.includes('-')) {
          const [year, month, day] = dateStr.split('-');
          editDate = new Date(year, month - 1, day);
        } else if (dateStr.includes('.')) {
          const [day, month, yy] = dateStr.split('.');
          const fullYear = yy.length === 2 ? `20${yy}` : yy;
          editDate = new Date(fullYear, Number(month) - 1, Number(day));
        }
        setSelectedDate(editDate);

        setReading(String(editingRecord.reading));
        setLiters(String(editingRecord.liters));
        setPricePerLiter(String(editingRecord.price_per_liter.toFixed(2)));
        setTotalAmount(String(editingRecord.amount.toFixed(2)));
        setEditMode('liters');
        setPaymentType(editingRecord.payment_type || 'online');
      } else {
        const date = initialDate ? parseISODate(initialDate) : new Date();
        setSelectedDate(date);
        const adjacent = getOdometerNeighbors(records, toISODate(date));
        const earlierReading = adjacent.previous?.reading || 0;
        const step = adjacent.next ? Math.min(100, (adjacent.next.reading - earlierReading) / 2) : 100;
        setReading((earlierReading + Math.max(0, step)).toFixed(1));
        setLiters('2');
        setPricePerLiter(adjacent.previous?.liters ? (adjacent.previous.amount / adjacent.previous.liters).toFixed(2) : '100');
        setTotalAmount('');
        setEditMode('liters');
        setPaymentType('online');
      }
      setShowDatePicker(false);
    }
  }, [visible, editingRecord, initialDate, records]);

  const openDatePicker = () => {
    setShowDatePicker(true);
  };

  const handleDateSelect = (isoDate) => {
    setSelectedDate(parseISODate(isoDate));
    setShowDatePicker(false);
  };

  const handleLitersChange = (value) => {
    setLiters(value);
    setEditMode('liters');
    const literNum = parseCashAmount(value) || 0;
    const priceNum = parseCashAmount(pricePerLiter) || 0;
    if (literNum > 0 && priceNum > 0) {
      setTotalAmount(String((literNum * priceNum).toFixed(2)));
    }
  };

  const handleAmountChange = (value) => {
    setTotalAmount(value);
    setEditMode('amount');
    const amountNum = parseCashAmount(value) || 0;
    const priceNum = parseCashAmount(pricePerLiter) || 0;
    if (amountNum > 0 && priceNum > 0) {
      setLiters(String((amountNum / priceNum).toFixed(2)));
    }
  };

  const handlePriceChange = (value) => {
    setPricePerLiter(value);
    const priceNum = parseCashAmount(value) || 0;
    if (editMode === 'liters') {
      const literNum = parseCashAmount(liters) || 0;
      if (literNum > 0 && priceNum > 0) {
        setTotalAmount(String((literNum * priceNum).toFixed(2)));
      }
    } else {
      const amountNum = parseCashAmount(totalAmount) || 0;
      if (amountNum > 0 && priceNum > 0) {
        setLiters(String((amountNum / priceNum).toFixed(2)));
      }
    }
  };

  const currentReading = parseCashAmount(reading);
  const distance = currentReading - lastReading;
  const lastReadingDisplay = Number.isFinite(lastReading) ? Number(lastReading).toFixed(1) : '0.0';
  const distanceDisplay = Number.isFinite(distance) ? distance.toFixed(1) : '0.0';
  const literNum = parseCashAmount(liters) || 0;
  const priceNum = parseCashAmount(pricePerLiter) || 0;
  const finalAmount = parseCashAmount(totalAmount) || (literNum * priceNum);
  const calculatedAvg = (previousLiters > 0 && lastReading > 0 && distance > 0) ? (distance / previousLiters).toFixed(2) : '0.00';

  const formatDate = (date) => {
    const d = new Date(date);
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getFullYear()).slice(-2)}`;
  };

  const handleSave = () => {
    const readingChanged = !editingRecord || isoDate !== editingRecord.rawDate || currentReading !== editingRecord.reading;
    if (!Number.isFinite(currentReading) || (readingChanged && (currentReading <= lastReading || (next && currentReading >= next.reading)))) {
      Alert.alert(t('ledger.error'), t('ledger.vehicle_reading_bounds'));
      return;
    }
    if (![literNum, priceNum, finalAmount].every(value => Number.isFinite(value) && value > 0)) {
      Alert.alert(t('common.error'), t('vehicle.invalidFuel'));
      return;
    }

    try {
      if (editingRecord) {
        updateVehicleRecord(editingRecord.id, isoDate, currentReading, literNum, priceNum, finalAmount, paymentType);
      } else {
        addVehicleRecord(isoDate, currentReading, literNum, priceNum, finalAmount, paymentType);
      }

      const dayRecord = getOrCreateDay(isoDate);
      const categories = getAllCategories();
      const fuelCategory = categories.find(cat => cat.name === 'Fuel');

      if (fuelCategory) {
        const readingNote = Number.isFinite(currentReading) ? currentReading.toFixed(1) : currentReading;
        setExpenseAmount(dayRecord.id, fuelCategory.id, finalAmount, paymentType, null, `Bike - ${readingNote} km`);
        recalculateBalance(dayRecord.id, isoDate);
      }

      Alert.alert(t('vehicle.saveDone'));
      onSave();
      onClose();
    } catch (error) {
      Alert.alert(t('common.error'), t('book.saveError'));
    }
  };

  const handleDelete = () => {
    Alert.alert(t('vehicle.deleteTitle'), '', [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => {
        try {
          deleteVehicleRecord(editingRecord.id);
          Alert.alert(t('vehicle.deleteDone'));
          onSave();
          onClose();
        } catch (error) {
          Alert.alert(t('common.error'), t('book.saveError'));
        }
      }},
    ]);
  };

  return (
    <>
      <Sheet visible={visible} onClose={onClose}
        title={t(editingRecord ? 'vehicle.editRecord' : 'vehicle.addRecord')}
        footer={
          <View style={[am.btnRow, { gap: Spacing.sm }]}>
            {editingRecord && <Button label={t('common.delete')} variant="danger" onPress={handleDelete} />}
            <Button label={t('common.save')} onPress={handleSave} style={{ flex: 1 }} />
          </View>
        }>
        {/* Date Input */}
        <View style={[am.section, { marginBottom: Spacing.md }]}>
          <Text style={[am.label, { color: C.textSecondary, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold, marginBottom: Spacing.md }]}>{t('vehicle.date')}</Text>
          <TouchableOpacity onPress={openDatePicker} activeOpacity={0.7}>
            <View style={[am.inputBox, { backgroundColor: C.bgInput, borderColor: C.primary, borderRadius: Radius.lg, paddingHorizontal: Spacing.lg, gap: Spacing.sm }]}>
              <Ionicons name="calendar-outline" size={20} color={C.primary} />
              <Text style={[am.input, { color: C.textPrimary, fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold, paddingVertical: Spacing.md }]}>{formatDate(selectedDate)}</Text>
            </View>
          </TouchableOpacity>
        </View>

        <DatePickerModal
          visible={showDatePicker}
          selected={toISODate(selectedDate)}
          onSelect={handleDateSelect}
          onClose={() => setShowDatePicker(false)}
        />

        <View style={[am.section, { marginBottom: Spacing.md }]}>
          <Input label={t('vehicle.odometer')} value={reading} onChangeText={setReading} keyboardType="decimal-pad" />
          <View style={[am.infoBox, { backgroundColor: C.primaryDim, marginTop: Spacing.md, padding: Spacing.md, borderRadius: Radius.lg }]}>
            <Text style={[am.infoText, { color: C.primary, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold }]}>
              {t('vehicle.lastReading', { reading: lastReadingDisplay, distance: distanceDisplay })}
            </Text>
          </View>
        </View>

        {/* Fuel Amount */}
        <View style={{ marginBottom: Spacing.md }}>
          <Input
            label={t('vehicle.liters')}
            value={liters}
            onChangeText={handleLitersChange}
            keyboardType="decimal-pad"
            placeholder="0.0"
          />
          <Text style={[am.hint, { color: C.textMuted, fontSize: Typography.sizes.xs, marginTop: Spacing.xs }]}>
            {t('vehicle.litersHint')}
          </Text>
        </View>

        {/* Price Per Liter */}
        <View style={{ marginBottom: Spacing.md }}>
          <Input
            label={t('vehicle.price')}
            value={pricePerLiter}
            onChangeText={handlePriceChange}
            keyboardType="decimal-pad"
            placeholder="0.00"
          />
        </View>

        {/* Total Amount */}
        <View style={{ marginBottom: Spacing.xs }}>
          <Input
            label={t('vehicle.amount')}
            value={totalAmount}
            onChangeText={handleAmountChange}
            keyboardType="decimal-pad"
            placeholder="0.00"
          />
        </View>
        <Text style={[am.hint, { color: C.textMuted, fontSize: Typography.sizes.xs, marginBottom: Spacing.md }]}>{t('vehicle.amountHint')}</Text>

        {/* Payment Type */}
        <View style={[am.section, { marginBottom: Spacing.md }]}>
          <Text style={[am.label, { color: C.textSecondary, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold, marginBottom: Spacing.md }]}>{t('ledger.payment')}</Text>
          <View style={[am.typeRow, { gap: Spacing.sm }]}>
            <TouchableOpacity
              style={[am.typeBtn, {
                backgroundColor: paymentType === 'online' ? C.primary : C.bgInput,
                borderColor: C.primary,
                borderRadius: Radius.lg,
                paddingVertical: Spacing.md,
                gap: 6,
              }]}
              onPress={() => setPaymentType('online')}
            >
              <Ionicons name="card-outline" size={16} color={paymentType === 'online' ? C.textOnPrimary : C.primary} />
              <Text style={[am.typeBtnText, { color: paymentType === 'online' ? C.textOnPrimary : C.primary, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold }]}>
                {t('ledger.online')}
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[am.typeBtn, {
                backgroundColor: paymentType === 'cash' ? C.income : C.bgInput,
                borderColor: C.income,
                borderRadius: Radius.lg,
                paddingVertical: Spacing.md,
                gap: 6,
              }]}
              onPress={() => setPaymentType('cash')}
            >
              <Ionicons name="cash-outline" size={16} color={paymentType === 'cash' ? C.textOnPrimary : C.income} />
              <Text style={[am.typeBtnText, { color: paymentType === 'cash' ? C.textOnPrimary : C.income, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold }]}>
                {t('ledger.cash')}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Summary Card */}
        <Card style={{ borderColor: C.primary, borderWidth: 2, marginBottom: Spacing.md }}>
          <View style={am.summaryRow}>
            <Text style={[am.summaryLabel, { color: C.textSecondary, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold }]}>{t('vehicle.amount')}</Text>
            <Text style={[am.summaryValue, { color: C.expense, fontSize: Typography.sizes.lg, fontWeight: Typography.weights.black }]}>₹{finalAmount.toFixed(2)}</Text>
          </View>
          <View style={[am.divider, { backgroundColor: C.border, marginVertical: Spacing.xs }]} />
          <View style={am.summaryRow}>
            <Text style={[am.summaryLabel, { color: C.textSecondary, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold }]}>{t('vehicle.liters')}</Text>
            <Text style={[am.summaryValue, { color: C.warning, fontSize: Typography.sizes.lg, fontWeight: Typography.weights.black }]}>{literNum.toFixed(2)} L</Text>
          </View>
          <View style={[am.divider, { backgroundColor: C.border, marginVertical: Spacing.xs }]} />
          <View style={am.summaryRow}>
            <Text style={[am.summaryLabel, { color: C.textSecondary, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold }]}>{t('vehicle.lastMileage')}</Text>
            <Text style={[am.summaryValue, { color: C.income, fontSize: Typography.sizes.lg, fontWeight: Typography.weights.black }]}>{calculatedAvg} km/L</Text>
          </View>
          <View style={[am.divider, { backgroundColor: C.border, marginVertical: Spacing.xs }]} />
          <View style={am.summaryRow}>
            <Text style={[am.summaryLabel, { color: C.textSecondary, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold }]}>{t('vehicle.distance')}</Text>
            <Text style={[am.summaryValue, { color: C.primary, fontSize: Typography.sizes.lg, fontWeight: Typography.weights.black }]}>{distanceDisplay} km</Text>
          </View>
        </Card>

      </Sheet>
    </>
  );
};

const am = StyleSheet.create({
  section: {},
  label: { letterSpacing: 0.5 },
  hint: {},

  infoBox: {},
  infoText: { textAlign: 'center' },

  typeRow: { flexDirection: 'row' },
  typeBtn: { flex: 1, borderWidth: 2, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  typeBtnText: {},

  inputBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 2 },
  input: { flex: 1 },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  summaryLabel: {},
  summaryValue: {},
  divider: { height: 1 },

  btnRow: { flexDirection: 'row' },
});

const Vehicle = ({ navigation, route }) => {
  const { t } = useTranslation();
  const { C, scale } = useTheme();
  const { Typography, Spacing } = scaleTheme(scale);
  const [showAddModal, setShowAddModal] = useState(false);
  const [draftDate, setDraftDate] = useState(null);
  const [editingRecord, setEditingRecord] = useState(null);
  const [vehicleData, setVehicleData] = useState([]);
  const [stats, setStats] = useState({ totalAvg: 0, last10Avg: 0, totalDistance: 0, totalAmount: 0, totalFuel: 0 });

  const loadData = () => {
    const records = getAllVehicleRecords();
    const processedData = records.map((record, idx, arr) => {
      const [year, month, day] = record.date.split('-');
      const formattedDate = `${day}.${month}.${year.slice(-2)}`;
      const readingVal = parseFloat(record.reading);
      const formattedReading = Number.isFinite(readingVal)
        ? readingVal.toFixed(1)
        : record.reading;

      // `arr` is sorted newest-first, so arr[idx+1] is the OLDER, previous
      // fill-up. The distance since that fill-up was covered on the fuel put
      // in AT that fill-up (nextRecord.liters) — not on record.liters, which
      // is the fuel just added now and will power the *next*, not-yet-ridden
      // leg. Dividing by record.liters here was the original bug.
      let readDiff = 0;
      let average = null;
      let prevReading = 0;
      let prevLiters = 0;

      if (idx < arr.length - 1) {
        const nextRecord = arr[idx + 1];
        prevReading = Number(nextRecord.reading) || 0;
        prevLiters = Number(nextRecord.liters) || 0;
        if (prevReading > 0) {
          readDiff = record.reading - prevReading;
          if (readDiff > 0 && prevLiters > 0) {
            average = readDiff / prevLiters;
          }
        }
      }

      const formattedDistance = (prevReading > 0 && readDiff > 0) ? readDiff.toFixed(1) : '-';
      const formattedAverage = average !== null ? average.toFixed(2) : '-';

      return {
        ...record,
        date: formattedDate,
        rawDate: record.date,
        reading: Number.isFinite(readingVal) ? readingVal : record.reading,
        formattedReading,
        readDiff,
        average: average !== null ? parseFloat(average.toFixed(2)) : null,
        formattedDistance,
        formattedAverage,
        prevReading,
        prevLiters,
      };
    });

    setVehicleData(processedData);
    setStats(getVehicleStats());
  };

  useEffect(() => {
    loadData();
  }, []);

  const suggestedDate = route?.params?.addDate;
  useEffect(() => {
    if (!suggestedDate) return;
    setDraftDate(suggestedDate);
    setEditingRecord(null);
    setShowAddModal(true);
    navigation.setParams({ addDate: null });
  }, [navigation, suggestedDate]);

  const totalDistance = stats.totalDistance;
  const totalDistanceDisplay = Number.isFinite(totalDistance) ? totalDistance.toFixed(1) : totalDistance;
  const totalAmount = stats.totalAmount;

  const summaryTiles = [
    { icon: 'speedometer-outline', value: stats.totalAvg.toFixed(2), label: t('vehicle.overallAvg'), color: C.primary },
    { icon: 'trending-up-outline', value: stats.last10Avg.toFixed(2), label: t('vehicle.recentAvg'), color: C.income },
    { icon: 'map-outline', value: totalDistanceDisplay, label: t('vehicle.totalDistance'), color: C.expense },
    { icon: 'cash-outline', value: `₹${totalAmount.toFixed(0)}`, label: t('vehicle.totalSpent'), color: C.warning },
  ];

  return (
    <View style={[s.container, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={C.isDark ? 'light-content' : 'dark-content'} />

      <ScreenHeader title={t('ledger.tool_vehicle')} subtitle={t('ledger.overview_mileage_all_time')}
        onBack={() => navigation.goBack()} />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={{ padding: Spacing.base, paddingBottom: Spacing.xl }}
        showsVerticalScrollIndicator={false}
      >
        {vehicleData.length > 0 && <View style={[s.summaryGrid, { gap: Spacing.sm, marginBottom: Spacing.lg }]}>
          {summaryTiles.map((tile) => (
            <Card key={tile.label} style={[s.summaryCard, { minWidth: '47%' }]}>
              <IconBadge icon={tile.icon} color={tile.color} size={40} style={{ marginBottom: Spacing.xs }} />
              <Text style={[s.summaryValue, { color: tile.color, fontSize: Typography.sizes.xxl, fontWeight: Typography.weights.black }]}>{tile.value}</Text>
              <Text style={[s.summaryLabel, { color: C.textSecondary, fontSize: Typography.sizes.xs, fontWeight: Typography.weights.semibold }]}>{tile.label}</Text>
            </Card>
          ))}
        </View>}

        {/* Records Title */}
        <View style={[s.sectionHeader, { marginBottom: Spacing.md, marginTop: Spacing.sm }]}>
          <Text style={[s.sectionTitle, { color: C.textPrimary, fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold }]}>{t('vehicle.records')}</Text>
          <Button label={t('ledger.add_fuel')} icon="add" size="sm" onPress={() => setShowAddModal(true)} />
        </View>

        {/* Records List */}
        {vehicleData.length === 0 ? (
          <EmptyState
            icon="speedometer-outline"
            title={t('vehicle.empty')}
            subtitle={t('vehicle.emptyHint')}
          />
        ) : (
          vehicleData.map((item, idx) => (
            <TouchableOpacity
              key={item.id}
              onPress={() => {
                setEditingRecord(item);
                setShowAddModal(true);
              }}
              activeOpacity={0.7}
            >
              <Card style={{ marginBottom: Spacing.md }}>
                <View style={[s.recordHeader, { marginBottom: Spacing.md }]}>
                  <Chip icon="calendar-outline" label={item.date} color={C.primary} />
                </View>

                <View style={[s.recordGrid, { gap: Spacing.md, marginBottom: Spacing.md }]}>
                  <View style={s.recordItem}>
                    <Text style={[s.recordLabel, { color: C.textMuted, fontSize: Typography.sizes.xs, fontWeight: Typography.weights.semibold }]}>{t('vehicle.reading')}</Text>
                    <Text style={[s.recordValue, { color: C.textPrimary, fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold }]}>{item.formattedReading}</Text>
                  </View>
                  <View style={s.recordItem}>
                    <Text style={[s.recordLabel, { color: C.textMuted, fontSize: Typography.sizes.xs, fontWeight: Typography.weights.semibold }]}>{t('vehicle.distance')}</Text>
                    <Text style={[s.recordValue, { color: C.textPrimary, fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold }]}>{item.formattedDistance} km</Text>
                  </View>
                  <View style={s.recordItem}>
                    <Text style={[s.recordLabel, { color: C.textMuted, fontSize: Typography.sizes.xs, fontWeight: Typography.weights.semibold }]}>{t('vehicle.petrol')}</Text>
                    <Text style={[s.recordValue, { color: C.textPrimary, fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold }]}>{item.liters} L</Text>
                  </View>
                </View>

                <View style={[s.divider, { backgroundColor: C.border, marginBottom: Spacing.md }]} />

                <View style={[s.recordGrid, { gap: Spacing.md }]}>
                  <View style={s.recordItem}>
                    <Text style={[s.recordLabel, { color: C.textMuted, fontSize: Typography.sizes.xs, fontWeight: Typography.weights.semibold }]}>{t('vehicle.average')}</Text>
                    <Text style={[s.recordHighlight, { color: C.primary, fontSize: Typography.sizes.lg, fontWeight: Typography.weights.black }]}>{item.formattedAverage} km/L</Text>
                  </View>
                  <View style={s.recordItem}>
                    <Text style={[s.recordLabel, { color: C.textMuted, fontSize: Typography.sizes.xs, fontWeight: Typography.weights.semibold }]}>{t('vehicle.paid')}</Text>
                    <Text style={[s.recordHighlight, { color: C.expense, fontSize: Typography.sizes.lg, fontWeight: Typography.weights.black }]}>₹{item.amount.toFixed(2)}</Text>
                  </View>
                </View>
              </Card>
            </TouchableOpacity>
          ))
        )}
      </ScrollView>

      {/* Add Record Modal */}
      <AddRecordModal
        visible={showAddModal}
        onClose={() => {
          setShowAddModal(false);
          setEditingRecord(null);
          setDraftDate(null);
        }}
        initialDate={draftDate}
        records={vehicleData}
        editingRecord={editingRecord}
        onSave={loadData}
      />
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1 },

  scroll: { flex: 1 },

  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap' },
  summaryCard: { flex: 1, alignItems: 'center' },
  summaryValue: { marginBottom: 2 },
  summaryLabel: { textTransform: 'uppercase', letterSpacing: 0.5 },

  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: {},

  recordHeader: { flexDirection: 'row', justifyContent: 'space-between' },

  recordGrid: { flexDirection: 'row' },
  recordItem: { flex: 1 },
  recordLabel: { marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  recordValue: {},
  recordHighlight: {},

  divider: { height: 1 },
});

export default Vehicle;
