import React, { useEffect, useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, StatusBar, Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { scaleTheme } from '../constants/theme';
import { useTheme } from '../store/ThemeContext';
import DayNavigator from '../components/DayNavigator';
import useAppStore from '../store/useAppStore';
import { Card, Sheet, Input, Chip, EmptyState, IconBadge, FAB, Button } from '../components/common';
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
// NOTE: keys/colors are stored data values — do not rename. `icon` is purely
// visual (Ionicons name used in place of the old emoji prefix).

const MOODS = [
  {key:'memory', label:'🎉 Memory',  color:'#F59E0B', icon:'sparkles'},
  {key:'visitor',label:'👥 Visitor', color:'#8B5CF6', icon:'people'},
  {key:'errand', label:'📋 Errand',  color:'#3B82F6', icon:'clipboard'},
  {key:'health', label:'💊 Health',  color:'#EF4444', icon:'medkit'},
  {key:'other',  label:'📝 Other',   color:'#6B7280', icon:'document-text'},
];

// ── Add / Edit Note Modal ─────────────────────────────────────────────────────

const NoteModal = ({ visible, editNote, onSave, onClose, C, t }) => {
  const { scale } = useTheme();
  const { Typography, Spacing } = scaleTheme(scale);
  const [text, setText] = useState('');
  const [mood, setMood] = useState('other');
  const [showTypes, setShowTypes] = useState(false);
  const [error, setError] = useState('');

  React.useEffect(() => {
    if (visible) {
      setText(editNote?.text  || '');
      setMood(editNote?.mood  || 'other');
      setShowTypes(false);
      setError('');
    }
  }, [visible, editNote]);

  const handleSave = () => {
    if (!text.trim()) { setError(t('ledger.note_required')); return; }
    try {
      onSave(text.trim(), mood, editNote?.id);
      onClose();
    } catch (e) { setError(t('ledger.save_failed')); }
  };

  const MOODS_TRANSLATED = MOODS.map(m => ({...m, label: t(`notes.moods.${m.key}`)}));
  const selectedMood = MOODS_TRANSLATED.find(m=>m.key===mood) || MOODS_TRANSLATED[4];

  return (
    <Sheet
      visible={visible}
      onClose={onClose}
      title={editNote ? t('notes.editNote') : t('notes.newNote')}
    >
      <TouchableOpacity onPress={() => setShowTypes(v => !v)} style={{ minHeight: 48, justifyContent: 'center', marginBottom: Spacing.sm }}>
        <Text style={{ color: C.primary, fontSize: Typography.sizes.base }}>{t('notes.type')} · {showTypes ? '−' : '+'}</Text>
      </TouchableOpacity>
      {showTypes && <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{marginBottom:Spacing.base}} contentContainerStyle={{gap:Spacing.xs}}>
        {MOODS_TRANSLATED.map(m=>(
          <Chip
            key={m.key}
            label={m.label}
            icon={m.icon}
            color={m.color}
            active={mood===m.key}
            onPress={()=>setMood(m.key)}
          />
        ))}
      </ScrollView>}

      <Input
        value={text}
        onChangeText={setText}
        placeholder={t('notes.writeHere')}
        multiline
        textAlignVertical="top"
        maxLength={1000}
        inputStyle={{minHeight:120, borderColor:selectedMood.color}}
      />
      <Text style={[nm.charCount,{color:C.textMuted, fontSize:Typography.sizes.xs, marginTop:Spacing.xs, marginBottom:Spacing.base}]}>
        {text.length}/1000
      </Text>

      <View style={{flexDirection:'row', gap:Spacing.sm}}>
        <Button label={t('common.cancel')} variant="secondary" onPress={onClose} style={{flex:1}} />
        <Button
          label={editNote?t('notes.update'):t('notes.saveNote')}
          variant="primary"
          onPress={handleSave}
          style={{flex:1}}
        />
      </View>
      {!!error && <Text accessibilityRole="alert" style={{ color: C.expense, fontSize: Typography.sizes.base, marginTop: Spacing.sm }}>{error}</Text>}
    </Sheet>
  );
};

const nm = StyleSheet.create({
  label:      {letterSpacing:0.8,textTransform:'uppercase'},
  charCount:  {textAlign:'right'},
});

// ── Note Card ─────────────────────────────────────────────────────────────────

