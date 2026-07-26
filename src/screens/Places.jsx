import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, Platform, StatusBar,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { scaleTheme, makeShadow } from '../constants/theme';
import { useTheme } from '../store/ThemeContext';
import DayNavigator from '../components/DayNavigator';
import useAppStore from '../store/useAppStore';
import {
  Card, Button, IconBadge, Sheet, Input, Chip, Badge, EmptyState, SectionHeader, FAB, Row,
} from '../components/common';
import {
  getAllPlaces,
  getPlacesForDay,
  addPlace,
  updatePlace,
  deletePlace,
  togglePlaceForDay,
  toggleFavoritePlace,
  getOrCreateDay,
} from '../db/queries';

// ── Suggested place icons (for quick selection) ───────────────────────────────

const PLACE_ICONS = ['🏪','🏬','🏥','⛽','🍽️','☕','🏦','🕌','🏫','🛒','🏠','🏋️','💊','🎓','🌳','🚂','✈️','🎭','💈','🔧'];

// ── Add / Edit Place Modal ────────────────────────────────────────────────────

const PlaceModal = ({ visible, editPlace, onSave, onClose, C, scale, Shadow, t }) => {
  const { Typography, Spacing, Radius } = scaleTheme(scale);
  const pm = pmStyles(Typography, Spacing, Radius);
  const [name,  setName]  = useState('');
  const [icon,  setIcon]  = useState('📍');
  const [iconType, setIconType] = useState('emoji');
  const [isFav, setIsFav] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setName(editPlace?.name   || '');
      setIcon(editPlace?.icon   || '📍');
      setIconType(editPlace?.icon_type || 'emoji');
      setIsFav(editPlace?.is_favorite === 1);
    }
  }, [visible, editPlace]);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.5,
    });

    if (!result.canceled) {
      setIcon(result.assets[0].uri);
      setIconType('image');
    }
  };

  const handleSave = () => {
    if (!name.trim()) { Alert.alert('Required', t('places.placeName')); return; }
    onSave(name.trim(), icon, iconType, isFav ? 1 : 0, editPlace?.id);
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} title={editPlace ? t('places.editPlace') : t('places.addPlaceTitle')}>
      {/* Icon selector */}
      <View style={pm.labelRow}>
        <IconBadge
          photoUri={iconType === 'image' ? icon : undefined}
          emoji={iconType !== 'image' ? icon : undefined}
          size={32}
          color={C.iconPlaces}
          style={{ marginRight: Spacing.xs }}
        />
        <Text style={[pm.label, { color: C.textSecondary }]}>{t('places.icon')}</Text>
      </View>

      {/* Custom photo picker */}
      <View style={pm.photoRow}>
        <TouchableOpacity
          style={[pm.photoBtn, { backgroundColor: C.primaryDim, borderColor: C.primary }]}
          onPress={pickImage}
        >
          <Ionicons name="camera" size={20} color={C.primary} />
          <Text style={[pm.photoBtnTxt, { color: C.primary }]}>{t('places.choosePhoto')}</Text>
        </TouchableOpacity>
        {iconType === 'image' && (
          <TouchableOpacity
            style={[pm.photoRemoveBtn, { backgroundColor: C.expenseLight, borderColor: C.expense }]}
            onPress={() => { setIcon('📍'); setIconType('emoji'); }}
          >
            <Ionicons name="close" size={20} color={C.expense} />
          </TouchableOpacity>
        )}
      </View>

      {/* Emoji quick-picks */}
      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={pm.iconScroll} contentContainerStyle={pm.iconRow}>
        {PLACE_ICONS.map(ic => (
          <TouchableOpacity
            key={ic}
            style={[
              pm.iconBtn,
              ic === icon && iconType !== 'image' && { borderColor: C.primary, borderWidth: 2, backgroundColor: C.primaryDim },
            ]}
            onPress={() => { setIcon(ic); setIconType('emoji'); }}
          >
            <IconBadge emoji={ic} size={40} color={C.primary} />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Name input */}
      <Input
        label={t('places.placeName')}
        value={name}
        onChangeText={setName}
        placeholder="e.g. Ramu Kirana, City Hospital..."
        autoFocus
        style={pm.inputSpacing}
      />

      {/* Favorite toggle */}
      <Row
        icon="star"
        iconColor={C.warning}
        label={t('places.markFavourite')}
        subtitle={t('places.favSub')}
        switchValue={isFav}
        onSwitchChange={setIsFav}
        style={[pm.favRow, { backgroundColor: C.bgElevated, borderColor: C.border }]}
      />

      {/* Buttons */}
      <View style={pm.btnRow}>
        <Button variant="secondary" label={t('common.cancel')} onPress={onClose} style={{ flex: 1 }} />
        <Button
          variant="primary"
          label={editPlace ? t('places.update') : t('places.addPlace')}
          onPress={handleSave}
          style={{ flex: 1 }}
        />
      </View>
    </Sheet>
  );
};

