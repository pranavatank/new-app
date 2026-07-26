import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, StyleSheet, TouchableOpacity, StatusBar,
  Modal, Pressable, TextInput, Alert, Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { scaleTheme, makeShadow, Typography, Spacing, Radius } from '../constants/theme';
import { useTheme } from '../store/ThemeContext';
import { getOrCreateDay, setExpenseAmount, recalculateBalance, getAllCategories, getAllVehicleRecords, addVehicleRecord, updateVehicleRecord, deleteVehicleRecord, getVehicleStats } from '../db/queries';

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];
const DAYS_SHORT  = ['Su','Mo','Tu','We','Th','Fr','Sa'];

const toISODate = (d) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

const parseISODate = (s) => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};

// ── Odometer Digit Component ──────────────────────────────────────────────────
const OdometerDigit = ({ value, onChange, C, isDecimal = false }) => (
  <View style={[od.digitBox, { backgroundColor: C.bgInput, borderColor: C.primary }]}>
    <TouchableOpacity 
      style={od.arrow} 
      onPress={() => onChange((value + 1) % 10)}
    >
      <Text style={[od.arrowText, { color: C.primary }]}>▲</Text>
    </TouchableOpacity>
    <Text style={[od.digit, { color: C.textPrimary }]}>{value}</Text>
    <TouchableOpacity 
      style={od.arrow} 
      onPress={() => onChange((value - 1 + 10) % 10)}
    >
      <Text style={[od.arrowText, { color: C.primary }]}>▼</Text>
    </TouchableOpacity>
  </View>
);

const od = StyleSheet.create({
  digitBox: { flex: 1, borderRadius: Radius.lg, borderWidth: 2, overflow: 'hidden', alignItems: 'center' },
  arrow: { width: '100%', paddingVertical: 6, alignItems: 'center', justifyContent: 'center' },
  arrowText: { fontSize: 10, fontWeight: Typography.weights.bold },
  digit: { fontSize: 24, fontWeight: Typography.weights.black, paddingVertical: 6 },
});

const DatePickerModal = ({ visible, selected, onSelect, onClose, C, Shadow }) => {
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
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={[dp.overlay, { backgroundColor: C.overlay }]} onPress={onClose}>
        <Pressable style={[dp.card, { backgroundColor: C.bgCard, borderColor: C.border }, Shadow.md]} onPress={(e) => e.stopPropagation()}>
          <View style={dp.head}>
            <Text style={[dp.title, { color: C.textPrimary }]}>Select Date</Text>
            <TouchableOpacity style={[dp.closeBtn, { backgroundColor: C.bgElevated }]} onPress={onClose}>
              <Text style={[dp.closeTxt, { color: C.textSecondary }]}>X</Text>
            </TouchableOpacity>
          </View>

          <View style={dp.monthRow}>
            <TouchableOpacity style={[dp.navBtn, { backgroundColor: C.bgElevated }]} onPress={prevMonth}>
              <Text style={[dp.navTxt, { color: C.primary }]}>{'<'}</Text>
            </TouchableOpacity>
            <Text style={[dp.monthTxt, { color: C.textPrimary }]}>{MONTHS[mo]} {yr}</Text>
            <TouchableOpacity style={[dp.navBtn, { backgroundColor: C.bgElevated }]} onPress={nextMonth}>
              <Text style={[dp.navTxt, { color: C.primary }]}>{'>'}</Text>
            </TouchableOpacity>
          </View>

          <View style={dp.weekRow}>
            {DAYS_SHORT.map((d) => (
              <Text key={d} style={[dp.weekTxt, { color: C.textMuted }]}>{d}</Text>
            ))}
          </View>

          <View style={dp.grid}>
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
                    isSel && { backgroundColor: C.primary },
                    !isSel && isToday && { borderColor: C.primary },
                  ]}
                  onPress={() => { onSelect(dateStr); onClose(); }}
                >
                  <Text
                    style={[
                      dp.dayTxt,
                      { color: isSel ? '#fff' : C.textPrimary },
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
            style={[dp.todayBtn, { backgroundColor: C.primaryDim }]}
            onPress={() => { onSelect(todayStr); onClose(); }}
          >
            <Text style={[dp.todayTxt, { color: C.primary }]}>Today</Text>
          </TouchableOpacity>
        </Pressable>
      </Pressable>
    </Modal>
  );
};

