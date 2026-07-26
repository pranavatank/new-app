import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Modal, Pressable, Alert, KeyboardAvoidingView,
  Platform, StatusBar, Animated, FlatList,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { scaleTheme, makeShadow, Typography, Spacing, Radius } from '../constants/theme';
import { useTheme } from '../store/ThemeContext';
import DayNavigator from '../components/DayNavigator';
import useAppStore from '../store/useAppStore';
import {
  getTasksForDay,
  getCompletedTasks,
  addTask,
  updateTask,
  completeTask,
  revertTask,
  deleteTask,
} from '../db/queries';

// ── Date helpers ──────────────────────────────────────────────────────────────

const toDateString = (d) =>
  `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;

const todayStr = () => toDateString(new Date());

const formatDate = (ds) => {
  if (!ds) return '';
  const [y, m, d] = ds.split('-').map(Number);
  const date = new Date(y, m-1, d);
  const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
  return `${d} ${MONTHS[m-1]} ${y}`;
};

const getDaysOverdue = (startDate) => {
  const today = new Date(); today.setHours(0,0,0,0);
  const start = new Date(startDate + 'T00:00:00'); start.setHours(0,0,0,0);
  const diff  = Math.floor((today - start) / 86400000);
  return diff;
};

// ── Add / Edit Task Modal ─────────────────────────────────────────────────────

const MONTHS_FULL = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const TaskModal = ({ visible, editTask, onSave, onClose, C, Shadow, t }) => {
  const [title,     setTitle]     = useState('');
  const [startDate, setStartDate] = useState(todayStr());
  const [showCal,   setShowCal]   = useState(false);
  const [calYear,   setCalYear]   = useState(new Date().getFullYear());
  const [calMonth,  setCalMonth]  = useState(new Date().getMonth());

  // Populate when editing
  React.useEffect(() => {
    if (visible) {
      setTitle(editTask?.title || '');
      setStartDate(editTask?.start_date || todayStr());
      const d = new Date((editTask?.start_date || todayStr()) + 'T00:00:00');
      setCalYear(d.getFullYear());
      setCalMonth(d.getMonth());
    }
  }, [visible, editTask]);

  const handleSave = () => {
    if (!title.trim()) { Alert.alert('Required', t('tasks.whatToDo')); return; }
    onSave(title.trim(), startDate, editTask?.id);
    onClose();
  };

  // Tiny inline calendar
  const totalDays = new Date(calYear, calMonth+1, 0).getDate();
  const firstDay  = new Date(calYear, calMonth, 1).getDay();
  const cells = Array(firstDay).fill(null).concat(Array.from({length:totalDays}, (_,i)=>i+1));
  const prevCal = () => calMonth===0 ? (setCalYear(y=>y-1),setCalMonth(11)) : setCalMonth(m=>m-1);
  const nextCal = () => calMonth===11 ? (setCalYear(y=>y+1),setCalMonth(0)) : setCalMonth(m=>m+1);

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <KeyboardAvoidingView behavior={Platform.OS==='ios'?'padding':'height'} style={{flex:1}}>
        <Pressable style={[m.overlay,{backgroundColor:C.overlay}]} onPress={onClose}>
          <Pressable style={[m.sheet,{backgroundColor:C.bgCard},Shadow.md]} onPress={e=>e.stopPropagation()}>
            <View style={[m.handle,{backgroundColor:C.border}]}/>

            <Text style={[m.title,{color:C.textPrimary}]}>
              {editTask ? t('tasks.editTask') : t('tasks.newTaskTitle')}
            </Text>

            {/* Title input */}
            <Text style={[m.label,{color:C.textSecondary}]}>{t('tasks.taskTitle')}</Text>
            <View style={[m.inputWrap,{backgroundColor:C.bgInput,borderColor:C.border}]}>
              <TextInput
                style={[m.input,{color:C.textPrimary}]}
                value={title}
                onChangeText={setTitle}
                placeholder={t('tasks.whatToDo')}
                placeholderTextColor={C.textMuted}
                autoFocus={!editTask}
                multiline
                maxLength={200}
              />
            </View>

            {/* Start date */}
            <Text style={[m.label,{color:C.textSecondary}]}>{t('tasks.startDate')}</Text>
            <TouchableOpacity
              style={[m.datePill,{backgroundColor:C.primaryDim,borderColor:C.primary}]}
              onPress={()=>setShowCal(v=>!v)}
            >
              <Text style={m.dateIcon}>📅</Text>
              <Text style={[m.dateText,{color:C.primary}]}>{formatDate(startDate)}</Text>
              <Text style={[m.dateChevron,{color:C.primary}]}>{showCal?'▲':'▼'}</Text>
            </TouchableOpacity>

            {/* Inline calendar */}
            {showCal && (
              <View style={[m.calWrap,{backgroundColor:C.bgElevated,borderColor:C.border}]}>
                <View style={m.calHeader}>
                  <TouchableOpacity onPress={prevCal} style={[m.calNav,{backgroundColor:C.bgInput}]}>
                    <Text style={[m.calNavTxt,{color:C.primary}]}>‹</Text>
                  </TouchableOpacity>
                  <Text style={[m.calMonth,{color:C.textPrimary}]}>{MONTHS_FULL[calMonth]} {calYear}</Text>
                  <TouchableOpacity onPress={nextCal} style={[m.calNav,{backgroundColor:C.bgInput}]}>
                    <Text style={[m.calNavTxt,{color:C.primary}]}>›</Text>
                  </TouchableOpacity>
                </View>
                <View style={m.calDayRow}>
                  {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d=>(
                    <Text key={d} style={[m.calDayHd,{color:C.textMuted}]}>{d}</Text>
                  ))}
                </View>
                <View style={m.calGrid}>
                  {cells.map((day,idx)=>{
                    if (!day) return <View key={`e${idx}`} style={m.calCell}/>;
                    const ds=`${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;
                    const isSel=ds===startDate, isToday=ds===todayStr();
                    return (
                      <TouchableOpacity key={ds} style={[m.calCell,
                        isSel&&{backgroundColor:C.primary,borderRadius:Radius.sm},
                        isToday&&!isSel&&{borderWidth:1.5,borderColor:C.primary,borderRadius:Radius.sm},
                      ]} onPress={()=>{setStartDate(ds);setShowCal(false);}}>
                        <Text style={[m.calDayTxt,{color:C.textSecondary},
                          isSel&&{color:'#fff',fontWeight:'700'},
                          isToday&&!isSel&&{color:C.primary,fontWeight:'700'},
                        ]}>{day}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            )}

            {/* Buttons */}
            <View style={m.btnRow}>
              <TouchableOpacity style={[m.btn,m.cancelBtn,{borderColor:C.border}]} onPress={onClose}>
                <Text style={[m.btnTxt,{color:C.textSecondary}]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[m.btn,{backgroundColor:C.primary}]} onPress={handleSave}>
                <Text style={[m.btnTxt,{color:'#fff'}]}>{editTask?t('tasks.update'):t('tasks.add')}</Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
};

