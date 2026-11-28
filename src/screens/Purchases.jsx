import React, { useCallback, useEffect, useRef, useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Image, Alert, BackHandler, Platform, StatusBar } from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { AmountInput, Button, Card, Chip, EmptyState, IconBadge, Input, ScreenHeader, Sheet } from '../components/common';
import { Layout, scaleTheme } from '../constants/theme';
import { useTheme } from '../store/ThemeContext';
import { getPurchases, savePurchase, deletePurchase } from '../db/ledger';
import { persistPurchaseImage } from '../services/purchaseImages';
import { money } from '../components/ledger/LedgerEntryRow';
import { parseCashAmount } from '../utils/cash';

const CATEGORIES = ['appliances', 'clothes', 'other'];
const CATEGORY_ICONS = ['tv-outline', 'shirt-outline', 'bag-handle-outline'];
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
const dateLabel = (value, locale) => validDate(value) ? new Date(`${value}T00:00:00`).toLocaleDateString(locale, { day: 'numeric', month: 'long', year: 'numeric' }) : value;
const blank = () => ({ name: '', date: today(), category: 'other', amount: '', shop: '', details: '', image_uri: '' });

function PurchaseForm({ visible, item, addDate, onClose, onSaved }) {
  const { C, scale } = useTheme();
  const { t } = useTranslation();
  const { Radius, Spacing, Typography } = scaleTheme(scale);
  const [form, setForm] = useState(blank);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [picking, setPicking] = useState(false);
  const [showDetails, setShowDetails] = useState(false);
  const initial = useRef(form);
  const saveLock = useRef(false);

  useEffect(() => {
    if (!visible) return;
    const value = item ? { name: item.name || '', date: item.date || today(), category: item.category || 'other', amount: item.amount == null ? '' : String(item.amount), shop: item.shop || '', details: item.details || '', image_uri: item.image_uri || '' } : { ...blank(), date: addDate || today() };
    initial.current = value; setForm(value); setError('');
    setShowDetails(Boolean(value.shop || value.details || value.image_uri));
  }, [visible, item, addDate]);

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
    const amount = form.amount.trim() ? parseCashAmount(form.amount) : null;
    if (amount !== null && (!Number.isFinite(amount) || amount <= 0)) { setError(t('purchases.amountInvalid')); return; }
    saveLock.current = true; setSaving(true); setError('');
    try {
      const id = savePurchase({ id: item?.id, name: form.name.trim(), date: form.date, category: form.category, amount, shop: form.shop.trim(), details: form.details.trim(), image_uri: form.image_uri || null });
      const next = blank(); initial.current = next; setForm(next); onSaved?.(id); onClose();
    } catch (e) {
      setError(t('purchases.saveError'));
    } finally { saveLock.current = false; setSaving(false); }
  };

  const label = { color: C.textSecondary, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold, marginBottom: Spacing.xs };
  const field = { marginBottom: Spacing.md };
  return (
    <Sheet visible={visible} onClose={close} title={item ? t('purchases.editTitle') : t('purchases.addTitle')} footer={<>
      {!!error && <Text accessibilityRole="alert" style={{ color: C.expense, fontSize: Typography.sizes.base, marginBottom: Spacing.sm }}>{error}</Text>}
      <Button label={saving ? t('purchases.saving') : t('common.save')} onPress={save} loading={saving} disabled={picking} fullWidth />
    </>}>
      <Card padding="sm" elevation="none" style={{ backgroundColor: C.skyBg, borderWidth: 0, marginBottom: Spacing.md }}>
        <Text style={{ color: C.textSecondary, fontSize: Typography.sizes.sm, textAlign: 'center' }}>{t('purchases.independent')}</Text>
      </Card>
      <Input label={t('purchases.name')} style={field} value={form.name} onChangeText={value => update('name', value)} placeholder={t('purchases.namePlaceholder')} />
      <Text style={[label, { textAlign: 'center' }]}>{t('purchases.category')}</Text>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: Spacing.sm, marginBottom: Spacing.md }}>
        {CATEGORIES.map((category, index) => <Chip key={category} icon={CATEGORY_ICONS[index]} active={form.category === category} onPress={() => update('category', category)} label={t('purchases.categories.' + category)} style={{ minHeight: 44, maxWidth: '100%' }} />)}
      </View>
      <Input label={t('purchases.date')} style={field} value={form.date} onChangeText={value => update('date', value.replace(/[૦-૯]/g, digit => String(digit.charCodeAt(0) - 0x0AE6)))} placeholder="YYYY-MM-DD" keyboardType="numbers-and-punctuation" />
      <AmountInput centered label={t('purchases.amountOptional')} style={field} value={form.amount} onChangeText={value => update('amount', value)}
        history={visible ? { kind: 'purchase', category: form.category, date: validDate(form.date) ? form.date : today(), id: item?.id } : null} />
      <Button variant="ghost" size="sm" label={t('purchases.extraDetails')}
        icon={showDetails ? 'chevron-up' : 'chevron-down'} accessibilityState={{ expanded: showDetails }} onPress={() => setShowDetails(value => !value)} />
      {showDetails && <Card padding="sm" elevation="none" style={{ backgroundColor: C.bgElevated, borderWidth: 0 }}>
      <Input label={t('purchases.shopOptional')} style={field} value={form.shop} onChangeText={value => update('shop', value)} placeholder={t('purchases.shopPlaceholder')} />
      <Input label={t('purchases.detailsOptional')} style={field} inputStyle={{ minHeight: 90, textAlignVertical: 'top' }} value={form.details} onChangeText={value => update('details', value)} placeholder={t('purchases.detailsPlaceholder')} multiline />
      <Text style={label}>{t('purchases.photoOptional')}</Text>
      {form.image_uri ? (
        <View style={{ marginBottom: Spacing.md }}>
          <Image source={{ uri: form.image_uri }} resizeMode="cover" style={{ width: '100%', aspectRatio: 4 / 3, borderRadius: Radius.lg, backgroundColor: C.bgElevated }} />
          <Button variant="ghost" size="sm" label={t('purchases.removePhoto')} onPress={() => update('image_uri', '')} />
        </View>
      ) : (
        <Button variant="secondary" icon="camera-outline" label={t('purchases.choosePhoto')} onPress={choosePhoto}
          loading={picking} style={{ marginBottom: Spacing.md }} />
      )}
      </Card>}
    </Sheet>
  );
}

