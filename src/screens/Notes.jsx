import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Modal, Pressable, Alert, KeyboardAvoidingView,
  Platform, StatusBar,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { scaleTheme, makeShadow, Typography, Spacing, Radius } from '../constants/theme';
import { useTheme } from '../store/ThemeContext';
import DayNavigator from '../components/DayNavigator';
import useAppStore from '../store/useAppStore';
import {
  getNotesForDay,
  addNote,
  updateNote,
  deleteNote,
} from '../db/queries';

// ── Format helpers ─────────────────────────────────────────────────────────────

const formatTime = (isoStr) => {
  if (!isoStr) return '';
  try {
    const d = new Date(isoStr);
    return d.toLocaleTimeString('en-IN', {hour:'2-digit',minute:'2-digit',hour12:true});
  } catch { return ''; }
};

// ── Mood tags (optional note category) ───────────────────────────────────────

const MOODS = [
  {key:'memory', label:'🎉 Memory',  color:'#F59E0B'},
  {key:'visitor',label:'👥 Visitor', color:'#8B5CF6'},
  {key:'errand', label:'📋 Errand',  color:'#3B82F6'},
  {key:'health', label:'💊 Health',  color:'#EF4444'},
  {key:'other',  label:'📝 Other',   color:'#6B7280'},
];

// ── Add / Edit Note Modal ─────────────────────────────────────────────────────