const m = StyleSheet.create({
  overlay:    {flex:1, justifyContent:'flex-end'},
  sheet:      {borderTopLeftRadius:24,borderTopRightRadius:24,padding:Spacing.xl,paddingBottom:36},
  handle:     {width:40,height:4,borderRadius:2,alignSelf:'center',marginBottom:Spacing.base},
  title:      {fontSize:Typography.sizes.xl,fontWeight:Typography.weights.bold,marginBottom:Spacing.base},
  label:      {fontSize:Typography.sizes.xs,fontWeight:Typography.weights.semibold,letterSpacing:0.8,textTransform:'uppercase',marginBottom:Spacing.xs},
  inputWrap:  {borderRadius:Radius.lg,borderWidth:1.5,padding:Spacing.md,marginBottom:Spacing.base,minHeight:80},
  input:      {fontSize:Typography.sizes.base,lineHeight:22},
  datePill:   {flexDirection:'row',alignItems:'center',gap:Spacing.xs,borderWidth:1.5,borderRadius:Radius.full,paddingHorizontal:Spacing.base,paddingVertical:Spacing.sm,alignSelf:'flex-start',marginBottom:Spacing.sm},
  dateIcon:   {fontSize:14},
  dateText:   {fontSize:Typography.sizes.sm,fontWeight:Typography.weights.semibold},
  dateChevron:{fontSize:10,fontWeight:'700'},
  calWrap:    {borderRadius:Radius.lg,borderWidth:1,padding:Spacing.sm,marginBottom:Spacing.base},
  calHeader:  {flexDirection:'row',alignItems:'center',justifyContent:'space-between',marginBottom:Spacing.xs},
  calNav:     {width:30,height:30,borderRadius:15,alignItems:'center',justifyContent:'center'},
  calNavTxt:  {fontSize:18,fontWeight:'700',lineHeight:22},
  calMonth:   {fontSize:Typography.sizes.sm,fontWeight:Typography.weights.bold},
  calDayRow:  {flexDirection:'row',marginBottom:4},
  calDayHd:   {flex:1,textAlign:'center',fontSize:10,fontWeight:'600'},
  calGrid:    {flexDirection:'row',flexWrap:'wrap'},
  calCell:    {width:`${100/7}%`,aspectRatio:1,alignItems:'center',justifyContent:'center'},
  calDayTxt:  {fontSize:12},
  btnRow:     {flexDirection:'row',gap:Spacing.sm,marginTop:Spacing.base},
  btn:        {flex:1,paddingVertical:Spacing.md,borderRadius:Radius.lg,alignItems:'center'},
  cancelBtn:  {borderWidth:1},
  btnTxt:     {fontSize:Typography.sizes.base,fontWeight:Typography.weights.semibold},
});