const dp = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: Spacing.lg },
  card: { width: '100%', maxWidth: 360, borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.lg },
  head: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  title: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold },
  closeBtn: { width: 32, height: 32, borderRadius: 16, alignItems: 'center', justifyContent: 'center' },
  closeTxt: { fontSize: 14, fontWeight: Typography.weights.bold },
  monthRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  navBtn: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center' },
  navTxt: { fontSize: 20, fontWeight: Typography.weights.bold },
  monthTxt: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold },
  weekRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.sm },
  weekTxt: { width: 36, textAlign: 'center', fontSize: Typography.sizes.xs, fontWeight: Typography.weights.semibold },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs },
  cell: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  dayCell: { borderRadius: 18, borderWidth: 1, borderColor: 'transparent' },
  dayTxt: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.medium },
  todayBtn: { marginTop: Spacing.sm, paddingVertical: Spacing.md, borderRadius: Radius.full, alignItems: 'center' },
  todayTxt: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold },
});

// ── Add Record Modal ──────────────────────────────────────────────────────────
const AddRecordModal = ({ visible, onClose, lastRecord, editingRecord, C, Shadow, onSave }) => {
  const lastReading = editingRecord ? editingRecord.prevReading : (lastRecord?.reading || 0);
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

  React.useEffect(() => {
    console.log('Odometer Digits:', odometerDigits);
    console.log('Odometer Decimal:', odometerDecimal);
    console.log('Current Reading:', currentReading);
  }, [odometerDigits, odometerDecimal]);

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
    console.log('Updated Decimal:', cleaned); // Debugging log
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
  const calculatedAvg = (literNum > 0 && lastReading > 0) ? (distance / literNum).toFixed(2) : '0.00';
  
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
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={am.overlay}>
        <Pressable style={[am.backdrop, { backgroundColor: C.overlay }]} onPress={onClose} />
        <View style={[am.modal, { backgroundColor: C.bgCard }, Shadow.lg]}>
          <View style={[am.handle, { backgroundColor: C.border }]} />
          
          {/* Header */}
          <View style={am.header}>
            <View style={{ flex: 1 }}>
              <Text style={[am.title, { color: C.textPrimary }]}>⛽ {editingRecord ? 'Edit' : 'Add'} Fuel Record</Text>
              <Text style={[am.subtitle, { color: C.textSecondary }]}>Track your bike mileage</Text>
            </View>
            {editingRecord && (
              <TouchableOpacity 
                style={[am.deleteBtn, { backgroundColor: C.expense + '20' }]}
                onPress={handleDelete}
              >
                <Text style={{ fontSize: 18 }}>🗑️</Text>
              </TouchableOpacity>
            )}
          </View>

          <ScrollView showsVerticalScrollIndicator={false}>
            {/* Date Input */}
            <View style={am.section}>
              <Text style={[am.label, { color: C.textSecondary }]}>📅 Date</Text>
              <TouchableOpacity onPress={openDatePicker} activeOpacity={0.7}>
                <View style={[am.inputBox, { backgroundColor: C.bgInput, borderColor: C.primary }]}> 
                  <Text style={[am.input, { color: C.textPrimary }]}>{formatDate(selectedDate)}</Text>
                </View>
              </TouchableOpacity>
              <Text style={[am.hint, { color: C.textMuted }]}>Tap to choose date</Text>
            </View>

            {showDatePicker && (
              <DatePickerModal
                visible={showDatePicker}
                selected={toISODate(selectedDate)}
                onSelect={handleDateSelect}
                onClose={() => setShowDatePicker(false)}
                C={C}
                Shadow={Shadow}
              />
            )}

            {false && (
              <View style={am.datePickerOverlay}>
                <View style={[am.datePickerBox, { backgroundColor: C.bgCard, borderColor: C.border }, Shadow.lg]}>
                  <Text style={[am.datePickerTitle, { color: C.textPrimary }]}>Pick Date</Text>
                  <View style={am.datePickerRow}>
                    <TouchableOpacity onPress={() => changeDateBy(-1)} style={am.datePickerNav}><Text style={{color: C.textPrimary}}>◀</Text></TouchableOpacity>
                    <Text style={[am.datePickerValue, { color: C.textPrimary }]}>{formatDate(datePickerDate)}</Text>
                    <TouchableOpacity onPress={() => changeDateBy(1)} style={am.datePickerNav}><Text style={{color: C.textPrimary}}>▶</Text></TouchableOpacity>
                  </View>
                  <View style={am.datePickerActions}>
                    <TouchableOpacity onPress={cancelDatePicker} style={[am.btn, am.btnCancel, { borderColor: C.border }]}><Text style={[am.btnText, { color: C.textSecondary }]}>Cancel</Text></TouchableOpacity>
                    <TouchableOpacity onPress={applyDatePicker} style={[am.btn, am.btnSave, { backgroundColor: C.primary }]}><Text style={[am.btnText, { color: '#fff' }]}>OK</Text></TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
            <View style={am.section}>
              <Text style={[am.label, { color: C.textSecondary }]}>📊 Odometer Reading (km)</Text>
              <View style={am.odometerRow}>
                {odometerDigits.map((digit, idx) => (
                  <OdometerDigit
                    key={idx}
                    value={digit}
                    onChange={(val) => updateDigit(idx, val)}
                    C={C}
                  />
                ))}
                <Text style={[am.decimalDot, { color: C.textMuted }]}>.</Text>
                <OdometerDigit
                  value={parseInt(odometerDecimal) || 0}
                  onChange={(val) => setOdometerDecimal(String(val))}
                  C={C}
                  isDecimal={true}
                />
              </View>
              <Text style={[am.hint, { color: C.textMuted }]}>Use arrows to adjust digits</Text>
              <View style={[am.infoBox, { backgroundColor: C.primary + '15' }]}>
                <Text style={[am.infoText, { color: C.primary }]}>
                  {editingRecord ? 'Previous' : 'Last'}: {lastReadingDisplay} km | Distance: {distanceDisplay} km
                </Text>
              </View>
            </View>

            {/* Fuel Amount */}
            <View style={am.section}>
              <Text style={[am.label, { color: C.textSecondary }]}>⛽ Petrol Amount (Liters)</Text>
              <View style={[am.inputBox, { backgroundColor: C.bgInput, borderColor: editMode === 'liters' ? C.primary : C.border }]}>
                <TextInput
                  style={[am.input, { color: C.textPrimary }]}
                  value={liters}
                  onChangeText={handleLitersChange}
                  keyboardType="decimal-pad"
                  placeholder="0.0"
                  placeholderTextColor={C.textMuted}
                />
                <Text style={[am.unit, { color: C.textMuted }]}>L</Text>
              </View>
            </View>

            {/* Price Per Liter */}
            <View style={am.section}>
              <Text style={[am.label, { color: C.textSecondary }]}>💰 Petrol Price Per Liter</Text>
              <View style={[am.inputBox, { backgroundColor: C.bgInput, borderColor: C.primary }]}>
                <Text style={[am.rupee, { color: C.primary }]}>₹</Text>
                <TextInput
                  style={[am.input, { color: C.textPrimary }]}
                  value={pricePerLiter}
                  onChangeText={handlePriceChange}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={C.textMuted}
                />
              </View>
            </View>

            {/* Total Amount */}
            <View style={am.section}>
              <Text style={[am.label, { color: C.textSecondary }]}>💵 Total Amount</Text>
              <View style={[am.inputBox, { backgroundColor: C.bgInput, borderColor: editMode === 'amount' ? C.primary : C.border }]}>
                <Text style={[am.rupee, { color: C.primary }]}>₹</Text>
                <TextInput
                  style={[am.input, { color: C.textPrimary }]}
                  value={totalAmount}
                  onChangeText={handleAmountChange}
                  keyboardType="decimal-pad"
                  placeholder="0.00"
                  placeholderTextColor={C.textMuted}
                />
              </View>
              <Text style={[am.hint, { color: C.textMuted }]}>Enter amount to auto-calculate liters</Text>
            </View>

            {/* Payment Type */}
            <View style={am.section}>
              <Text style={[am.label, { color: C.textSecondary }]}>💳 Payment Type</Text>
              <View style={am.typeRow}>
                <TouchableOpacity
                  style={[am.typeBtn, {
                    backgroundColor: paymentType === 'online' ? C.primary : C.bgInput,
                    borderColor: C.primary,
                  }]}
                  onPress={() => setPaymentType('online')}
                >
                  <Text style={[am.typeBtnText, { color: paymentType === 'online' ? '#fff' : C.primary }]}>
                    🌐 Online
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[am.typeBtn, {
                    backgroundColor: paymentType === 'cash' ? C.income : C.bgInput,
                    borderColor: C.income,
                  }]}
                  onPress={() => setPaymentType('cash')}
                >
                  <Text style={[am.typeBtnText, { color: paymentType === 'cash' ? '#fff' : C.income }]}>
                    💵 Cash
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Summary Card */}
            <View style={[am.summaryCard, { backgroundColor: C.isDark ? C.bgElevated : C.primary + '10', borderColor: C.primary }]}>
              <View style={am.summaryRow}>
                <Text style={[am.summaryLabel, { color: C.textSecondary }]}>Total Amount</Text>
                <Text style={[am.summaryValue, { color: C.expense }]}>₹{finalAmount.toFixed(2)}</Text>
              </View>
              <View style={[am.divider, { backgroundColor: C.border }]} />
              <View style={am.summaryRow}>
                <Text style={[am.summaryLabel, { color: C.textSecondary }]}>Petrol Liters</Text>
                <Text style={[am.summaryValue, { color: C.warning }]}>{literNum.toFixed(2)} L</Text>
              </View>
              <View style={[am.divider, { backgroundColor: C.border }]} />
              <View style={am.summaryRow}>
                <Text style={[am.summaryLabel, { color: C.textSecondary }]}>Calculated Average</Text>
                <Text style={[am.summaryValue, { color: C.income }]}>{calculatedAvg} km/L</Text>
              </View>
              <View style={[am.divider, { backgroundColor: C.border }]} />
              <View style={am.summaryRow}>
                <Text style={[am.summaryLabel, { color: C.textSecondary }]}>Distance Covered</Text>
                <Text style={[am.summaryValue, { color: C.primary }]}>{distanceDisplay} km</Text>
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={am.btnRow}>
            <TouchableOpacity 
              style={[am.btn, am.btnCancel, { borderColor: C.border }]} 
              onPress={onClose}
            >
              <Text style={[am.btnText, { color: C.textSecondary }]}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={[am.btn, am.btnSave, { backgroundColor: C.primary }]} 
              onPress={handleSave}
            >
              <Text style={[am.btnText, { color: '#fff' }]}>{editingRecord ? 'Update' : 'Save'} Record</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const am = StyleSheet.create({
  overlay: { flex: 1, justifyContent: 'flex-end' },
  backdrop: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 },
  modal: { borderTopLeftRadius: 32, borderTopRightRadius: 32, maxHeight: '90%' },
  handle: { width: 44, height: 4, borderRadius: 2, alignSelf: 'center', marginTop: Spacing.md, marginBottom: Spacing.lg },
  
  header: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.lg, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  title: { fontSize: Typography.sizes.xxl, fontWeight: Typography.weights.black, marginBottom: 4 },
  subtitle: { fontSize: Typography.sizes.sm },
  deleteBtn: { width: 44, height: 44, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center' },
  
  section: { paddingHorizontal: Spacing.xl, marginBottom: Spacing.xl },
  label: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold, marginBottom: Spacing.md, letterSpacing: 0.5 },
  hint: { fontSize: Typography.sizes.xs, marginTop: Spacing.xs },
  
  odometerRow: { flexDirection: 'row', gap: 6, alignItems: 'center' },
  
  infoBox: { marginTop: Spacing.md, padding: Spacing.md, borderRadius: Radius.lg },
  infoText: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold, textAlign: 'center' },
  
  typeRow: { flexDirection: 'row', gap: Spacing.sm },
  typeBtn: { flex: 1, paddingVertical: Spacing.md, borderRadius: Radius.lg, borderWidth: 2, alignItems: 'center' },
  typeBtnText: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold },
  
  inputBox: { flexDirection: 'row', alignItems: 'center', borderRadius: Radius.lg, borderWidth: 2, paddingHorizontal: Spacing.lg, gap: Spacing.sm },
  input: { flex: 1, fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold, paddingVertical: Spacing.md },
  unit: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold },
  rupee: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.black },

  datePickerOverlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.35)', justifyContent: 'center', alignItems: 'center' },
  datePickerBox: { width: '85%', borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.lg, gap: Spacing.sm },
  datePickerTitle: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold, marginBottom: Spacing.sm },
  datePickerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: Spacing.md },
  datePickerNav: { padding: Spacing.sm },
  datePickerValue: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.black },
  datePickerActions: { flexDirection: 'row', gap: Spacing.sm, justifyContent: 'space-between' },
  
  summaryCard: { marginHorizontal: Spacing.xl, marginBottom: Spacing.xl, padding: Spacing.lg, borderRadius: Radius.xl, borderWidth: 2 },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: Spacing.sm },
  summaryLabel: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold },
  summaryValue: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.black },
  divider: { height: 1, marginVertical: Spacing.xs },
  
  btnRow: { flexDirection: 'row', gap: Spacing.md, paddingHorizontal: Spacing.xl, paddingBottom: Spacing.xl, paddingTop: Spacing.md },
  btn: { flex: 1, paddingVertical: Spacing.lg, borderRadius: Radius.xl, alignItems: 'center' },
  btnCancel: { borderWidth: 2 },
  btnSave: {},
  btnText: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold },
});