const NoteCard = ({ note, onEdit, onDelete, C, t }) => {
  const { scale } = useTheme();
  const { Typography, Spacing, Radius } = scaleTheme(scale);
  const MOODS_TRANSLATED = MOODS.map(m => ({...m, label: t(`notes.moods.${m.key}`)}));
  const mood = MOODS_TRANSLATED.find(m=>m.key===note.mood) || MOODS_TRANSLATED[4];
  const [expanded, setExpanded] = useState(false);
  const isLong = note.text.length > 120;

  return (
    <Card
      style={[nc.card, {borderLeftColor:mood.color, borderLeftWidth:3, marginBottom:Spacing.sm}]}
    >
      <View style={[nc.header, {gap:Spacing.xs, marginBottom:Spacing.sm}]}>
        <IconBadge icon={mood.icon} color={mood.color} size={30} />
        <Text style={[nc.moodTxt,{color:mood.color, fontSize:Typography.sizes.xs, fontWeight:Typography.weights.bold}]}>
          {mood.label}
        </Text>
        <Text style={[nc.time,{color:C.textMuted, fontSize:Typography.sizes.xs, marginLeft:Spacing.xs}]}>
          {formatTime(note.created_at)}
        </Text>
        <View style={[nc.actions, {gap:Spacing.xs}]}>
          <TouchableOpacity style={[nc.actionBtn,{backgroundColor:C.bgElevated, borderRadius:Radius.sm}]} onPress={()=>onEdit(note)}>
            <Ionicons name="create-outline" size={16} color={C.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={[nc.actionBtn,{backgroundColor:C.expenseLight, borderRadius:Radius.sm}]} onPress={()=>onDelete(note.id)}>
            <Ionicons name="trash-outline" size={16} color="#EF4444" />
          </TouchableOpacity>
        </View>
      </View>

      <Text
        style={[nc.text,{color:C.textPrimary, fontSize:Typography.sizes.base}]}
        numberOfLines={expanded ? undefined : 4}
      >
        {note.text}
      </Text>

      {isLong && (
        <TouchableOpacity onPress={()=>setExpanded(v=>!v)} style={{marginTop:Spacing.xs}}>
          <Text style={[nc.expandTxt,{color:C.primary, fontSize:Typography.sizes.xs, fontWeight:Typography.weights.semibold}]}>
            {expanded?t('notes.showLess'):t('notes.readMore')}
          </Text>
        </TouchableOpacity>
      )}
    </Card>
  );
};

const nc = StyleSheet.create({
  card:      {},
  header:    {flexDirection:'row',alignItems:'center'},
  moodTxt:   {},
  time:      {flex:1},
  actions:   {flexDirection:'row'},
  actionBtn: {width:30,height:30,alignItems:'center',justifyContent:'center'},
  text:      {lineHeight:24},
  expandTxt: {},
});

// ── Main Notes Screen ─────────────────────────────────────────────────────────

export default function NotesScreen({ route }) {
  const { t } = useTranslation();
  const { C, scale } = useTheme();
  const { Typography, Spacing } = scaleTheme(scale);
  const { selectedDate, dayData, refreshDayData } = useAppStore();

  const [notes,    setNotes]    = useState([]);
  const [modal,    setModal]    = useState(false);
  const [editNote, setEditNote] = useState(null);
  useFocusEffect(useCallback(() => { refreshDayData(selectedDate); }, [selectedDate, refreshDayData]));

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
    if (!dayData) throw new Error('Day is not ready');
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

  return (
    <View style={[s.root,{backgroundColor:C.bg}]}>
      <StatusBar barStyle={C.isDark?'light-content':'dark-content'} backgroundColor={C.bgCard}/>
      <DayNavigator/>

      {/* Header */}
      <View style={[s.header,{backgroundColor:C.bgCard,borderBottomColor:C.border, paddingHorizontal:Spacing.base, paddingVertical:Spacing.md}]}>
        <View>
          <Text style={[s.headerTitle,{color:C.textPrimary, fontSize:Typography.sizes.xl, fontWeight:Typography.weights.bold}]}>
            {t('notes.title')}
          </Text>
          <Text style={[s.headerSub,{color:C.textSecondary, fontSize:Typography.sizes.xs, marginTop:2}]}>
            {notes.length>0?`${notes.length} ${notes.length===1?t('notes.memoryCount'):t('notes.memoriesCount')}`:t('notes.captureDay')}
          </Text>
        </View>
        <IconBadge icon="reader-outline" color={C.iconNotes} size={40} />
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={[s.content, {padding:Spacing.base, paddingBottom:100}]} showsVerticalScrollIndicator={false}>
        <Button label={t('ledger.add_note')} icon="add" size="lg" fullWidth onPress={() => { setEditNote(null); setModal(true); }} style={{ marginBottom: Spacing.base }} />

        {notes.length === 0 ? (
          <Card style={{alignItems:'center'}}>
            <EmptyState icon="document-text-outline" title={t('notes.noNotes')} subtitle={t('notes.noNotesSub')} />
            <View style={[s.moodSuggest, {gap:Spacing.xs, marginTop:Spacing.xs}]}>
              {MOODS.slice(0,4).map(m=>(
                <Chip
                  key={m.key}
                  label={t(`notes.moods.${m.key}`)}
                  icon={m.icon}
                  color={m.color}
                  onPress={()=>{setEditNote({mood:m.key,text:''});setModal(true);}}
                />
              ))}
            </View>
          </Card>
        ) : (
          notes.map(note => (
            <NoteCard
              key={note.id}
              note={note}
              onEdit={handleEdit}
              onDelete={handleDelete}
              C={C} t={t}
            />
          ))
        )}
      </ScrollView>

      <FAB
        icon="add"
        onPress={()=>{setEditNote(null);setModal(true);}}
        style={s.fab}
      />

      <NoteModal
        visible={modal}
        editNote={editNote}
        onSave={handleSave}
        onClose={()=>{setModal(false);setEditNote(null);}}
        C={C} t={t}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, maxWidth: Platform.OS === 'web' ? 1200 : '100%', width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1 },
  headerTitle: {},
  headerSub:   {},
  scroll:  { flex: 1 },
  content: {},
  moodSuggest:  { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center' },
  fab: { position: 'absolute', right: 20, bottom: 110 },
});