// ── Task Card ─────────────────────────────────────────────────────────────────

const TaskCard = ({ task, onComplete, onEdit, onDelete, C, Shadow, t }) => {
  const overdue  = getDaysOverdue(task.start_date);
  const isOverdue = overdue > 0;
  const isNew    = overdue === 0;

  return (
    <View style={[tc.card, {backgroundColor:C.bgCard,borderColor:isOverdue?C.expense:C.border}, Shadow.sm,
      isOverdue && {borderLeftColor:C.expense,borderLeftWidth:3},
      isNew     && {borderLeftColor:C.primary, borderLeftWidth:3},
    ]}>
      <View style={tc.top}>
        {/* Checkbox */}
        <TouchableOpacity
          style={[tc.check,{borderColor:C.primary}]}
          onPress={()=>onComplete(task.id)}
          activeOpacity={0.7}
        >
          <View style={[tc.checkInner,{backgroundColor:'transparent'}]}/>
        </TouchableOpacity>

        {/* Content */}
        <View style={tc.body}>
          <Text style={[tc.taskTitle,{color:C.textPrimary}]}>{task.title}</Text>
          <View style={tc.meta}>
            <View style={[tc.pill,{backgroundColor:C.bgElevated}]}>
              <Text style={tc.pillIcon}>📅</Text>
              <Text style={[tc.pillTxt,{color:C.textSecondary}]}>{t('common.from')} {formatDate(task.start_date)}</Text>
            </View>
            {isOverdue && (
              <View style={[tc.pill,{backgroundColor:C.expenseLight}]}>
                <Text style={[tc.pillTxt,{color:C.expense}]}>
                  {overdue === 1 ? `1 ${t('tasks.dayOverdue')}` : `${overdue} ${t('tasks.daysOverdue')}`}
                </Text>
              </View>
            )}
            {isNew && (
              <View style={[tc.pill,{backgroundColor:C.primaryDim}]}>
                <Text style={[tc.pillTxt,{color:C.primary}]}>{t('tasks.newToday')}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Actions */}
        <View style={tc.actions}>
          <TouchableOpacity style={[tc.actionBtn,{backgroundColor:C.bgElevated}]} onPress={()=>onEdit(task)}>
            <Text style={{fontSize:13}}>✏️</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[tc.actionBtn,{backgroundColor:C.expenseLight}]} onPress={()=>onDelete(task.id)}>
            <Text style={{fontSize:13}}>🗑️</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Complete bar */}
      <TouchableOpacity
        style={[tc.completeBar,{backgroundColor:C.primaryDim}]}
        onPress={()=>onComplete(task.id)}
        activeOpacity={0.8}
      >
        <Text style={tc.completeIcon}>✅</Text>
        <Text style={[tc.completeTxt,{color:C.primary}]}>{t('tasks.markComplete')}</Text>
      </TouchableOpacity>
    </View>
  );
};

const tc = StyleSheet.create({
  card:        {borderRadius:Radius.xl,borderWidth:1,marginBottom:Spacing.sm,overflow:'hidden'},
  top:         {flexDirection:'row',alignItems:'flex-start',padding:Spacing.base,gap:Spacing.sm},
  check:       {width:24,height:24,borderRadius:12,borderWidth:2,alignItems:'center',justifyContent:'center',marginTop:2},
  checkInner:  {width:8,height:8,borderRadius:4},
  body:        {flex:1},
  taskTitle:   {fontSize:Typography.sizes.base,fontWeight:Typography.weights.semibold,lineHeight:22,marginBottom:Spacing.xs},
  meta:        {flexDirection:'row',flexWrap:'wrap',gap:Spacing.xs},
  pill:        {flexDirection:'row',alignItems:'center',gap:3,paddingHorizontal:8,paddingVertical:3,borderRadius:Radius.full},
  pillIcon:    {fontSize:10},
  pillTxt:     {fontSize:Typography.sizes.xs,fontWeight:Typography.weights.medium},
  actions:     {flexDirection:'row',gap:Spacing.xs},
  actionBtn:   {width:32,height:32,borderRadius:Radius.sm,alignItems:'center',justifyContent:'center'},
  completeBar: {flexDirection:'row',alignItems:'center',justifyContent:'center',gap:Spacing.xs,paddingVertical:Spacing.sm},
  completeIcon:{fontSize:14},
  completeTxt: {fontSize:Typography.sizes.xs,fontWeight:Typography.weights.semibold,letterSpacing:0.3},
});