const pmStyles = (Typography, Spacing, Radius) => StyleSheet.create({
  labelRow:  { flexDirection: 'row', alignItems: 'center', marginBottom: Spacing.sm },
  label:     { fontSize: Typography.sizes.xs, fontWeight: Typography.weights.semibold, letterSpacing: 0.8, textTransform: 'uppercase' },
  photoRow:  { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.base },
  photoBtn:  { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: Spacing.xs, borderRadius: Radius.lg, borderWidth: 1.5, paddingVertical: Spacing.sm },
  photoBtnTxt: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold },
  photoRemoveBtn: { width: 44, borderRadius: Radius.lg, borderWidth: 1.5, alignItems: 'center', justifyContent: 'center' },
  iconScroll:{ marginBottom: Spacing.base },
  iconRow:   { gap: Spacing.xs, paddingBottom: 4 },
  iconBtn:   { borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center', borderWidth: 2, borderColor: 'transparent', padding: 2 },
  inputSpacing: { marginBottom: Spacing.base },
  favRow:    { borderRadius: Radius.lg, borderWidth: 1, paddingHorizontal: Spacing.base, marginBottom: Spacing.base },
  btnRow:    { flexDirection: 'row', gap: Spacing.sm },
});

// ── Place Tile (in the grid) ───────────────────────────────────────────────────

const PlaceTile = ({ place, isVisited, onToggle, onEdit, onFavToggle, C, scale, Shadow }) => {
  const { Typography, Spacing, Radius } = scaleTheme(scale);
  const pt = ptStyles(Typography, Spacing, Radius);
  return (
  <TouchableOpacity
    style={[
      pt.tile,
      { backgroundColor: C.bgCard, borderColor: isVisited ? C.primary : C.border },
      isVisited && { borderWidth: 2 },
      Shadow.sm,
    ]}
    onPress={() => onToggle(place)}
    activeOpacity={0.8}
    onLongPress={() => onEdit(place)}
  >
    {/* Visited check */}
    {isVisited && (
      <View style={[pt.visitedBadge, { backgroundColor: C.primary }]}>
        <Ionicons name="checkmark" size={12} color="#fff" />
      </View>
    )}

    {/* Favorite star */}
    <TouchableOpacity style={pt.starBtn} onPress={() => onFavToggle(place.id)} hitSlop={{ top: 8, right: 8, bottom: 8, left: 8 }}>
      <Ionicons name={place.is_favorite ? 'star' : 'star-outline'} size={16} color={C.warning} />
    </TouchableOpacity>

    <IconBadge
      photoUri={place.icon_type === 'image' ? place.icon : undefined}
      emoji={place.icon_type !== 'image' ? (place.icon || '📍') : undefined}
      size={48}
      color={C.iconPlaces}
      style={{ marginTop: Spacing.sm, marginBottom: Spacing.xs }}
    />
    <Text style={[pt.tileName, { color: C.textPrimary }]} numberOfLines={2}>{place.name}</Text>

    {isVisited && (
      <Badge label="Visited ✓" color={C.income} style={pt.visitedPill} />
    )}
  </TouchableOpacity>
  );
};

const ptStyles = (Typography, Spacing, Radius) => StyleSheet.create({
  tile:         { width: '30.5%', borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.sm, alignItems: 'center', marginBottom: Spacing.sm, overflow: 'hidden', position: 'relative' },
  visitedBadge: { position: 'absolute', top: 6, left: 6, width: 18, height: 18, borderRadius: 9, alignItems: 'center', justifyContent: 'center' },
  starBtn:      { position: 'absolute', top: 4, right: 4 },
  tileName:     { fontSize: Typography.sizes.xs, fontWeight: Typography.weights.semibold, textAlign: 'center', lineHeight: 16 },
  visitedPill:  { marginTop: Spacing.xs, alignSelf: 'center' },
});

