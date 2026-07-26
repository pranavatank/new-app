import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, StatusBar,
  Pressable, TextInput, Alert,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { scaleTheme, makeShadow } from '../constants/theme';
import { useTheme } from '../store/ThemeContext';
import { getOrCreateDay, setExpenseAmount, recalculateBalance, getAllCategories, getAllVehicleRecords, addVehicleRecord, updateVehicleRecord, deleteVehicleRecord, getVehicleStats } from '../db/queries';
import { Card, Button, IconBadge, Sheet, Input, Badge, Chip, EmptyState } from '../components/common';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_SHORT  = ['Su','Mo','Tu','We','Th','Fr','Sa'];

const toISODate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

const parseISODate = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

// ── Odometer Digit Component ──────────────────────────────────────────────────
const OdometerDigit = ({ value, onChange, isDecimal = false }) => {
  const { C, scale } = useTheme();
  const { Typography, Radius } = scaleTheme(scale);

  return (
    <View style={[od.digitBox, { backgroundColor: C.bgInput, borderColor: C.primary, borderRadius: Radius.lg }]}>
      <TouchableOpacity style={od.arrow} onPress={() => onChange((value + 1) % 10)} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
        <Ionicons name="chevron-up" size={14} color={C.primary} />
      </TouchableOpacity>
      <Text style={[od.digit, { color: C.textPrimary, fontSize: Typography.sizes.xl, fontWeight: Typography.weights.black }]}>{value}</Text>
      <TouchableOpacity style={od.arrow} onPress={() => onChange((value - 1 + 10) % 10)} hitSlop={{ top: 4, bottom: 4, left: 4, right: 4 }}>
        <Ionicons name="chevron-down" size={14} color={C.primary} />
      </TouchableOpacity>
    </View>
  );
};

const od = StyleSheet.create({
  digitBox: { flex: 1, borderWidth: 2, overflow: 'hidden', alignItems: 'center' },
  arrow: { width: '100%', paddingVertical: 6, alignItems: 'center', justifyContent: 'center' },
  digit: { paddingVertical: 6 },
});