// ── Completed Task Row ────────────────────────────────────────────────────────

const CompletedRow = ({ task, onDelete, onRevert, C, t }) => (
  <View style={[cr.row,{borderBottomColor:C.divider}]}>
    <TouchableOpacity onPress={()=>onRevert(task.id)} style={cr.checkBtn}>
      <Text style={cr.check}>✅</Text>
    </TouchableOpacity>
    <View style={cr.info}>
      <Text style={[cr.title,{color:C.textSecondary}]}>{task.title}</Text>
      <Text style={[cr.date,{color:C.textMuted}]}>
        {t('tasks.completed')} {task.completed_date ? formatDate(task.completed_date) : ''}
      </Text>
    </View>
    <TouchableOpacity onPress={()=>onDelete(task.id)}>
      <Text style={{fontSize:14,opacity:0.4}}>🗑️</Text>
    </TouchableOpacity>
  </View>
);
const cr = StyleSheet.create({
  row:   {flexDirection:'row',alignItems:'center',gap:Spacing.sm,paddingVertical:Spacing.sm,borderBottomWidth:1},
  checkBtn: {padding:4},
  check: {fontSize:16},
  info:  {flex:1},
  title: {fontSize:Typography.sizes.sm,fontWeight:Typography.weights.medium},
  date:  {fontSize:Typography.sizes.xs,marginTop:2},
});

// ── Main Tasks Screen ─────────────────────────────────────────────────────────

