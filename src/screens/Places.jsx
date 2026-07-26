import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Modal, Pressable, Alert, KeyboardAvoidingView,
  Platform, StatusBar, FlatList,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { scaleTheme, makeShadow, Typography, Spacing, Radius } from '../constants/theme';
import { useTheme } from '../store/ThemeContext';
import DayNavigator from '../components/DayNavigator';
import useAppStore from '../store/useAppStore';
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

const PlaceModal = ({ visible, editPlace, onSave, onClose, C, Shadow, t }) => {
  const [name,  setName]  = useState('');
  const [icon,  setIcon]  = useState('📍');
  const [isFav, setIsFav] = useState(false);

  React.useEffect(() => {
    if (visible) {
      setName(editPlace?.name   || '');
      setIcon(editPlace?.icon   || '📍');
      setIsFav(editPlace?.is_favorite === 1);
    }
  }, [visible, editPlace]);

  const handleSave = () => {
    if (!name.trim()) { Alert.alert('Required', t('places.placeName')); return; }
    onSave(name.trim(), icon, isFav ? 1 : 0, editPlace?.id);
    onClose();
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={{flex:1}}>
        <Pressable style={[pm.overlay,{backgroundColor:C.overlay}]} onPress={onClose}>
          <Pressable style={[pm.sheet,{backgroundColor:C.bgCard},Shadow.md]} onPress={e=>e.stopPropagation()}>
            <View style={[pm.handle,{backgroundColor:C.border}]}/>
            <Text style={[pm.title,{color:C.textPrimary}]}>{editPlace?t('places.editPlace'):t('places.addPlaceTitle')}</Text>

            {/* Icon selector */}
            <Text style={[pm.label,{color:C.textSecondary}]}>{t('places.icon')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={pm.iconScroll} contentContainerStyle={pm.iconRow}>
              {PLACE_ICONS.map(ic=>(
                <TouchableOpacity
                  key={ic}
                  style={[pm.iconBtn, ic===icon && {backgroundColor:C.primaryDim,borderColor:C.primary,borderWidth:2}]}
                  onPress={()=>setIcon(ic)}
                >
                  <Text style={pm.iconTxt}>{ic}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Name input */}
            <Text style={[pm.label,{color:C.textSecondary}]}>{t('places.placeName')}</Text>
            <View style={[pm.inputWrap,{backgroundColor:C.bgInput,borderColor:C.border}]}>
              <Text style={[pm.inputPrefix,{color:C.textMuted}]}>{icon}</Text>
              <TextInput
                style={[pm.input,{color:C.textPrimary}]}
                value={name}
                onChangeText={setName}
                placeholder="e.g. Ramu Kirana, City Hospital..."
                placeholderTextColor={C.textMuted}
                autoFocus
              />
            </View>

            {/* Favorite toggle */}
            <TouchableOpacity
              style={[pm.favRow, {backgroundColor:C.bgElevated,borderColor:C.border}]}
              onPress={()=>setIsFav(v=>!v)}
              activeOpacity={0.8}
            >
              <Text style={pm.favIcon}>{isFav?'⭐':'☆'}</Text>
              <View style={{flex:1}}>
                <Text style={[pm.favLabel,{color:C.textPrimary}]}>{t('places.markFavourite')}</Text>
                <Text style={[pm.favSub,{color:C.textSecondary}]}>{t('places.favSub')}</Text>
              </View>
              <View style={[pm.favCheck, {backgroundColor:isFav?C.primary:C.bgInput,borderColor:isFav?C.primary:C.border}]}>
                {isFav && <Text style={pm.favCheckTick}>✓</Text>}
              </View>
            </TouchableOpacity>

            {/* Buttons */}
            <View style={pm.btnRow}>
              <TouchableOpacity style={[pm.btn,pm.cancelBtn,{borderColor:C.border}]} onPress={onClose}>
                <Text style={[pm.btnTxt,{color:C.textSecondary}]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[pm.btn,{backgroundColor:C.primary}]} onPress={handleSave}>
                <Text style={[pm.btnTxt,{color:'#fff'}]}>{editPlace?t('places.update'):t('places.addPlace')}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const pm = StyleSheet.create({
  overlay:   {flex:1,justifyContent:'flex-end'},
  sheet:     {borderTopLeftRadius:24,borderTopRightRadius:24,padding:Spacing.xl,paddingBottom:36},
  handle:    {width:40,height:4,borderRadius:2,alignSelf:'center',marginBottom:Spacing.base},
  title:     {fontSize:Typography.sizes.xl,fontWeight:Typography.weights.bold,marginBottom:Spacing.base},
  label:     {fontSize:Typography.sizes.xs,fontWeight:Typography.weights.semibold,letterSpacing:0.8,textTransform:'uppercase',marginBottom:Spacing.xs,color:'gray'},
  iconScroll:{marginBottom:Spacing.base},
  iconRow:   {gap:Spacing.xs,paddingBottom:4},
  iconBtn:   {width:44,height:44,borderRadius:Radius.md,alignItems:'center',justifyContent:'center',backgroundColor:'#f0f0f0',borderWidth:1.5,borderColor:'transparent'},
  iconTxt:   {fontSize:22},
  inputWrap: {flexDirection:'row',alignItems:'center',borderRadius:Radius.lg,borderWidth:1.5,paddingHorizontal:Spacing.base,marginBottom:Spacing.base},
  inputPrefix:{fontSize:20,marginRight:Spacing.xs},
  input:     {flex:1,fontSize:Typography.sizes.base,paddingVertical:Spacing.md},
  favRow:    {flexDirection:'row',alignItems:'center',gap:Spacing.sm,padding:Spacing.base,borderRadius:Radius.lg,borderWidth:1,marginBottom:Spacing.base},
  favIcon:   {fontSize:22},
  favLabel:  {fontSize:Typography.sizes.base,fontWeight:Typography.weights.medium},
  favSub:    {fontSize:Typography.sizes.xs,marginTop:2},
  favCheck:  {width:24,height:24,borderRadius:12,borderWidth:2,alignItems:'center',justifyContent:'center'},
  favCheckTick:{color:'#fff',fontWeight:'700',fontSize:14},
  btnRow:    {flexDirection:'row',gap:Spacing.sm},
  btn:       {flex:1,paddingVertical:Spacing.md,borderRadius:Radius.lg,alignItems:'center'},
  cancelBtn: {borderWidth:1},
  btnTxt:    {fontSize:Typography.sizes.base,fontWeight:Typography.weights.semibold},
});

// ── Place Tile (in the grid) ───────────────────────────────────────────────────

const PlaceTile = ({ place, isVisited, onToggle, onEdit, onFavToggle, C, Shadow }) => (
  <TouchableOpacity
    style={[
      pt.tile,
      {backgroundColor:C.bgCard,borderColor:isVisited?C.primary:C.border},
      isVisited && {borderWidth:2},
      Shadow.sm,
    ]}
    onPress={()=>onToggle(place)}
    activeOpacity={0.8}
    onLongPress={()=>onEdit(place)}
  >
    {/* Visited check */}
    {isVisited && (
      <View style={[pt.visitedBadge,{backgroundColor:C.primary}]}>
        <Text style={pt.visitedTick}>✓</Text>
      </View>
    )}

    {/* Favorite star */}
    <TouchableOpacity style={pt.starBtn} onPress={()=>onFavToggle(place.id)} hitSlop={{top:8,right:8,bottom:8,left:8}}>
      <Text style={[pt.star,{opacity:place.is_favorite?1:0.25}]}>⭐</Text>
    </TouchableOpacity>

    <Text style={pt.tileIcon}>{place.icon || '📍'}</Text>
    <Text style={[pt.tileName,{color:C.textPrimary}]} numberOfLines={2}>{place.name}</Text>

    {isVisited && (
      <View style={[pt.visitedPill,{backgroundColor:C.primaryDim}]}>
        <Text style={[pt.visitedPillTxt,{color:C.primary}]}>Visited ✓</Text>
      </View>
    )}
  </TouchableOpacity>
);

const pt = StyleSheet.create({
  tile:         {width:'30.5%',borderRadius:Radius.xl,borderWidth:1,padding:Spacing.sm,alignItems:'center',marginBottom:Spacing.sm,overflow:'hidden',position:'relative'},
  visitedBadge: {position:'absolute',top:6,left:6,width:18,height:18,borderRadius:9,alignItems:'center',justifyContent:'center'},
  visitedTick:  {color:'#fff',fontSize:10,fontWeight:'700'},
  starBtn:      {position:'absolute',top:4,right:4},
  star:         {fontSize:14},
  tileIcon:     {fontSize:30,marginBottom:Spacing.xs,marginTop:Spacing.sm},
  tileName:     {fontSize:Typography.sizes.xs,fontWeight:Typography.weights.semibold,textAlign:'center',lineHeight:16},
  visitedPill:  {marginTop:Spacing.xs,paddingHorizontal:6,paddingVertical:2,borderRadius:Radius.full},
  visitedPillTxt:{fontSize:9,fontWeight:'700'},
});

// ── Visited Place List Row (bottom section) ───────────────────────────────────

const VisitedRow = ({ place, onRemove, C, t }) => (
  <View style={[vr.row,{borderBottomColor:C.divider}]}>
    <Text style={vr.icon}>{place.icon||'📍'}</Text>
    <Text style={[vr.name,{color:C.textPrimary}]}>{place.name}</Text>
    <TouchableOpacity
      style={[vr.removeBtn,{backgroundColor:C.expenseLight}]}
      onPress={()=>onRemove(place)}
    >
      <Text style={[vr.removeTxt,{color:C.expense}]}>{t('places.remove')}</Text>
    </TouchableOpacity>
  </View>
);
const vr = StyleSheet.create({
  row:       {flexDirection:'row',alignItems:'center',gap:Spacing.sm,paddingVertical:Spacing.sm,borderBottomWidth:1},
  icon:      {fontSize:20,width:30},
  name:      {flex:1,fontSize:Typography.sizes.base,fontWeight:Typography.weights.medium},
  removeBtn: {paddingHorizontal:Spacing.sm,paddingVertical:4,borderRadius:Radius.full},
  removeTxt: {fontSize:Typography.sizes.xs,fontWeight:Typography.weights.semibold},
});

// ── Main Places Screen ────────────────────────────────────────────────────────

export default function PlacesScreen() {
  const { t } = useTranslation();
  const { C, scale } = useTheme();
  const { Typography, Spacing, Radius } = scaleTheme(scale);
  const Shadow = makeShadow(C);
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

  const handleSave = (name, icon, isFav, id) => {
    if (id) {
      updatePlace(id, name);
      if (isFav !== undefined) {
        const existing = allPlaces.find(p=>p.id===id);
        if (existing && existing.is_favorite !== isFav) toggleFavoritePlace(id);
      }
    } else {
      addPlace(name, isFav);
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
        <View>
          <Text style={[s.headerTitle,{color:C.textPrimary}]}>{t('places.title')}</Text>
          <Text style={[s.headerSub,{color:C.textSecondary}]}>
            {visited.length>0?`${visited.length} ${t('places.visitedToday')}`:t('places.tapToVisit')}
          </Text>
        </View>
        <TouchableOpacity
          style={[s.addBtn,{backgroundColor:C.primary},Shadow.primary]}
          onPress={()=>{setEditPlace(null);setShowModal(true);}}
          activeOpacity={0.85}
        >
          <Text style={s.addBtnTxt}>{t('places.addPlace')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {/* ── VISITED TODAY section ── */}
        {visited.length > 0 && (
          <View style={[s.visitedCard,{backgroundColor:C.incomeBg,borderColor:C.income}]}>
            <View style={s.visitedHeader}>
              <Text style={s.visitedIcon}>📍</Text>
              <Text style={[s.visitedTitle,{color:C.income}]}>{t('places.visitedToday')} ({visited.length})</Text>
            </View>
            {visited.map(p=>(
              <VisitedRow key={p.id} place={p} onRemove={handleToggle} C={C} t={t}/>
            ))}
          </View>
        )}

        {/* ── Filter tabs ── */}
        <View style={[s.filterRow,{backgroundColor:C.bgElevated}]}>
          {[
            {key:'all',      label:`${t('places.allPlaces')} (${allPlaces.length})`},
            {key:'favorites',label:`⭐ ${t('places.favourites')} (${favCount})`},
          ].map(f=>(
            <TouchableOpacity
              key={f.key}
              style={[s.filterBtn, filter===f.key && {backgroundColor:C.bgCard}]}
              onPress={()=>setFilter(f.key)}
            >
              <Text style={[s.filterTxt,{color:filter===f.key?C.primary:C.textSecondary}]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Places grid ── */}
        {displayPlaces.length === 0 ? (
          <View style={[s.emptyCard,{backgroundColor:C.bgCard,borderColor:C.border}]}>
            <Text style={s.emptyIcon}>🗺️</Text>
            <Text style={[s.emptyTitle,{color:C.textPrimary}]}>{t('places.noPlaces')}</Text>
            <Text style={[s.emptySub,{color:C.textSecondary}]}>
              {filter==='favorites'?t('places.noFavSub'):t('places.noPlacesSub')}
            </Text>
            {filter==='all' && (
              <TouchableOpacity
                style={[s.emptyBtn,{backgroundColor:C.primary}]}
                onPress={()=>{setEditPlace(null);setShowModal(true);}}
              >
                <Text style={s.emptyBtnTxt}>{t('places.addFirst')}</Text>
              </TouchableOpacity>
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
                  C={C} Shadow={Shadow}
                />
              ))}
              {/* Add new tile */}
              <TouchableOpacity
                style={[s.addTile,{backgroundColor:C.bgCard,borderColor:C.border}]}
                onPress={()=>{setEditPlace(null);setShowModal(true);}}
              >
                <Text style={[s.addTileIcon,{color:C.textMuted}]}>+</Text>
                <Text style={[s.addTileTxt,{color:C.textMuted}]}>New</Text>
              </TouchableOpacity>
            </View>
          </>
        )}

        <View style={{height:32}}/>
      </ScrollView>

      <PlaceModal
        visible={showModal}
        editPlace={editPlace}
        onSave={handleSave}
        onClose={()=>{setShowModal(false);setEditPlace(null);}}
        C={C} Shadow={Shadow} t={t}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, maxWidth: Platform.OS === 'web' ? 1200 : '100%', width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, borderBottomWidth: 1 },
  headerTitle:  { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold },
  headerSub:    { fontSize: Typography.sizes.xs, marginTop: 2 },
  addBtn:       { paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, borderRadius: Radius.full },
  addBtnTxt:    { color: '#fff', fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold },
  scroll:       { flex: 1 },
  content:      { padding: Spacing.base },
  visitedCard:  { borderRadius: Radius.xl, borderWidth: 1.5, padding: Spacing.base, marginBottom: Spacing.base },
  visitedHeader:{ flexDirection: 'row', alignItems: 'center', gap: Spacing.xs, marginBottom: Spacing.sm },
  visitedIcon:  { fontSize: 16 },
  visitedTitle: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold, letterSpacing: 0.3 },
  filterRow:    { flexDirection: 'row', borderRadius: Radius.lg, padding: 4, marginBottom: Spacing.base },
  filterBtn:    { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: Radius.md },
  filterTxt:    { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold },
  hint:         { fontSize: Typography.sizes.xs, textAlign: 'center', marginBottom: Spacing.sm },
  grid:         { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', gap: Spacing.xs },
  addTile:      { width: '30.5%', borderRadius: Radius.xl, borderWidth: 1, borderStyle: 'dashed', alignItems: 'center', justifyContent: 'center', marginBottom: Spacing.sm, minHeight: 90 },
  addTileIcon:  { fontSize: 28, fontWeight: '300' },
  addTileTxt:   { fontSize: Typography.sizes.xs, fontWeight: Typography.weights.medium },
  emptyCard:    { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.xxl, alignItems: 'center', gap: Spacing.sm },
  emptyIcon:    { fontSize: 52 },
  emptyTitle:   { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold },
  emptySub:     { fontSize: Typography.sizes.sm, textAlign: 'center' },
  emptyBtn:     { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm, borderRadius: Radius.full, marginTop: Spacing.sm },
  emptyBtnTxt:  { color: '#fff', fontWeight: Typography.weights.bold },
});