const DatePickerModal = ({ visible, selected, onSelect, onClose }) => {
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
    <Sheet visible={visible} onClose={onClose} title="Select Date" scroll={false}>
      <View style={[dp.monthRow, { marginBottom: Spacing.md }]}>
        <TouchableOpacity style={[dp.navBtn, { backgroundColor: C.bgElevated }]} onPress={prevMonth}>
          <Ionicons name="chevron-back" size={18} color={C.primary} />
        </TouchableOpacity>
        <Text style={[dp.monthTxt, { color: C.textPrimary, fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold }]}>{MONTHS[mo]} {yr}</Text>
        <TouchableOpacity style={[dp.navBtn, { backgroundColor: C.bgElevated }]} onPress={nextMonth}>
          <Ionicons name="chevron-forward" size={18} color={C.primary} />
        </TouchableOpacity>
      </View>

      <View style={[dp.weekRow, { marginBottom: Spacing.sm }]}>
        {DAYS_SHORT.map((d) => (
          <Text key={d} style={[dp.weekTxt, { color: C.textMuted, fontSize: Typography.sizes.xs, fontWeight: Typography.weights.semibold }]}>{d}</Text>
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
                dp.dayCell,
                { borderRadius: Radius.full },
                isSel && { backgroundColor: C.primary },
                !isSel && isToday && { borderColor: C.primary },
              ]}
              onPress={() => { onSelect(dateStr); onClose(); }}
            >
              <Text
                style={[
                  dp.dayTxt,
                  { color: isSel ? '#fff' : C.textPrimary, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.medium },
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
        <Text style={[dp.todayTxt, { color: C.primary, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold }]}>Today</Text>
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
  dayCell: { borderWidth: 1, borderColor: 'transparent' },
  dayTxt: {},
  todayBtn: { alignItems: 'center' },
  todayTxt: {},
});

// ── Add Record Modal ──────────────────────────────────────────────────────────
const AddRecordModal = ({ visible, onClose, lastRecord, editingRecord, onSave }) => {
  const { C, scale } = useTheme();
  const { Typography, Spacing, Radius } = scaleTheme(scale);

  const lastReading = editingRecord ? editingRecord.prevReading : (lastRecord?.reading || 0);
  // The distance being entered now was ridden on the fuel from the PREVIOUS
  // fill-up, not the fuel being entered in this form (that fuel powers the
  // next leg, calculated next time). See getVehicleStats/loadData for the
  // same rule applied to historical records.
  const previousLiters = editingRecord ? (editingRecord.prevLiters || 0) : (lastRecord?.liters || 0);
  const estimatedReading = editingRecord ? editingRecord.reading : lastReading + 100;
  const baseReading = Math.floor(Number(estimatedReading) || 0);
  const digits = String(baseReading).padStart(5, '0').split('').map(Number);

  const [selectedDate, setSelectedDate] = useState(new Date());
  const [odometerDigits, setOdometerDigits] = useState(digits);
  const [odometerDecimal, setOdometerDecimal] = useState('0');
  const [liters, setLiters] = useState('2');
  const [pricePerLiter, setPricePerLiter] = useState(lastRecord ? String((lastRecord.amount / lastRecord.liters).toFixed(2)) : '100');
  const [totalAmount, setTotalAmount] = useState('');
  const [editMode, setEditMode] = useState('liters');
  const [paymentType, setPaymentType] = useState('online');
  const [showDatePicker, setShowDatePicker] = useState(false);

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

        const readingParts = String(editingRecord.reading).split('.');
        const readInt = parseInt(readingParts[0], 10) || 0;
        const editDigits = String(readInt).padStart(5, '0').split('').map(Number);

        setOdometerDigits(editDigits);
        setOdometerDecimal((readingParts[1] || '0').slice(0, 1));
        setLiters(String(editingRecord.liters));
        setPricePerLiter(String(editingRecord.price_per_liter.toFixed(2)));
        setTotalAmount(String(editingRecord.amount.toFixed(2)));
        setEditMode('liters');
        setPaymentType(editingRecord.payment_type || 'online');
      } else {
        const now = new Date();
        setSelectedDate(now);

        const newDigits = String(Math.floor(estimatedReading)).padStart(5, '0').split('').map(Number);
        setOdometerDigits(newDigits);
        setOdometerDecimal('0');
        setLiters('2');
        setPricePerLiter(lastRecord ? String((lastRecord.amount / lastRecord.liters).toFixed(2)) : '100');
        setTotalAmount('');
        setEditMode('liters');
        setPaymentType('online');
      }
      setShowDatePicker(false);
    }
  }, [visible, editingRecord]);

  const updateDigit = (index, value) => {
    const newDigits = [...odometerDigits];
    newDigits[index] = value;
    setOdometerDigits(newDigits);
  };

  const openDatePicker = () => {
    setShowDatePicker(true);
  };

  const handleDateSelect = (isoDate) => {
    setSelectedDate(parseISODate(isoDate));
    setShowDatePicker(false);
  };

  const handleDecimalChange = (value) => {
    const cleaned = value.replace(/[^0-9]/g, '').slice(0, 1);
    setOdometerDecimal(cleaned === '' ? '0' : cleaned);
  };

  const handleLitersChange = (value) => {
    setLiters(value);
    setEditMode('liters');
    const literNum = parseFloat(value) || 0;
    const priceNum = parseFloat(pricePerLiter) || 0;
    if (literNum > 0 && priceNum > 0) {
      setTotalAmount(String((literNum * priceNum).toFixed(2)));
    }
  };

  const handleAmountChange = (value) => {
    setTotalAmount(value);
    setEditMode('amount');
    const amountNum = parseFloat(value) || 0;
    const priceNum = parseFloat(pricePerLiter) || 0;
    if (amountNum > 0 && priceNum > 0) {
      setLiters(String((amountNum / priceNum).toFixed(2)));
    }
  };

  const handlePriceChange = (value) => {
    setPricePerLiter(value);
    const priceNum = parseFloat(value) || 0;
    if (editMode === 'liters') {
      const literNum = parseFloat(liters) || 0;
      if (literNum > 0 && priceNum > 0) {
        setTotalAmount(String((literNum * priceNum).toFixed(2)));
      }
    } else {
      const amountNum = parseFloat(totalAmount) || 0;
      if (amountNum > 0 && priceNum > 0) {
        setLiters(String((amountNum / priceNum).toFixed(2)));
      }
    }
  };

  const decimalDigit = odometerDecimal === '' ? '0' : odometerDecimal;
  const currentReading = parseFloat(`${odometerDigits.join('')}.${decimalDigit}`);
  const distance = currentReading - lastReading;
  const lastReadingDisplay = Number.isFinite(lastReading) ? Number(lastReading).toFixed(1) : '0.0';
  const distanceDisplay = Number.isFinite(distance) ? distance.toFixed(1) : '0.0';
  const literNum = parseFloat(liters) || 0;
  const priceNum = parseFloat(pricePerLiter) || 0;
  const finalAmount = parseFloat(totalAmount) || (literNum * priceNum);
  const calculatedAvg = (previousLiters > 0 && lastReading > 0 && distance > 0) ? (distance / previousLiters).toFixed(2) : '0.00';

  const formatDate = (date) => {
    const d = new Date(date);
    return `${String(d.getDate()).padStart(2, '0')}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getFullYear()).slice(-2)}`;
  };

  const handleSave = () => {
    if (!editingRecord && currentReading <= lastReading) {
      Alert.alert('Invalid Reading', 'New reading must be greater than last reading');
      return;
    }
    if (literNum <= 0) {
      Alert.alert('Invalid Fuel', 'Please enter valid fuel amount');
      return;
    }

    const d = new Date(selectedDate);
    const isoDate = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

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

      Alert.alert('Success', `Record ${editingRecord ? 'updated' : 'saved'}!\nDistance: ${distanceDisplay} km\nAverage: ${calculatedAvg} km/L`);
      onSave();
      onClose();
    } catch (error) {
      Alert.alert('Error', `Failed to save: ${error.message}`);
    }
  };

  const handleDelete = () => {
    Alert.alert('Delete Record', 'Are you sure you want to delete this record?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: () => {
        try {
          deleteVehicleRecord(editingRecord.id);
          Alert.alert('Deleted', 'Record deleted successfully');
          onSave();
          onClose();
        } catch (error) {
          Alert.alert('Error', `Failed to delete: ${error.message}`);
        }
      }},
    ]);
  };

  return (
    <>
      <Sheet visible={visible} onClose={onClose} scroll>
        {/* Header */}
        <View style={[am.header, { marginBottom: Spacing.lg, gap: Spacing.md }]}>
          <View style={{ flex: 1 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs }}>
              <MaterialCommunityIcons name="gas-station" size={Typography.sizes.xl} color={C.primary} />
              <Text style={[am.title, { color: C.textPrimary, fontSize: Typography.sizes.xxl, fontWeight: Typography.weights.black }]}>
                {editingRecord ? 'Edit' : 'Add'} Fuel Record
              </Text>
            </View>
            <Text style={[am.subtitle, { color: C.textSecondary, fontSize: Typography.sizes.sm }]}>Track your bike mileage</Text>
          </View>
          {editingRecord && (
            <TouchableOpacity
              style={[am.deleteBtn, { backgroundColor: C.expenseLight, borderRadius: Radius.lg }]}
              onPress={handleDelete}
            >
              <Ionicons name="trash-outline" size={20} color={C.expense} />
            </TouchableOpacity>
          )}
        </View>

        {/* Date Input */}
        <View style={[am.section, { marginBottom: Spacing.xl }]}>
          <Text style={[am.label, { color: C.textSecondary, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold, marginBottom: Spacing.md }]}>Date</Text>
          <TouchableOpacity onPress={openDatePicker} activeOpacity={0.7}>
            <View style={[am.inputBox, { backgroundColor: C.bgInput, borderColor: C.primary, borderRadius: Radius.lg, paddingHorizontal: Spacing.lg, gap: Spacing.sm }]}>
              <Ionicons name="calendar-outline" size={20} color={C.primary} />
              <Text style={[am.input, { color: C.textPrimary, fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold, paddingVertical: Spacing.md }]}>{formatDate(selectedDate)}</Text>
            </View>
          </TouchableOpacity>
          <Text style={[am.hint, { color: C.textMuted, fontSize: Typography.sizes.xs, marginTop: Spacing.xs }]}>Tap to choose date</Text>
        </View>

        <DatePickerModal
          visible={showDatePicker}
          selected={toISODate(selectedDate)}
          onSelect={handleDateSelect}
          onClose={() => setShowDatePicker(false)}
        />

        <View style={[am.section, { marginBottom: Spacing.xl }]}>
          <Text style={[am.label, { color: C.textSecondary, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold, marginBottom: Spacing.md }]}>Odometer Reading (km)</Text>
          <View style={[am.odometerRow, { gap: 6 }]}>
            {odometerDigits.map((digit, idx) => (
              <OdometerDigit
                key={idx}
                value={digit}
                onChange={(val) => updateDigit(idx, val)}
              />
            ))}
            <Text style={[am.decimalDot, { color: C.textMuted, fontSize: Typography.sizes.xl, fontWeight: Typography.weights.black }]}>.</Text>
            <OdometerDigit
              value={parseInt(odometerDecimal) || 0}
              onChange={(val) => setOdometerDecimal(String(val))}
              isDecimal
            />
          </View>
          <Text style={[am.hint, { color: C.textMuted, fontSize: Typography.sizes.xs, marginTop: Spacing.xs }]}>Use arrows to adjust digits</Text>
          <View style={[am.infoBox, { backgroundColor: C.primaryDim, marginTop: Spacing.md, padding: Spacing.md, borderRadius: Radius.lg }]}>
            <Text style={[am.infoText, { color: C.primary, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold }]}>
              {editingRecord ? 'Previous' : 'Last'}: {lastReadingDisplay} km | Distance: {distanceDisplay} km
            </Text>
          </View>
        </View>

        {/* Fuel Amount */}
        <View style={{ marginBottom: Spacing.xl }}>
          <Input
            label="Petrol Filled Now (Liters)"
            value={liters}
            onChangeText={handleLitersChange}
            keyboardType="decimal-pad"
            placeholder="0.0"
          />
          <Text style={[am.hint, { color: C.textMuted, fontSize: Typography.sizes.xs, marginTop: Spacing.xs }]}>
            This fuels the riding until your NEXT fill-up — it isn't used for the mileage shown below.
          </Text>
        </View>

        {/* Price Per Liter */}
        <View style={{ marginBottom: Spacing.xl }}>
          <Input
            label="Petrol Price Per Liter (₹)"
            value={pricePerLiter}
            onChangeText={handlePriceChange}
            keyboardType="decimal-pad"
            placeholder="0.00"
          />
        </View>

        {/* Total Amount */}
        <View style={{ marginBottom: Spacing.xs }}>
          <Input
            label="Total Amount (₹)"
            value={totalAmount}
            onChangeText={handleAmountChange}
            keyboardType="decimal-pad"
            placeholder="0.00"
          />
        </View>
        <Text style={[am.hint, { color: C.textMuted, fontSize: Typography.sizes.xs, marginBottom: Spacing.xl }]}>Enter amount to auto-calculate liters</Text>

        {/* Payment Type */}
        <View style={[am.section, { marginBottom: Spacing.xl }]}>
          <Text style={[am.label, { color: C.textSecondary, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold, marginBottom: Spacing.md }]}>Payment Type</Text>
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
              <Ionicons name="card-outline" size={16} color={paymentType === 'online' ? '#fff' : C.primary} />
              <Text style={[am.typeBtnText, { color: paymentType === 'online' ? '#fff' : C.primary, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold }]}>
                Online
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
              <Ionicons name="cash-outline" size={16} color={paymentType === 'cash' ? '#fff' : C.income} />
              <Text style={[am.typeBtnText, { color: paymentType === 'cash' ? '#fff' : C.income, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold }]}>
                Cash
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Summary Card */}
        <Card style={{ borderColor: C.primary, borderWidth: 2, marginBottom: Spacing.xl }}>
          <View style={am.summaryRow}>
            <Text style={[am.summaryLabel, { color: C.textSecondary, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold }]}>Total Amount</Text>
            <Text style={[am.summaryValue, { color: C.expense, fontSize: Typography.sizes.lg, fontWeight: Typography.weights.black }]}>₹{finalAmount.toFixed(2)}</Text>
          </View>
          <View style={[am.divider, { backgroundColor: C.border, marginVertical: Spacing.xs }]} />
          <View style={am.summaryRow}>
            <Text style={[am.summaryLabel, { color: C.textSecondary, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold }]}>Petrol Liters</Text>
            <Text style={[am.summaryValue, { color: C.warning, fontSize: Typography.sizes.lg, fontWeight: Typography.weights.black }]}>{literNum.toFixed(2)} L</Text>
          </View>
          <View style={[am.divider, { backgroundColor: C.border, marginVertical: Spacing.xs }]} />
          <View style={am.summaryRow}>
            <Text style={[am.summaryLabel, { color: C.textSecondary, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold }]}>Mileage Since Last Fill-up</Text>
            <Text style={[am.summaryValue, { color: C.income, fontSize: Typography.sizes.lg, fontWeight: Typography.weights.black }]}>{calculatedAvg} km/L</Text>
          </View>
          <View style={[am.divider, { backgroundColor: C.border, marginVertical: Spacing.xs }]} />
          <View style={am.summaryRow}>
            <Text style={[am.summaryLabel, { color: C.textSecondary, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold }]}>Distance Covered</Text>
            <Text style={[am.summaryValue, { color: C.primary, fontSize: Typography.sizes.lg, fontWeight: Typography.weights.black }]}>{distanceDisplay} km</Text>
          </View>
        </Card>

        {/* Action Buttons */}
        <View style={[am.btnRow, { gap: Spacing.md }]}>
          <Button label="Cancel" variant="secondary" onPress={onClose} style={{ flex: 1 }} />
          <Button label={`${editingRecord ? 'Update' : 'Save'} Record`} variant="primary" onPress={handleSave} style={{ flex: 1 }} />
        </View>
      </Sheet>
    </>
  );
};