export default function TasksScreen({ route }) {
  const { t } = useTranslation();
  const { C, scale } = useTheme();
  const { Typography, Spacing, Radius } = scaleTheme(scale);
  const Shadow = makeShadow(C);
  const { selectedDate } = useAppStore();

  const [pending,    setPending]    = useState([]);
  const [completed,  setCompleted]  = useState([]);
  const [showModal,  setShowModal]  = useState(false);
  const [editTask,   setEditTask]   = useState(null);
  const [showDone,   setShowDone]   = useState(false);
  const [tab,        setTab]        = useState('pending'); // 'pending' | 'completed'

  const load = useCallback(() => {
    setPending(getTasksForDay(selectedDate));
    setCompleted(getCompletedTasks());
  }, [selectedDate]);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  React.useEffect(() => { 
    load();
  }, [selectedDate, load]);

  // Auto-open add modal if navigated here with autoAdd param
  React.useEffect(() => {
    if (route?.params?.autoAdd) {
      setEditTask(null);
      setShowModal(true);
    }
  }, [route?.params?.autoAdd]);

  const handleSave = (title, startDate, id) => {
    if (id) updateTask(id, title, startDate);
    else    addTask(title, startDate);
    load();
  };

  const handleComplete = (id) => {
    Alert.alert(t('tasks.markComplete'), t('tasks.completeConfirm'), [
      {text:t('common.cancel'), style:'cancel'},
      {text:t('tasks.complete'), onPress:()=>{ completeTask(id); load(); }},
    ]);
  };

  const handleDelete = (id) => {
    Alert.alert(t('tasks.delete'), t('tasks.deleteConfirm'), [
      {text:t('common.cancel'), style:'cancel'},
      {text:t('common.delete'), style:'destructive', onPress:()=>{ deleteTask(id); load(); }},
    ]);
  };

  const handleEdit = (task) => {
    setEditTask(task);
    setShowModal(true);
  };

  const handleRevert = (id) => {
    revertTask(id);
    load();
  };

  const overdueCount = pending.filter(t => getDaysOverdue(t.start_date) > 0).length;

  return (
    <View style={[s.root,{backgroundColor:C.bg}]}>
      <StatusBar barStyle={C.isDark?'light-content':'dark-content'} backgroundColor={C.bgCard}/>
      <DayNavigator/>

      {/* Header */}
      <View style={[s.header,{backgroundColor:C.bgCard,borderBottomColor:C.border}]}>
        <View style={s.headerLeft}>
          <Text style={[s.headerTitle,{color:C.textPrimary}]}>{t('tasks.title')}</Text>
          {overdueCount > 0 && (
            <View style={[s.overdueBadge,{backgroundColor:C.expenseLight}]}>
              <Text style={[s.overdueText,{color:C.expense}]}>{overdueCount} {t('tasks.overdue')}</Text>
            </View>
          )}
        </View>
        <TouchableOpacity
          style={[s.addBtn,{backgroundColor:C.primary},makeShadow(C).primary]}
          onPress={()=>{setEditTask(null);setShowModal(true);}}
          activeOpacity={0.85}
        >
          <Text style={s.addBtnTxt}>{t('tasks.newTask')}</Text>
        </TouchableOpacity>
      </View>

      {/* Tab switcher */}
      <View style={[s.tabRow,{backgroundColor:C.bgCard,borderBottomColor:C.border}]}>
        {['pending','completed'].map(tb=>(
          <TouchableOpacity
            key={tb}
            style={[s.tabBtn, tab===tb && {borderBottomColor:C.primary,borderBottomWidth:2}]}
            onPress={()=>setTab(tb)}
          >
            <Text style={[s.tabTxt,{color:tab===tb?C.primary:C.textSecondary}]}>
              {tb==='pending'
                ? `${t('tasks.pending')}${pending.length>0?' ('+pending.length+')':''}`
                : `${t('tasks.completed')}${completed.length>0?' ('+completed.length+')':''}`
              }
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView style={s.scroll} contentContainerStyle={s.content} showsVerticalScrollIndicator={false}>

        {tab==='pending' && (
          <>
            {pending.length === 0 ? (
              <View style={[s.emptyCard,{backgroundColor:C.bgCard,borderColor:C.border}]}>
                <Text style={s.emptyIcon}>🎯</Text>
                <Text style={[s.emptyTitle,{color:C.textPrimary}]}>{t('tasks.noTasks')}</Text>
                <Text style={[s.emptySub,{color:C.textSecondary}]}>{t('tasks.noTasksSub')}</Text>
                <TouchableOpacity
                  style={[s.emptyBtn,{backgroundColor:C.primary}]}
                  onPress={()=>{setEditTask(null);setShowModal(true);}}
                >
                  <Text style={s.emptyBtnTxt}>{t('tasks.addFirst')}</Text>
                </TouchableOpacity>
              </View>
            ) : (
              pending.map(task => (
                <TaskCard
                  key={task.id} task={task}
                  onComplete={handleComplete}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                  C={C} Shadow={Shadow} t={t}
                />
              ))
            )}
          </>
        )}

        {tab==='completed' && (
          <View style={[s.doneCard,{backgroundColor:C.bgCard,borderColor:C.border}]}>
            {completed.length === 0 ? (
              <View style={s.emptyInner}>
                <Text style={s.emptyIcon}>📋</Text>
                <Text style={[s.emptySub,{color:C.textSecondary}]}>{t('tasks.noCompleted')}</Text>
              </View>
            ) : (
              completed.map(tk=>(
                <CompletedRow key={tk.id} task={tk} onDelete={handleDelete} onRevert={handleRevert} C={C} t={t}/>
              ))
            )}
          </View>
        )}

        <View style={{height:32}}/>
      </ScrollView>

      <TaskModal
        visible={showModal}
        editTask={editTask}
        onSave={handleSave}
        onClose={()=>{setShowModal(false);setEditTask(null);}}
        C={C} Shadow={Shadow} t={t}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, maxWidth: Platform.OS === 'web' ? 1200 : '100%', width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, borderBottomWidth: 1 },
  headerLeft:   { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm },
  headerTitle:  { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold },
  overdueBadge: { paddingHorizontal: Spacing.sm, paddingVertical: 3, borderRadius: Radius.full },
  overdueText:  { fontSize: Typography.sizes.xs, fontWeight: Typography.weights.bold },
  addBtn:       { paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, borderRadius: Radius.full },
  addBtnTxt:    { color: '#fff', fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold },
  tabRow:       { flexDirection: 'row', borderBottomWidth: 1 },
  tabBtn:       { flex: 1, paddingVertical: Spacing.sm, alignItems: 'center' },
  tabTxt:       { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold },
  scroll:  { flex: 1 },
  content: { padding: Spacing.base },
  emptyCard:  { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.xxl, alignItems: 'center', gap: Spacing.sm },
  emptyIcon:  { fontSize: 52 },
  emptyTitle: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold },
  emptySub:   { fontSize: Typography.sizes.sm, textAlign: 'center' },
  emptyBtn:   { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm, borderRadius: Radius.full, marginTop: Spacing.sm },
  emptyBtnTxt:{ color: '#fff', fontWeight: Typography.weights.bold },
  doneCard:   { borderRadius: Radius.xl, borderWidth: 1, padding: Spacing.base },
  emptyInner: { alignItems: 'center', padding: Spacing.xl, gap: Spacing.sm },
});
