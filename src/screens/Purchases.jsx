import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, TextInput, Image, Alert, Modal, KeyboardAvoidingView, Platform, StatusBar, ActivityIndicator } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import ScreenHeader from '../components/common/ScreenHeader';
import useLedgerTheme from '../components/ledger/useLedgerTheme';
import { getPurchases, savePurchase, deletePurchase } from '../db/ledger';
import { persistPurchaseImage } from '../services/purchaseImages';
import { money } from '../components/ledger/LedgerEntryRow';

const CATEGORIES = ['appliances', 'clothes', 'other'];
const today = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const validDate = value => {
  const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!match) return false;
  const [, y, m, d] = match.map(Number);
  const date = new Date(y, m - 1, d);
  return date.getFullYear() === y && date.getMonth() === m - 1 && date.getDate() === d;
};
const numberValue = value => Number(String(value).replace(/[૦-૯]/g, digit => String('૦૧૨૩૪૫૬૭૮૯'.indexOf(digit))).replace(/[,\s]/g, ''));
const dateLabel = (value, locale) => validDate(value) ? new Date(`${value}T00:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }) : value;
const blank = () => ({ name: '', date: today(), category: 'other', amount: '', shop: '', details: '', image_uri: '' });

function PurchaseForm({ visible, item, onClose, onSaved }) {
  const { C, scale } = useLedgerTheme();
  const { t, i18n } = useTranslation();
  const insets = useSafeAreaInsets();
  const [form, setForm] = useState(blank);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState(false);
  const initial = useRef(form);
  const saveLock = useRef(false);

  useEffect(() => {
    if (!visible) return;
    const value = item ? { name: item.name || '', date: item.date || today(), category: item.category || 'other', amount: item.amount == null ? '' : String(item.amount), shop: item.shop || '', details: item.details || '', image_uri: item.image_uri || '' } : blank();
    initial.current = value; setForm(value); setError('');
  }, [visible, item]);

  const update = (key, value) => { setForm(current => ({ ...current, [key]: value })); setError(''); };
  const dirty = JSON.stringify(form) !== JSON.stringify(initial.current);
  const close = () => {
    if (saving || picking) return;
    if (!dirty) { onClose(); return; }
    Alert.alert(t('purchases.unsavedTitle'), t('purchases.unsavedBody'), [
      { text: t('purchases.keepEditing'), style: 'cancel' },
      { text: t('purchases.discard'), style: 'destructive', onPress: () => { const next = blank(); initial.current = next; setForm(next); setError(''); onClose(); } },
    ]);
  };

  const choosePhoto = async () => {
    if (picking) return;
    setPicking(true); setError('');
    try {
      if (Platform.OS !== 'web') {
        const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (!permission.granted) { setError(t('purchases.photoPermission')); return; }
      }
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [4, 3],
        quality: 0.55,
        base64: Platform.OS === 'web',
      });
      if (result.canceled) return;
      const uri = await persistPurchaseImage(result.assets?.[0]);
      update('image_uri', uri);
    } catch (e) {
      setError(t('purchases.photoError'));
    } finally { setPicking(false); }
  };

  const save = () => {
    if (saveLock.current) return;
    if (!form.name.trim()) { setError(t('purchases.nameRequired')); return; }
    if (!validDate(form.date)) { setError(t('purchases.dateInvalid')); return; }
    const amount = form.amount.trim() ? numberValue(form.amount) : null;
    if (amount !== null && (!Number.isFinite(amount) || amount <= 0)) { setError(t('purchases.amountInvalid')); return; }
    saveLock.current = true; setSaving(true); setError('');
    try {
      const id = savePurchase({ id: item?.id, name: form.name.trim(), date: form.date, category: form.category, amount, shop: form.shop.trim(), details: form.details.trim(), image_uri: form.image_uri || null });
      const next = blank(); initial.current = next; setForm(next); onSaved?.(id); onClose();
    } catch (e) {
      setError(t('purchases.saveError'));
    } finally { saveLock.current = false; setSaving(false); }
  };

  const label = { color: C.textSecondary, fontSize: 16, fontWeight: '700', marginBottom: 6 };
  const field = { minHeight: 52, borderWidth: 1, borderColor: C.border, borderRadius: 13, paddingHorizontal: 13, paddingVertical: 10, color: C.textPrimary, backgroundColor: C.bgInput, fontSize: 17, marginBottom: 13 };
  const locale = i18n.language === 'gu' ? 'gu-IN-u-nu-latn' : 'en-IN';
  return <Modal visible={visible} transparent animationType="slide" onRequestClose={close}>
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={{ flex: 1, justifyContent: 'flex-end', backgroundColor: C.overlay }}>
      <View style={{ maxHeight: '95%', backgroundColor: C.bgCard, borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 18, paddingBottom: (insets?.bottom || 0) + 18 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}><View style={{ flex: 1 }}><Text style={{ color: C.textPrimary, fontSize: 20, fontWeight: '900' }}>{item ? t('purchases.editTitle') : t('purchases.addTitle')}</Text><Text style={{ color: C.textSecondary, fontSize: 15, marginTop: 3 }}>{t('purchases.independent')}</Text></View><TouchableOpacity onPress={close} style={{ width: 48, height: 48, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="close" size={24} color={C.textSecondary} /></TouchableOpacity></View>
        <ScrollView keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 6 }}>
          <Text style={label}>{t('purchases.name')}</Text><TextInput style={field} value={form.name} onChangeText={v => update('name', v)} placeholder={t('purchases.namePlaceholder')} placeholderTextColor={C.textMuted} />
          <Text style={label}>{t('purchases.date')}</Text><TextInput style={field} value={form.date} onChangeText={v => update('date', v)} placeholder="YYYY-MM-DD" placeholderTextColor={C.textMuted} keyboardType="numbers-and-punctuation" />
          <Text style={label}>{t('purchases.category')}</Text><View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>{CATEGORIES.map(category => <TouchableOpacity key={category} onPress={() => update('category', category)} style={{ minHeight: 46, justifyContent: 'center', paddingHorizontal: 14, borderRadius: 23, borderWidth: 1, borderColor: form.category === category ? C.primary : C.border, backgroundColor: form.category === category ? C.primaryDim : C.bgCard, marginRight: 8, marginBottom: 8 }}><Text style={{ color: form.category === category ? C.primary : C.textSecondary, fontWeight: '700', fontSize: 15 }}>{t(`purchases.categories.${category}`)}</Text></TouchableOpacity>)}</View>
          <Text style={label}>{t('purchases.amountOptional')}</Text><TextInput style={field} value={form.amount} onChangeText={v => update('amount', v)} placeholder={t('purchases.amountPlaceholder')} placeholderTextColor={C.textMuted} keyboardType="decimal-pad" />
          <Text style={label}>{t('purchases.shopOptional')}</Text><TextInput style={field} value={form.shop} onChangeText={v => update('shop', v)} placeholder={t('purchases.shopPlaceholder')} placeholderTextColor={C.textMuted} />
          <Text style={label}>{t('purchases.detailsOptional')}</Text><TextInput style={[field, { minHeight: 90, textAlignVertical: 'top' }]} value={form.details} onChangeText={v => update('details', v)} placeholder={t('purchases.detailsPlaceholder')} placeholderTextColor={C.textMuted} multiline />
          <Text style={label}>{t('purchases.photoOptional')}</Text>
          {form.image_uri ? <View style={{ marginBottom: 12 }}><Image source={{ uri: form.image_uri }} resizeMode="cover" style={{ width: '100%', height: 190, borderRadius: 14, backgroundColor: C.bgElevated }} /><TouchableOpacity onPress={() => update('image_uri', '')} style={{ minHeight: 44, justifyContent: 'center', alignSelf: 'flex-start', paddingHorizontal: 10 }}><Text style={{ color: C.expense, fontSize: 15, fontWeight: '700' }}>{t('purchases.removePhoto')}</Text></TouchableOpacity></View> : <TouchableOpacity onPress={choosePhoto} disabled={picking} style={{ minHeight: 54, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderWidth: 1, borderColor: C.border, borderRadius: 14, backgroundColor: C.bgElevated, marginBottom: 12 }}>{picking ? <ActivityIndicator color={C.primary} /> : <Ionicons name="camera-outline" size={22} color={C.primary} />}<Text style={{ color: C.primary, fontWeight: '800', fontSize: 16 }}>{picking ? t('purchases.loadingPhoto') : t('purchases.choosePhoto')}</Text></TouchableOpacity>}
          {!!error && <Text accessibilityRole="alert" style={{ color: C.expense, fontSize: 16, marginBottom: 12 }}>{error}</Text>}
          <TouchableOpacity disabled={saving || picking} onPress={save} style={{ minHeight: 58, borderRadius: 15, backgroundColor: C.primary, opacity: saving || picking ? 0.6 : 1, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: C.textOnPrimary, fontWeight: '900', fontSize: 18 }}>{saving ? t('purchases.saving') : t('common.save')}</Text></TouchableOpacity>
        </ScrollView>
      </View>
    </KeyboardAvoidingView>
  </Modal>;
}

export default function Purchases({ navigation }) {
  const { C } = useLedgerTheme();
  const { t, i18n } = useTranslation();
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState({ visible: false, item: null });
  const [loadError, setLoadError] = useState(false);
  const locale = i18n.language === 'gu' ? 'gu-IN-u-nu-latn' : 'en-IN';
  const load = useCallback(() => { try { setItems(getPurchases()); setLoadError(false); } catch (e) { setLoadError(true); } }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  const selected = items.find(item => item.id === selectedId) || null;
  const openAdd = () => setForm({ visible: true, item: null });
  const openEdit = () => selected && setForm({ visible: true, item: selected });
  const onSaved = id => { load(); setSelectedId(id); };
  const removeSelected = () => {
    if (!selected) return;
    Alert.alert(t('purchases.removeTitle'), t('purchases.removeConfirm'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('common.delete'), style: 'destructive', onPress: () => {
        try { deletePurchase(selected.id); setSelectedId(null); load(); }
        catch (e) { Alert.alert(t('ledger.error'), t('purchases.removeError')); }
      } },
    ]);
  };
  const card = { backgroundColor: C.bgCard, borderColor: C.border, borderWidth: 1, borderRadius: 18, padding: 13, marginBottom: 11 };
  return <View style={{ flex: 1, backgroundColor: C.bg }}>
    <StatusBar barStyle={C.isDark ? 'light-content' : 'dark-content'} backgroundColor={C.bgCard} />
    {selected ? <>
      <ScreenHeader title={selected.name} onBack={() => setSelectedId(null)} rightIcon="create-outline" onRightPress={openEdit} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
        {selected.image_uri ? <Image source={{ uri: selected.image_uri }} resizeMode="cover" style={{ width: '100%', height: 250, borderRadius: 20, backgroundColor: C.bgElevated, marginBottom: 16 }} /> : <View style={{ height: 150, borderRadius: 20, backgroundColor: C.bgElevated, alignItems: 'center', justifyContent: 'center', marginBottom: 16 }}><Ionicons name="bag-handle-outline" size={46} color={C.primary} /></View>}
        <View style={card}>
          <Text style={{ color: C.textPrimary, fontSize: 23, fontWeight: '900' }}>{selected.name}</Text>
          <Text style={{ color: C.textSecondary, fontSize: 17, marginTop: 8 }}>{dateLabel(selected.date, locale)} · {t(`purchases.categories.${CATEGORIES.includes(selected.category) ? selected.category : 'other'}`)}</Text>
          {selected.amount != null && <Text style={{ color: C.primary, fontSize: 24, fontWeight: '900', marginTop: 16 }}>{money(selected.amount, i18n.language)}</Text>}
          {!!selected.shop && <View style={{ marginTop: 18 }}><Text style={{ color: C.textMuted, fontSize: 14, fontWeight: '800' }}>{t('purchases.shop')}</Text><Text style={{ color: C.textPrimary, fontSize: 18, marginTop: 3 }}>{selected.shop}</Text></View>}
          {!!selected.details && <View style={{ marginTop: 18 }}><Text style={{ color: C.textMuted, fontSize: 14, fontWeight: '800' }}>{t('purchases.details')}</Text><Text style={{ color: C.textPrimary, fontSize: 17, lineHeight: 25, marginTop: 3 }}>{selected.details}</Text></View>}
        </View>
        <Text style={{ color: C.textSecondary, fontSize: 15, lineHeight: 22, marginHorizontal: 4, marginBottom: 18 }}>{t('purchases.independent')}</Text>
        <TouchableOpacity onPress={openEdit} style={{ minHeight: 54, borderRadius: 15, backgroundColor: C.primary, alignItems: 'center', justifyContent: 'center', marginBottom: 10 }}><Text style={{ color: C.textOnPrimary, fontSize: 17, fontWeight: '800' }}>{t('purchases.editTitle')}</Text></TouchableOpacity>
        <TouchableOpacity onPress={removeSelected} style={{ minHeight: 52, borderRadius: 15, backgroundColor: C.expenseBg, alignItems: 'center', justifyContent: 'center' }}><Text style={{ color: C.expense, fontSize: 17, fontWeight: '800' }}>{t('purchases.delete')}</Text></TouchableOpacity>
      </ScrollView>
    </> : <>
      <ScreenHeader title={t('purchases.title')} rightIcon="add" onRightPress={openAdd} />
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 36 }}>
        <Text style={{ color: C.textSecondary, fontSize: 15, lineHeight: 22, marginBottom: 15 }}>{t('purchases.independent')}</Text>
        <TouchableOpacity onPress={openAdd} style={{ minHeight: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 9, borderRadius: 16, backgroundColor: C.primary, marginBottom: 15 }}><Ionicons name="add" size={22} color={C.textOnPrimary} /><Text style={{ color: C.textOnPrimary, fontSize: 17, fontWeight: '800' }}>{t('purchases.addTitle')}</Text></TouchableOpacity>
        {loadError && <Text style={{ color: C.expense, fontSize: 16, marginBottom: 12 }}>{t('purchases.loadError')}</Text>}
        {!loadError && items.length === 0 && <View style={[card, { alignItems: 'center', padding: 28 }]}><Ionicons name="bag-handle-outline" size={38} color={C.textMuted} /><Text style={{ color: C.textPrimary, fontSize: 18, fontWeight: '800', marginTop: 12 }}>{t('purchases.emptyTitle')}</Text><Text style={{ color: C.textSecondary, fontSize: 15, textAlign: 'center', marginTop: 5 }}>{t('purchases.emptyBody')}</Text></View>}
        {items.map(item => <TouchableOpacity key={item.id} onPress={() => setSelectedId(item.id)} activeOpacity={0.8} style={{ ...card, flexDirection: 'row', alignItems: 'center', gap: 13, minHeight: 84 }}>
          {item.image_uri ? <Image source={{ uri: item.image_uri }} resizeMode="cover" style={{ width: 66, height: 66, borderRadius: 13, backgroundColor: C.bgElevated }} /> : <View style={{ width: 66, height: 66, borderRadius: 13, backgroundColor: C.bgElevated, alignItems: 'center', justifyContent: 'center' }}><Ionicons name="bag-handle-outline" size={26} color={C.primary} /></View>}
          <View style={{ flex: 1 }}><Text style={{ color: C.textPrimary, fontSize: 18, fontWeight: '800' }}>{item.name}</Text><Text style={{ color: C.textSecondary, fontSize: 15, marginTop: 4 }}>{dateLabel(item.date, locale)} · {t(`purchases.categories.${CATEGORIES.includes(item.category) ? item.category : 'other'}`)}</Text>{!!item.shop && <Text style={{ color: C.textMuted, fontSize: 15, marginTop: 3 }}>{item.shop}</Text>}</View>
          {item.amount != null && <Text style={{ color: C.primary, fontWeight: '800', fontSize: 16 }}>{money(item.amount, i18n.language)}</Text>}
        </TouchableOpacity>)}
      </ScrollView>
    </>}
    <PurchaseForm visible={form.visible} item={form.item} onClose={() => setForm(value => ({ ...value, visible: false }))} onSaved={onSaved} />
  </View>;
}