const NoteModal = ({ visible, editNote, onSave, onClose, C, Shadow, t }) => {
  const [text, setText] = useState('');
  const [mood, setMood] = useState('other');
  const inputRef = React.useRef(null);

  React.useEffect(() => {
    if (visible) {
      setText(editNote?.text  || '');
      setMood(editNote?.mood  || 'other');
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [visible, editNote]);

  const handleSave = () => {
    if (!text.trim()) { Alert.alert('Empty', t('notes.writeHere')); return; }
    onSave(text.trim(), mood, editNote?.id);
    onClose();
  };

  const MOODS_TRANSLATED = [
    {key:'memory', label:t('notes.moods.memory'),  color:'#F59E0B'},
    {key:'visitor',label:t('notes.moods.visitor'), color:'#8B5CF6'},
    {key:'errand', label:t('notes.moods.errand'),  color:'#3B82F6'},
    {key:'health', label:t('notes.moods.health'),  color:'#EF4444'},
    {key:'other',  label:t('notes.moods.other'),   color:'#6B7280'},
  ];

  const selectedMood = MOODS_TRANSLATED.find(m=>m.key===mood) || MOODS_TRANSLATED[4];

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={{flex:1}}>
        <Pressable style={[nm.overlay,{backgroundColor:C.overlay}]} onPress={onClose}>
          <Pressable style={[nm.sheet,{backgroundColor:C.bgCard},Shadow.md]} onPress={e=>e.stopPropagation()}>
            <View style={[nm.handle,{backgroundColor:C.border}]}/>

            <Text style={[nm.title,{color:C.textPrimary}]}>
              {editNote ? t('notes.editNote') : t('notes.newNote')}
            </Text>

            {/* Mood selector */}
            <Text style={[nm.label,{color:C.textSecondary}]}>{t('notes.type')}</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={nm.moodScroll} contentContainerStyle={nm.moodRow}>
              {MOODS_TRANSLATED.map(m=>(
                <TouchableOpacity
                  key={m.key}
                  style={[nm.moodChip,
                    {borderColor:mood===m.key?m.color:C.border},
                    mood===m.key && {backgroundColor:m.color+'18'},
                  ]}
                  onPress={()=>setMood(m.key)}
                >
                  <Text style={[nm.moodTxt,{color:mood===m.key?m.color:C.textSecondary}]}>{m.label}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Text area */}
            <View style={[nm.inputWrap,{backgroundColor:C.bgInput,borderColor:selectedMood.color}]}>
              <TextInput
                ref={inputRef}
                style={[nm.input,{color:C.textPrimary}]}
                value={text}
                onChangeText={setText}
                placeholder={t('notes.writeHere')}
                placeholderTextColor={C.textMuted}
                multiline
                textAlignVertical="top"
                maxLength={1000}
              />
              <Text style={[nm.charCount,{color:C.textMuted}]}>{text.length}/1000</Text>
            </View>

            {/* Buttons */}
            <View style={nm.btnRow}>
              <TouchableOpacity style={[nm.btn,nm.cancelBtn,{borderColor:C.border}]} onPress={onClose}>
                <Text style={[nm.btnTxt,{color:C.textSecondary}]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[nm.btn,{backgroundColor:selectedMood.color}]}
                onPress={handleSave}
              >
                <Text style={[nm.btnTxt,{color:'#fff'}]}>{editNote?t('notes.update'):t('notes.saveNote')}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const nm = StyleSheet.create({
  overlay:    {flex:1,justifyContent:'flex-end'},
  sheet:      {borderTopLeftRadius:24,borderTopRightRadius:24,padding:Spacing.xl,paddingBottom:36},
  handle:     {width:40,height:4,borderRadius:2,alignSelf:'center',marginBottom:Spacing.base},
  title:      {fontSize:Typography.sizes.xl,fontWeight:Typography.weights.bold,marginBottom:Spacing.base},
  label:      {fontSize:Typography.sizes.xs,fontWeight:Typography.weights.semibold,letterSpacing:0.8,textTransform:'uppercase',marginBottom:Spacing.xs},
  moodScroll: {marginBottom:Spacing.base},
  moodRow:    {gap:Spacing.xs,paddingBottom:4},
  moodChip:   {paddingHorizontal:Spacing.sm,paddingVertical:7,borderRadius:Radius.full,borderWidth:1.5},
  moodTxt:    {fontSize:Typography.sizes.sm,fontWeight:Typography.weights.semibold},
  inputWrap:  {borderRadius:Radius.lg,borderWidth:2,padding:Spacing.md,marginBottom:Spacing.sm,minHeight:140},
  input:      {fontSize:Typography.sizes.base,lineHeight:24,flex:1,minHeight:100},
  charCount:  {textAlign:'right',fontSize:Typography.sizes.xs,marginTop:Spacing.xs},
  btnRow:     {flexDirection:'row',gap:Spacing.sm,marginTop:Spacing.xs},
  btn:        {flex:1,paddingVertical:Spacing.md,borderRadius:Radius.lg,alignItems:'center'},
  cancelBtn:  {borderWidth:1},
  btnTxt:     {fontSize:Typography.sizes.base,fontWeight:Typography.weights.semibold},
});

// ── Note Card ─────────────────────────────────────────────────────────────────

const NoteCard = ({ note, onEdit, onDelete, C, Shadow, t }) => {
  const MOODS_TRANSLATED = [
    {key:'memory', label:t('notes.moods.memory'),  color:'#F59E0B'},
    {key:'visitor',label:t('notes.moods.visitor'), color:'#8B5CF6'},
    {key:'errand', label:t('notes.moods.errand'),  color:'#3B82F6'},
    {key:'health', label:t('notes.moods.health'),  color:'#EF4444'},
    {key:'other',  label:t('notes.moods.other'),   color:'#6B7280'},
  ];
  const mood = MOODS_TRANSLATED.find(m=>m.key===note.mood) || MOODS_TRANSLATED[4];
  const [expanded, setExpanded] = useState(false);
  const isLong = note.text.length > 120;

  return (
    <View style={[nc.card,{backgroundColor:C.bgCard,borderColor:C.border,borderLeftColor:mood.color,borderLeftWidth:3},Shadow.sm]}>
      {/* Header */}
      <View style={nc.header}>
        <View style={[nc.moodPill,{backgroundColor:mood.color+'18'}]}>
          <Text style={[nc.moodTxt,{color:mood.color}]}>{mood.label}</Text>
        </View>
        <Text style={[nc.time,{color:C.textMuted}]}>{formatTime(note.created_at)}</Text>
        <View style={nc.actions}>
          <TouchableOpacity style={[nc.actionBtn,{backgroundColor:C.bgElevated}]} onPress={()=>onEdit(note)}>
            <Text style={{fontSize:13}}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[nc.actionBtn,{backgroundColor:C.expenseLight}]} onPress={()=>onDelete(note.id)}>
            <Text style={{fontSize:13}}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Text */}
      <Text
        style={[nc.text,{color:C.textPrimary}]}
        numberOfLines={expanded ? undefined : 4}
      >
        {note.text}
      </Text>

      {/* Expand toggle */}
      {isLong && (
        <TouchableOpacity onPress={()=>setExpanded(v=>!v)} style={nc.expandBtn}>
          <Text style={[nc.expandTxt,{color:C.primary}]}>{expanded?t('notes.showLess'):t('notes.readMore')}</Text>
        </TouchableOpacity>
      )}
    </View>
  );
};

const nc = StyleSheet.create({
  card:      {borderRadius:Radius.xl,borderWidth:1,padding:Spacing.base,marginBottom:Spacing.sm},
  header:    {flexDirection:'row',alignItems:'center',gap:Spacing.xs,marginBottom:Spacing.sm},
  moodPill:  {paddingHorizontal:Spacing.sm,paddingVertical:3,borderRadius:Radius.full},
  moodTxt:   {fontSize:Typography.sizes.xs,fontWeight:Typography.weights.bold},
  time:      {flex:1,fontSize:Typography.sizes.xs,marginLeft:Spacing.xs},
  actions:   {flexDirection:'row',gap:Spacing.xs},
  actionBtn: {width:30,height:30,borderRadius:Radius.sm,alignItems:'center',justifyContent:'center'},
  text:      {fontSize:Typography.sizes.base,lineHeight:24},
  expandBtn: {marginTop:Spacing.xs},
  expandTxt: {fontSize:Typography.sizes.xs,fontWeight:Typography.weights.semibold},
});

// ── Main Notes Screen ─────────────────────────────────────────────────────────

export default function NotesScreen({ route }) {
  const { t } = useTranslation();
  const { C, scale } = useTheme();
  const { Typography, Spacing, Radius } = scaleTheme(scale);
  const Shadow = makeShadow(C);
  const { selectedDate, dayData } = useAppStore();

  const [notes,    setNotes]    = useState([]);
  const [modal,    setModal]    = useState(false);
  const [editNote, setEditNote] = useState(null);

  const load = useCallback(() => {
    if (dayData) setNotes(getNotesForDay(dayData.id));
  }, [dayData, selectedDate]);

  useEffect(() => { 
    if (dayData) setNotes(getNotesForDay(dayData.id));
  }, [selectedDate, dayData]);

  React.useEffect(() => {
    if (route?.params?.autoAdd) {
      setEditNote(null);
      setModal(true);
    }
  }, [route?.params?.autoAdd]);

  const handleSave = (text, mood, id) => {
    if (!dayData) return;
    if (id) updateNote(id, text, mood);
    else    addNote(dayData.id, text, mood);
    load();
  };

  const handleDelete = (id) => {
    Alert.alert(t('notes.delete'), t('notes.deleteNote'), [
      {text:t('common.cancel'),style:'cancel'},
      {text:t('common.delete'),style:'destructive',onPress:()=>{ deleteNote(id); load(); }},
    ]);
  };

  const handleEdit = (note) => {
    setEditNote(note);
    setModal(true);
  };

  // Group notes by type for display
  const grouped = MOODS.reduce((acc,m)=>{
    const list = notes.filter(n=>(n.mood||'other')===m.key);
    if (list.length>0) acc.push({mood:m,notes:list});
    return acc;
  },{} instanceof Array ? {} : []);

  return (
    <View style={[s.root,{backgroundColor:C.bg}]}>
      <StatusBar barStyle={C.isDark?'light-content':'dark-content'} backgroundColor={C.bgCard}/>
      <DayNavigator/>

      {/* Header */}
      <View style={[s.header,{backgroundColor:C.bgCard,borderBottomColor:C.border}]}>
        <View>
          <Text style={[s.headerTitle,{color:C.textPrimary}]}>{t('notes.title')}</Text>
          <Text style={[s.headerSub,{color:C.textSecondary}]}>
            {notes.length>0?`${notes.length} ${notes.length===1?t('notes.memoryCount'):t('notes.memoriesCount')}`:t('notes.captureDay')}
          </Text>
        </View>
        <TouchableOpacity
          style={[s.addBtn,{backgroundColor:C.iconNotes},Shadow.primary]}
          onPress={()=>{setEditNote(null);setModal(true);}}
          activeOpacity={0.85}
        >
          <Text style={s.addBtnTxt}>{t('notes.addNote')}</Text>
        </TouchableOpacity>
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {notes.length === 0 ? (
          <View style={[s.emptyCard,{backgroundColor:C.bgCard,borderColor:C.border}]}>
            <Text style={s.emptyIcon}>📝</Text>
            <Text style={[s.emptyTitle,{color:C.textPrimary}]}>{t('notes.noNotes')}</Text>
            <Text style={[s.emptySub,{color:C.textSecondary}]}>
              {t('notes.noNotesSub')}
            </Text>
            {/* Mood chips as suggestions */}
            <View style={s.moodSuggest}>
              {MOODS.slice(0,4).map(m=>(
                <TouchableOpacity
                  key={m.key}
                  style={[s.moodBtn,{backgroundColor:m.color+'18',borderColor:m.color+'40'}]}
                  onPress={()=>{setEditNote({mood:m.key,text:''});setModal(true);}}
                >
                  <Text style={[s.moodBtnTxt,{color:m.color}]}>{t(`notes.moods.${m.key}`)}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        ) : (
          notes.map(note => (
            <NoteCard
              key={note.id}
              note={note}
              onEdit={handleEdit}
              onDelete={handleDelete}
              C={C} Shadow={Shadow} t={t}
            />
          ))
        )}

        <View style={{height:32}}/>
      </ScrollView>

      <NoteModal
        visible={modal}
        editNote={editNote}
        onSave={handleSave}
        onClose={()=>{setModal(false);setEditNote(null);}}
        C={C} Shadow={Shadow} t={t}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, maxWidth: Platform.OS === 'web' ? 1200 : '100%', width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, borderBottomWidth: 1 },
  headerTitle: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold },
  headerSub:   { fontSize: Typography.sizes.xs, marginTop: 2 },
  addBtn:      { paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, borderRadius: Radius.full },
  addBtnTxt:   { color: '#fff', fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold },
  scroll:  { flex: 1 },
  content: { padding: Spacing.base },
  emptyCard:    { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.xl, alignItems: 'center', gap: Spacing.sm },
  emptyIcon:    { fontSize: 52 },
  emptyTitle:   { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold },
  emptySub:     { fontSize: Typography.sizes.sm, textAlign: 'center', lineHeight: 20 },
  moodSuggest:  { flexDirection: 'row', flexWrap: 'wrap', gap: Spacing.xs, justifyContent: 'center', marginTop: Spacing.xs },
  moodBtn:      { paddingHorizontal: Spacing.sm, paddingVertical: 7, borderRadius: Radius.full, borderWidth: 1 },
  moodBtnTxt:   { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold },
});