const Vehicle = () => {
  const { t } = useTranslation();
  const { C } = useTheme();
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
      
      let readDiff = 0;
      let average = null;
      let prevReading = 0;
      
      if (idx < arr.length - 1) {
        const nextRecord = arr[idx + 1];
        prevReading = Number(nextRecord.reading) || 0;
        if (prevReading > 0) {
          readDiff = record.reading - prevReading;
          if (readDiff > 0 && record.liters > 0) {
            average = readDiff / record.liters;
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

  return (
    <View style={[s.container, { backgroundColor: C.bgPrimary }]}>
      <StatusBar barStyle={C.isDark ? 'light-content' : 'dark-content'} backgroundColor={C.bgPrimary} />
      
      {/* Header */}
      <View style={[s.header, { backgroundColor: C.isDark ? C.bgElevated : C.primary }, Shadow.primary]}>
        <Text style={s.headerIcon}>🏍️</Text>
        <View style={s.headerText}>
          <Text style={s.headerTitle}>Bike Mileage</Text>
          <Text style={s.headerSub}>Track your petrol efficiency</Text>
        </View>
      </View>

      <ScrollView style={s.scroll} showsVerticalScrollIndicator={false}>
        {/* Summary Cards */}
        <View style={s.summaryGrid}>
          <View style={[s.summaryCard, { backgroundColor: C.bgCard }, Shadow.md]}>
            <Text style={[s.summaryIcon]}>⛽</Text>
            <Text style={[s.summaryValue, { color: C.primary }]}>{stats.totalAvg.toFixed(2)}</Text>
            <Text style={[s.summaryLabel, { color: C.textSecondary }]}>Avg km/L</Text>
          </View>

          <View style={[s.summaryCard, { backgroundColor: C.bgCard }, Shadow.md]}>
            <Text style={[s.summaryIcon]}>📊</Text>
            <Text style={[s.summaryValue, { color: C.income }]}>{stats.last10Avg.toFixed(2)}</Text>
            <Text style={[s.summaryLabel, { color: C.textSecondary }]}>Last 10 Avg</Text>
          </View>

          <View style={[s.summaryCard, { backgroundColor: C.bgCard }, Shadow.md]}>
            <Text style={[s.summaryIcon]}>🛣️</Text>
            <Text style={[s.summaryValue, { color: C.expense }]}>{totalDistanceDisplay}</Text>
            <Text style={[s.summaryLabel, { color: C.textSecondary }]}>Total km</Text>
          </View>

          <View style={[s.summaryCard, { backgroundColor: C.bgCard }, Shadow.md]}>
            <Text style={[s.summaryIcon]}>💰</Text>
            <Text style={[s.summaryValue, { color: C.warning }]}>₹{totalAmount.toFixed(0)}</Text>
            <Text style={[s.summaryLabel, { color: C.textSecondary }]}>Total Spent</Text>
          </View>
        </View>

        {/* Records Title */}
        <View style={s.sectionHeader}>
          <Text style={[s.sectionTitle, { color: C.textPrimary }]}>Fuel Records</Text>
          <TouchableOpacity 
            style={[s.addBtn, { backgroundColor: C.primary }]}
            onPress={() => setShowAddModal(true)}
          >
            <Text style={s.addBtnText}>+ Add</Text>
          </TouchableOpacity>
        </View>

        {/* Records List */}
        {vehicleData.map((item, idx) => (
          <TouchableOpacity 
            key={idx} 
            style={[s.recordCard, { backgroundColor: C.bgCard }, Shadow.sm]}
            onPress={() => {
              setEditingRecord(item);
              setShowAddModal(true);
            }}
            activeOpacity={0.7}
          >
            <View style={s.recordHeader}>
              <View style={[s.dateBadge, { backgroundColor: C.primary + '20' }]}>
                <Text style={[s.dateText, { color: C.primary }]}>📅 {item.date}</Text>
              </View>
              <View style={[s.typeBadge, { backgroundColor: C.income + '20' }]}>
                <Text style={[s.typeText, { color: C.income }]}>Reserve</Text>
              </View>
            </View>

            <View style={s.recordGrid}>
              <View style={s.recordItem}>
                <Text style={[s.recordLabel, { color: C.textMuted }]}>Reading</Text>
                <Text style={[s.recordValue, { color: C.textPrimary }]}>{item.formattedReading}</Text>
              </View>
              <View style={s.recordItem}>
                <Text style={[s.recordLabel, { color: C.textMuted }]}>Distance</Text>
                <Text style={[s.recordValue, { color: C.textPrimary }]}>{item.formattedDistance} km</Text>
              </View>
              <View style={s.recordItem}>
                <Text style={[s.recordLabel, { color: C.textMuted }]}>Petrol</Text>
                <Text style={[s.recordValue, { color: C.textPrimary }]}>{item.liters} L</Text>
              </View>
            </View>

            <View style={[s.divider, { backgroundColor: C.border }]} />

            <View style={s.recordGrid}>
              <View style={s.recordItem}>
                <Text style={[s.recordLabel, { color: C.textMuted }]}>Average</Text>
                <Text style={[s.recordHighlight, { color: C.primary }]}>{item.formattedAverage} km/L</Text>
              </View>
              <View style={s.recordItem}>
                <Text style={[s.recordLabel, { color: C.textMuted }]}>Amount</Text>
                <Text style={[s.recordHighlight, { color: C.expense }]}>₹{item.amount.toFixed(2)}</Text>
              </View>
            </View>
          </TouchableOpacity>
        ))}

        <View style={{ height: 20 }} />
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
        C={C}
        Shadow={Shadow}
      />
    </View>
  );
};

const s = StyleSheet.create({
  container: { flex: 1 },
  header: { padding: Spacing.xl, paddingTop: Spacing.xxl, flexDirection: 'row', alignItems: 'center', gap: Spacing.md },
  headerIcon: { fontSize: 48 },
  headerText: { flex: 1 },
  headerTitle: { fontSize: Typography.sizes.xxl, fontWeight: Typography.weights.black, color: '#fff', letterSpacing: -0.5 },
  headerSub: { fontSize: Typography.sizes.sm, color: 'rgba(255,255,255,0.7)', marginTop: 2 },
  
  scroll: { flex: 1, padding: Spacing.base },
  
  summaryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.sm, marginBottom: Spacing.lg },
  summaryCard: { flex: 1, minWidth: '47%', padding: Spacing.lg, borderRadius: Radius.xl, alignItems: 'center' },
  summaryIcon: { fontSize: 32, marginBottom: Spacing.xs },
  summaryValue: { fontSize: Typography.sizes.xxl, fontWeight: Typography.weights.black, marginBottom: 2 },
  summaryLabel: { fontSize: Typography.sizes.xs, fontWeight: Typography.weights.semibold, textTransform: 'uppercase', letterSpacing: 0.5 },
  
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: Spacing.md, marginTop: Spacing.sm },
  sectionTitle: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold },
  addBtn: { paddingHorizontal: Spacing.lg, paddingVertical: Spacing.sm, borderRadius: Radius.full },
  addBtnText: { color: '#fff', fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold },
  
  recordCard: { borderRadius: Radius.xl, padding: Spacing.lg, marginBottom: Spacing.md },
  recordHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: Spacing.md },
  dateBadge: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.full },
  dateText: { fontSize: Typography.sizes.xs, fontWeight: Typography.weights.bold },
  typeBadge: { paddingHorizontal: Spacing.md, paddingVertical: Spacing.xs, borderRadius: Radius.full },
  typeText: { fontSize: Typography.sizes.xs, fontWeight: Typography.weights.bold },
  
  recordGrid: { flexDirection: 'row', gap: Spacing.md, marginBottom: Spacing.md },
  recordItem: { flex: 1 },
  recordLabel: { fontSize: Typography.sizes.xs, fontWeight: Typography.weights.semibold, marginBottom: 4, textTransform: 'uppercase', letterSpacing: 0.5 },
  recordValue: { fontSize: Typography.sizes.md, fontWeight: Typography.weights.bold },
  recordHighlight: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.black },
  
  decimalDot: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.black, marginHorizontal: 4 },
  decimalInputInline: { width: 36, fontSize: Typography.sizes.xl, fontWeight: Typography.weights.black, textAlign: 'center', borderRadius: Radius.md, borderWidth: 1, paddingVertical: Spacing.xs },
  
  divider: { height: 1, marginBottom: Spacing.md },
});

export default Vehicle;