// ── Visited Place List Row (bottom section) ───────────────────────────────────

const VisitedRow = ({ place, onRemove, C, scale, t }) => {
  const { Typography, Spacing } = scaleTheme(scale);
  const vr = vrStyles(Typography, Spacing);
  return (
    <View style={[vr.row, { borderBottomColor: C.divider }]}>
      <IconBadge
        photoUri={place.icon_type === 'image' ? place.icon : undefined}
        emoji={place.icon_type !== 'image' ? (place.icon || '📍') : undefined}
        size={32}
        color={C.income}
        style={{ marginRight: Spacing.sm }}
      />
      <Text style={[vr.name, { color: C.textPrimary }]}>{place.name}</Text>
      <Chip label={t('places.remove')} icon="close" color={C.expense} onPress={() => onRemove(place)} />
    </View>
  );
};
const vrStyles = (Typography, Spacing) => StyleSheet.create({
  row:  { flexDirection: 'row', alignItems: 'center', paddingVertical: Spacing.sm, borderBottomWidth: 1 },
  name: { flex: 1, fontSize: Typography.sizes.base, fontWeight: Typography.weights.medium },
});

// ── Main Places Screen ────────────────────────────────────────────────────────

export default function PlacesScreen() {
  const { t } = useTranslation();
  const { C, scale } = useTheme();
  const { Typography, Spacing, Radius } = scaleTheme(scale);
  const Shadow = makeShadow(C);
  const s = sStyles(Typography, Spacing, Radius);
  const { selectedDate, dayData } = useAppStore();

  const [allPlaces,   setAllPlaces]   = useState([]);
  const [visited,     setVisited]     = useState([]);
  const [showModal,   setShowModal]   = useState(false);
  const [editPlace,   setEditPlace]   = useState(null);
  const [filter,      setFilter]      = useState('all'); // 'all' | 'favorites'

  const load = useCallback(() => {
    setAllPlaces(getAllPlaces());
    if (dayData) setVisited(getPlacesForDay(dayData.id));
  }, [dayData, selectedDate]);

  useEffect(() => {
    setAllPlaces(getAllPlaces());
    if (dayData) setVisited(getPlacesForDay(dayData.id));
  }, [selectedDate, dayData]);

  const getDayId = () => {
    if (dayData) return dayData.id;
    return getOrCreateDay(selectedDate).id;
  };

  const handleToggle = (place) => {
    const dayId = getDayId();
    togglePlaceForDay(dayId, place.id);
    load();
  };

  const handleSave = (name, icon, iconType, isFav, id) => {
    if (id) {
      updatePlace(id, name, icon, iconType);
      if (isFav !== undefined) {
        const existing = allPlaces.find(p=>p.id===id);
        if (existing && existing.is_favorite !== isFav) toggleFavoritePlace(id);
      }
    } else {
      addPlace(name, isFav, icon, iconType);
    }
    load();
  };

  const handleDelete = (place) => {
    Alert.alert(t('places.deletePlace'), `${t('places.remove')} "${place.name}"? ${t('places.deleteConfirm')}`, [
      {text:t('common.cancel'),style:'cancel'},
      {text:t('common.delete'),style:'destructive',onPress:()=>{ deletePlace(place.id); load(); }},
    ]);
  };

  const handleFavToggle = (id) => {
    toggleFavoritePlace(id);
    load();
  };

  const isVisited = (id) => visited.some(p => p.id === id);

  const displayPlaces = filter==='favorites'
    ? allPlaces.filter(p=>p.is_favorite===1)
    : allPlaces;

  const favCount = allPlaces.filter(p=>p.is_favorite===1).length;

  return (
    <View style={[s.root,{backgroundColor:C.bg}]}>
      <StatusBar barStyle={C.isDark?'light-content':'dark-content'} backgroundColor={C.bgCard}/>
      <DayNavigator/>

      {/* Header */}
      <View style={[s.header,{backgroundColor:C.bgCard,borderBottomColor:C.border}]}>
        <IconBadge icon="location" color={C.iconPlaces} size={40} style={{ marginRight: Spacing.sm }} />
        <View style={{ flex: 1 }}>
          <Text style={[s.headerTitle,{color:C.textPrimary}]}>{t('places.title')}</Text>
          <Text style={[s.headerSub,{color:C.textSecondary}]}>
            {visited.length>0?`${visited.length} ${t('places.visitedToday')}`:t('places.tapToVisit')}
          </Text>
        </View>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── VISITED TODAY section ── */}
        {visited.length > 0 && (
          <Card style={[s.visitedCard,{borderColor:C.income}]}>
            <SectionHeader
              icon="checkmark-done"
              color={C.income}
              title={t('places.visitedToday')}
              badge={visited.length}
              style={{ marginBottom: Spacing.sm }}
            />
            {visited.map(p=>(
              <VisitedRow key={p.id} place={p} onRemove={handleToggle} C={C} scale={scale} t={t}/>
            ))}
          </Card>
        )}

        {/* ── Filter tabs ── */}
        <View style={s.filterRow}>
          <Chip
            label={`${t('places.allPlaces')} (${allPlaces.length})`}
            active={filter==='all'}
            onPress={()=>setFilter('all')}
            color={C.primary}
            style={s.filterChip}
          />
          <Chip
            label={`${t('places.favourites')} (${favCount})`}
            icon="star"
            active={filter==='favorites'}
            onPress={()=>setFilter('favorites')}
            color={C.warning}
            style={s.filterChip}
          />
        </View>

        {/* ── Places grid ── */}
        {displayPlaces.length === 0 ? (
          <View style={[s.emptyCard,{backgroundColor:C.bgCard,borderColor:C.border}]}>
            <EmptyState
              icon="map-outline"
              title={t('places.noPlaces')}
              subtitle={filter==='favorites'?t('places.noFavSub'):t('places.noPlacesSub')}
            />
            {filter==='all' && (
              <Button
                variant="primary"
                label={t('places.addFirst')}
                onPress={()=>{setEditPlace(null);setShowModal(true);}}
                style={s.emptyBtn}
              />
            )}
          </View>
        ) : (
          <>
            <Text style={[s.hint,{color:C.textMuted}]}>{t('places.tapHint')}</Text>
            <View style={s.grid}>
              {displayPlaces.map(place=>(
                <PlaceTile
                  key={place.id}
                  place={place}
                  isVisited={isVisited(place.id)}
                  onToggle={handleToggle}
                  onEdit={(p)=>{setEditPlace(p);setShowModal(true);}}
                  onFavToggle={handleFavToggle}
                  C={C} scale={scale} Shadow={Shadow}
                />
              ))}
            </View>
          </>
        )}

        <View style={{height:32}}/>
      </ScrollView>

      <FAB
        icon="add"
        onPress={()=>{setEditPlace(null);setShowModal(true);}}
        style={s.fab}
      />

      <PlaceModal
        visible={showModal}
        editPlace={editPlace}
        onSave={handleSave}
        onClose={()=>{setShowModal(false);setEditPlace(null);}}
        C={C} scale={scale} Shadow={Shadow} t={t}
      />
    </View>
  );
}

const sStyles = (Typography, Spacing, Radius) => StyleSheet.create({
  root:   { flex: 1, maxWidth: Platform.OS === 'web' ? 1200 : '100%', width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, borderBottomWidth: 1 },
  headerTitle:  { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold },
  headerSub:    { fontSize: Typography.sizes.xs, marginTop: 2 },
  scroll:       { flex: 1 },
  content:      { padding: Spacing.base, paddingBottom: 100 },
  visitedCard:  { borderWidth: 1.5, marginBottom: Spacing.base },
  filterRow:    { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.base },
  filterChip:   { flex: 1, justifyContent: 'center' },
  hint:         { fontSize: Typography.sizes.xs, textAlign: 'center', marginBottom: Spacing.sm },
  grid:         { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: Spacing.xs },
  emptyCard:    { borderRadius: Radius.xl, borderWidth: 1, alignItems: 'center', paddingVertical: Spacing.md },
  emptyBtn:     { marginTop: Spacing.sm },
  fab:          { position: 'absolute', right: Spacing.lg, bottom: 110 },
});