export default function Purchases({ navigation, route }) {
  const { C, scale } = useTheme();
  const { Radius, Spacing, Typography } = scaleTheme(scale);
  const { t, i18n } = useTranslation();
  const [items, setItems] = useState([]);
  const [selectedId, setSelectedId] = useState(null);
  const [form, setForm] = useState({ visible: false, item: null });
  const [loadError, setLoadError] = useState(false);
  const locale = i18n.language === 'gu' ? 'gu-IN-u-nu-latn' : 'en-IN';
  const load = useCallback(() => { try { setItems(getPurchases()); setLoadError(false); } catch (e) { setLoadError(true); } }, []);
  useFocusEffect(useCallback(() => { load(); }, [load]));
  useFocusEffect(useCallback(() => {
    if (!route?.params?.autoAdd) return;
    setSelectedId(null);
    setForm({ visible: true, item: null, addDate: route.params.addDate });
    navigation.setParams({ autoAdd: false, addDate: undefined });
  }, [navigation, route?.params?.autoAdd, route?.params?.addDate]));
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
  useFocusEffect(useCallback(() => {
    if (Platform.OS !== 'android' || !selectedId || form.visible) return;
    const subscription = BackHandler.addEventListener('hardwareBackPress', () => {
      setSelectedId(null);
      return true;
    });
    return () => subscription.remove();
  }, [selectedId, form.visible]));

  const content = { width: '100%', maxWidth: Layout.contentWidth, alignSelf: 'center', padding: Spacing.base, paddingBottom: Spacing.xl, gap: Spacing.md };
  const photoStyle = { borderRadius: Radius.lg, backgroundColor: C.bgElevated };
  const label = { color: C.textSecondary, fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold };
  const detail = { color: C.textPrimary, fontSize: Typography.sizes.base };
  const categoryLabel = item => t('purchases.categories.' + (CATEGORIES.includes(item.category) ? item.category : 'other'));
  return (
    <View style={{ flex: 1, backgroundColor: C.bg }}>
      <StatusBar barStyle={C.isDark ? 'light-content' : 'dark-content'} backgroundColor={C.bgCard} />
      {selected ? (
        <>
          <ScreenHeader title={selected.name} onBack={() => setSelectedId(null)} rightIcon="create-outline" rightLabel={t('common.edit')} onRightPress={openEdit} />
          <ScrollView contentContainerStyle={content}>
            {selected.image_uri && (
              <Image source={{ uri: selected.image_uri }} resizeMode="cover" style={[photoStyle, { width: '100%', aspectRatio: 4 / 3 }]} />
            )}
            <Card style={{ gap: Spacing.md }}>
              <Text style={{ color: C.textPrimary, fontSize: Typography.sizes.xl, fontWeight: Typography.weights.black }}>{selected.name}</Text>
              <Text style={label}>{dateLabel(selected.date, locale)} · {categoryLabel(selected)}</Text>
              {selected.amount != null && <Text style={{ color: C.primary, fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold }}>{money(selected.amount, i18n.language)}</Text>}
              {[[t('purchases.shop'), selected.shop], [t('purchases.details'), selected.details]].map(([heading, value]) => value ? (
                <View key={heading} style={{ gap: Spacing.xs }}>
                  <Text style={label}>{heading}</Text>
                  <Text style={detail}>{value}</Text>
                </View>
              ) : null)}
            </Card>
            <Button variant="danger" size="sm" icon="trash-outline" label={t('purchases.delete')} onPress={removeSelected} />
          </ScrollView>
        </>
      ) : (
        <>
          <ScreenHeader title={t('purchases.title')} onBack={() => navigation.goBack()} />
          <ScrollView contentContainerStyle={content}>
            <Button icon="add" label={t('purchases.addTitle')} onPress={openAdd} />
            {loadError && <Text accessibilityRole="alert" style={{ color: C.expense, fontSize: Typography.sizes.base }}>{t('purchases.loadError')}</Text>}
            {!loadError && items.length === 0 && (
              <Card><EmptyState icon="bag-handle-outline" title={t('purchases.emptyTitle')} subtitle={t('purchases.emptyBody')} /></Card>
            )}
            {items.map(item => (
              <Card key={item.id} padding="none">
                <TouchableOpacity accessibilityRole="button" onPress={() => setSelectedId(item.id)} activeOpacity={0.8}
                  style={{ flexDirection: 'row', alignItems: 'center', padding: Spacing.md, gap: Spacing.md }}>
                  {item.image_uri
                    ? <Image source={{ uri: item.image_uri }} resizeMode="cover" style={[photoStyle, { width: 60, height: 60 }]} />
                    : <IconBadge icon="bag-handle-outline" size={60} color={C.iconExpense} />}
                  <View style={{ flex: 1, gap: Spacing.xs }}>
                    <Text style={{ ...detail, fontWeight: Typography.weights.bold }}>{item.name}</Text>
                    <Text style={label}>{dateLabel(item.date, locale)} · {categoryLabel(item)}</Text>
                    {!!item.shop && <Text style={label}>{item.shop}</Text>}
                  </View>
                  {item.amount != null && <Text style={{ ...label, color: C.primary, maxWidth: '32%', textAlign: 'right' }}>{money(item.amount, i18n.language)}</Text>}
                  <Ionicons name="chevron-forward" size={18} color={C.textSecondary} />
                </TouchableOpacity>
              </Card>
            ))}
          </ScrollView>
        </>
      )}
      <PurchaseForm visible={form.visible} item={form.item} addDate={form.addDate} onClose={() => setForm(value => ({ ...value, visible: false }))} onSaved={onSaved} />
    </View>
  );
}