const am = StyleSheet.create({
  header: { flexDirection: 'row', alignItems: 'center' },
  title: {},
  subtitle: { marginTop: 2 },
  deleteBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },

  section: {},
  label: { letterSpacing: 0.5 },
  hint: {},

  odometerRow: { flexDirection: 'row', alignItems: 'center' },

  infoBox: {},
  infoText: { textAlign: 'center' },

  typeRow: { flexDirection: 'row' },
  typeBtn: { flex: 1, borderWidth: 2, alignItems: 'center', flexDirection: 'row', justifyContent: 'center' },
  typeBtnText: {},

  inputBox: { flexDirection: 'row', alignItems: 'center', borderWidth: 2 },
  input: { flex: 1 },

  decimalDot: { marginHorizontal: 4 },

  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  summaryLabel: {},
  summaryValue: {},
  divider: { height: 1 },

  btnRow: { flexDirection: 'row' },
});

const Vehicle = () => {
  const { t } = useTranslation();
  const { C, scale } = useTheme();
  const { Typography, Spacing, Radius } = scaleTheme(scale);
  const Shadow = makeShadow(C);
  const [showAddModal, setShowAddModal] = useState(false);
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

  const latestData = vehicleData[0] || { reading: 0, amount: 0, liters: 2 };
  const totalDistance = stats.totalDistance;
  const totalDistanceDisplay = Number.isFinite(totalDistance) ? totalDistance.toFixed(1) : totalDistance;
  const totalFuel = stats.totalFuel;
  const totalAmount = stats.totalAmount;

  const summaryTiles = [
    { icon: 'speedometer-outline', value: stats.totalAvg.toFixed(2), label: 'Overall Avg km/L', color: C.primary },
    { icon: 'trending-up-outline', value: stats.last10Avg.toFixed(2), label: 'Last 10 Fills Avg', color: C.income },
    { icon: 'map-outline', value: totalDistanceDisplay, label: 'Total km', color: C.expense },
    { icon: 'cash-outline', value: `₹${totalAmount.toFixed(0)}`, label: 'Total Spent', color: C.warning },
  ];

  return (
    <View style={[s.container, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={C.isDark ? 'light-content' : 'dark-content'} />

      {/* Header */}
      <LinearGradient
        colors={C.gradients.header}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[s.header, { paddingHorizontal: Spacing.xl, paddingTop: Spacing.xxl, paddingBottom: Spacing.xl, gap: Spacing.md }, Shadow.primary]}
      >
        <IconBadge mciIcon="motorbike" color="#fff" size={52} style={{ backgroundColor: 'rgba(255,255,255,0.2)' }} />
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle, { fontSize: Typography.sizes.xxl, fontWeight: Typography.weights.black }]}>Bike Mileage</Text>
          <Text style={[s.headerSub, { fontSize: Typography.sizes.sm, marginTop: 2 }]}>Track your petrol efficiency</Text>
        </View>
      </LinearGradient>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={{ padding: Spacing.base, paddingBottom: 100 }}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Cards */}
        <View style={[s.summaryGrid, { gap: Spacing.sm, marginBottom: Spacing.lg }]}>
          {summaryTiles.map((tile) => (
            <Card key={tile.label} style={[s.summaryCard, { minWidth: '47%' }]}>
              <IconBadge icon={tile.icon} color={tile.color} size={40} style={{ marginBottom: Spacing.xs }} />
              <Text style={[s.summaryValue, { color: tile.color, fontSize: Typography.sizes.xxl, fontWeight: Typography.weights.black }]}>{tile.value}</Text>
              <Text style={[s.summaryLabel, { color: C.textSecondary, fontSize: Typography.sizes.xs, fontWeight: Typography.weights.semibold }]}>{tile.label}</Text>
            </Card>
          ))}
        </View>

        {/* Records Title */}
        <View style={[s.sectionHeader, { marginBottom: Spacing.md, marginTop: Spacing.sm }]}>
          <Text style={[s.sectionTitle, { color: C.textPrimary, fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold }]}>Fuel Records</Text>
          <Button label="Add" icon="add" size="sm" onPress={() => setShowAddModal(true)} />
        </View>

        {/* Records List */}
        {vehicleData.length === 0 ? (
          <EmptyState
            icon="speedometer-outline"
            title="No fuel records yet"
            subtitle="Add your first fuel record to start tracking mileage"
          />
        ) : (
          vehicleData.map((item, idx) => (
            <TouchableOpacity
              key={idx}
              onPress={() => {
                setEditingRecord(item);
                setShowAddModal(true);
              }}
              activeOpacity={0.7}
            >
              <Card style={{ marginBottom: Spacing.md }}>
                <View style={[s.recordHeader, { marginBottom: Spacing.md }]}>
                  <Chip icon="calendar-outline" label={item.date} color={C.primary} />
                  <Badge label="Reserve" color={C.income} />
                </View>

                <View style={[s.recordGrid, { gap: Spacing.md, marginBottom: Spacing.md }]}>
                  <View style={s.recordItem}>
                    <Text style={[s.recordLabel, { color: C.textMuted, fontSize: Typography.sizes.xs, fontWeight: Typography.weights.semibold }]}>Reading</Text>
                    <Text style={[s.recordValue, { color: C.textPrimary, fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold }]}>{item.formattedReading}</Text>
                  </View>
                  <View style={s.recordItem}>
                    <Text style={[s.recordLabel, { color: C.textMuted, fontSize: Typography.sizes.xs, fontWeight: Typography.weights.semibold }]}>Distance</Text>
                    <Text style={[s.recordValue, { color: C.textPrimary, fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold }]}>{item.formattedDistance} km</Text>
                  </View>
                  <View style={s.recordItem}>
                    <Text style={[s.recordLabel, { color: C.textMuted, fontSize: Typography.sizes.xs, fontWeight: Typography.weights.semibold }]}>Petrol</Text>
                    <Text style={[s.recordValue, { color: C.textPrimary, fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold }]}>{item.liters} L</Text>
                  </View>
                </View>

                <View style={[s.divider, { backgroundColor: C.border, marginBottom: Spacing.md }]} />

                <View style={[s.recordGrid, { gap: Spacing.md }]}>
                  <View style={s.recordItem}>
                    <Text style={[s.recordLabel, { color: C.textMuted, fontSize: Typography.sizes.xs, fontWeight: Typography.weights.semibold }]}>Average</Text>
                    <Text style={[s.recordHighlight, { color: C.primary, fontSize: Typography.sizes.lg, fontWeight: Typography.weights.black }]}>{item.formattedAverage} km/L</Text>
                  </View>
                  <View style={s.recordItem}>
                    <Text style={[s.recordLabel, { color: C.textMuted, fontSize: Typography.sizes.xs, fontWeight: Typography.weights.semibold }]}>Amount</Text>
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
        }}
        lastRecord={latestData}
        editingRecord={editingRecord}
        onSave={loadData}
      />
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: 'row', alignItems: 'center' },
  headerTitle: { color: '#fff', letterSpacing: -0.5 },
  headerSub: { color: 'rgba(255,255,255,0.8)' },

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
