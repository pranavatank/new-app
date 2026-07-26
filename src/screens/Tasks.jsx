import React, { useState, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  Alert, StatusBar, Platform,
} from 'react-native';
import { useFocusEffect } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import * as Haptics from 'expo-haptics';
import { Ionicons } from '@expo/vector-icons';
import { scaleTheme } from '../constants/theme';
import { useTheme } from '../store/ThemeContext';
import DayNavigator from '../components/DayNavigator';
import useAppStore from '../store/useAppStore';
import { Card, Button, Sheet, Input, Chip, Badge, EmptyState } from '../components/common';
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

const TaskModal = ({ visible, editTask, onSave, onClose }) => {
  const { t } = useTranslation();
  const { C, scale } = useTheme();
  const { Typography, Spacing, Radius } = scaleTheme(scale);

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
    <Sheet visible={visible} onClose={onClose} title={editTask ? t('tasks.editTask') : t('tasks.newTaskTitle')}>
      <Input
        label={t('tasks.taskTitle')}
        value={title}
        onChangeText={setTitle}
        placeholder={t('tasks.whatToDo')}
        autoFocus={!editTask}
        multiline
        maxLength={200}
        style={{ marginBottom: Spacing.base }}
        inputStyle={{ minHeight: 80, textAlignVertical: 'top' }}
      />

      {/* Start date */}
      <Text style={[m.label, { color: C.textSecondary, marginBottom: Spacing.xs }]}>{t('tasks.startDate')}</Text>
      <TouchableOpacity
        style={[m.datePill, { backgroundColor: C.primaryDim, borderColor: C.primary, borderRadius: Radius.full, paddingHorizontal: Spacing.base, paddingVertical: Spacing.sm, marginBottom: Spacing.sm }]}
        onPress={()=>setShowCal(v=>!v)}
        activeOpacity={0.75}
      >
        <Ionicons name="calendar-outline" size={16} color={C.primary} />
        <Text style={[m.dateText, { color: C.primary, fontSize: Typography.sizes.sm }]}>{formatDate(startDate)}</Text>
        <Ionicons name={showCal ? 'chevron-up' : 'chevron-down'} size={14} color={C.primary} />
      </TouchableOpacity>

      {/* Inline calendar */}
      {showCal && (
        <View style={[m.calWrap, { backgroundColor: C.bgElevated, borderColor: C.border, borderRadius: Radius.lg, padding: Spacing.sm, marginBottom: Spacing.base }]}>
          <View style={m.calHeader}>
            <TouchableOpacity onPress={prevCal} style={[m.calNav, { backgroundColor: C.bgInput }]}>
              <Ionicons name="chevron-back" size={18} color={C.primary} />
            </TouchableOpacity>
            <Text style={[m.calMonth, { color: C.textPrimary, fontSize: Typography.sizes.sm }]}>{MONTHS_FULL[calMonth]} {calYear}</Text>
            <TouchableOpacity onPress={nextCal} style={[m.calNav, { backgroundColor: C.bgInput }]}>
              <Ionicons name="chevron-forward" size={18} color={C.primary} />
            </TouchableOpacity>
          </View>
          <View style={m.calDayRow}>
            {['Su','Mo','Tu','We','Th','Fr','Sa'].map(d=>(
              <Text key={d} style={[m.calDayHd, { color: C.textMuted }]}>{d}</Text>
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
      <View style={[m.btnRow, { gap: Spacing.sm }]}>
        <View style={{ flex: 1 }}>
          <Button variant="ghost" label={t('common.cancel')} onPress={onClose} fullWidth />
        </View>
        <View style={{ flex: 1 }}>
          <Button variant="primary" label={editTask ? t('tasks.update') : t('tasks.add')} onPress={handleSave} fullWidth />
        </View>
      </View>
    </Sheet>
  );
};

const m = StyleSheet.create({
  label:      { fontSize: 12, fontWeight: '600', letterSpacing: 0.8, textTransform: 'uppercase' },
  datePill:   { flexDirection: 'row', alignItems: 'center', gap: 6, borderWidth: 1.5, alignSelf: 'flex-start' },
  dateText:   { fontWeight: '600' },
  calWrap:    { borderWidth: 1 },
  calHeader:  { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  calNav:     { width: 30, height: 30, borderRadius: 15, alignItems: 'center', justifyContent: 'center' },
  calMonth:   { fontWeight: '700' },
  calDayRow:  { flexDirection: 'row', marginBottom: 4 },
  calDayHd:   { flex: 1, textAlign: 'center', fontSize: 10, fontWeight: '600' },
  calGrid:    { flexDirection: 'row', flexWrap: 'wrap' },
  calCell:    { width: `${100/7}%`, aspectRatio: 1, alignItems: 'center', justifyContent: 'center' },
  calDayTxt:  { fontSize: 12 },
  btnRow:     { flexDirection: 'row', marginTop: 8 },
});

// ── Task Card ─────────────────────────────────────────────────────────────────

const TaskCard = ({ task, onComplete, onEdit, onDelete }) => {
  const { t } = useTranslation();
  const { C, scale } = useTheme();
  const { Typography, Spacing, Radius } = scaleTheme(scale);

  const overdue   = getDaysOverdue(task.start_date);
  const isOverdue = overdue > 0;
  const isNew     = overdue === 0;
  const accent    = isOverdue ? C.expense : isNew ? C.primary : 'transparent';

  return (
    <Card
      padding="none"
      elevation="sm"
      style={[tc.card, { marginBottom: Spacing.sm, borderLeftWidth: 3, borderLeftColor: accent }]}
    >
      <View style={[tc.top, { padding: Spacing.base, gap: Spacing.sm }]}>
        {/* Checkbox */}
        <TouchableOpacity
          style={[tc.check, { borderColor: C.primary }]}
          onPress={()=>onComplete(task.id)}
          activeOpacity={0.7}
        >
          <Ionicons name="ellipse-outline" size={16} color={C.primary} />
        </TouchableOpacity>

        {/* Content */}
        <View style={tc.body}>
          <Text style={[tc.taskTitle, { color: C.textPrimary, fontSize: Typography.sizes.base, marginBottom: Spacing.xs }]}>{task.title}</Text>
          <View style={[tc.meta, { gap: Spacing.xs }]}>
            <Chip icon="calendar-outline" color={C.textSecondary} label={`${t('common.from')} ${formatDate(task.start_date)}`} />
            {isOverdue && (
              <Chip
                icon="alert-circle"
                color={C.expense}
                label={overdue === 1 ? `1 ${t('tasks.dayOverdue')}` : `${overdue} ${t('tasks.daysOverdue')}`}
              />
            )}
            {isNew && (
              <Chip icon="sparkles" color={C.primary} label={t('tasks.newToday')} />
            )}
          </View>
        </View>

        {/* Actions */}
        <View style={[tc.actions, { gap: Spacing.xs }]}>
          <TouchableOpacity style={[tc.actionBtn, { backgroundColor: C.primaryDim, borderRadius: Radius.sm }]} onPress={()=>onEdit(task)}>
            <Ionicons name="pencil" size={15} color={C.primary} />
          </TouchableOpacity>
          <TouchableOpacity style={[tc.actionBtn, { backgroundColor: C.expenseLight, borderRadius: Radius.sm }]} onPress={()=>onDelete(task.id)}>
            <Ionicons name="trash-outline" size={15} color={C.expense} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Complete bar */}
      <TouchableOpacity
        style={[tc.completeBar, { backgroundColor: C.primaryDim, gap: Spacing.xs, paddingVertical: Spacing.sm }]}
        onPress={()=>onComplete(task.id)}
        activeOpacity={0.8}
      >
        <Ionicons name="checkmark-circle" size={15} color={C.primary} />
        <Text style={[tc.completeTxt, { color: C.primary, fontSize: Typography.sizes.xs }]}>{t('tasks.markComplete')}</Text>
      </TouchableOpacity>
    </Card>
  );
};

const tc = StyleSheet.create({
  card:        { overflow: 'hidden' },
  top:         { flexDirection: 'row', alignItems: 'flex-start' },
  check:       { width: 24, height: 24, borderRadius: 12, borderWidth: 2, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  body:        { flex: 1 },
  taskTitle:   { fontWeight: '600', lineHeight: 22 },
  meta:        { flexDirection: 'row', flexWrap: 'wrap' },
  actions:     { flexDirection: 'row' },
  actionBtn:   { width: 32, height: 32, alignItems: 'center', justifyContent: 'center' },
  completeBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  completeTxt: { fontWeight: '600', letterSpacing: 0.3 },
});

// ── Completed Task Row ────────────────────────────────────────────────────────

const CompletedRow = ({ task, onDelete, onRevert }) => {
  const { t } = useTranslation();
  const { C, scale } = useTheme();
  const { Typography, Spacing } = scaleTheme(scale);

  return (
    <View style={[cr.row, { borderBottomColor: C.divider, gap: Spacing.sm, paddingVertical: Spacing.sm }]}>
      <TouchableOpacity onPress={()=>onRevert(task.id)} style={cr.checkBtn}>
        <Ionicons name="checkmark-circle" size={20} color={C.income} />
      </TouchableOpacity>
      <View style={cr.info}>
        <Text style={[cr.title, { color: C.textSecondary, fontSize: Typography.sizes.sm }]}>{task.title}</Text>
        <Text style={[cr.date, { color: C.textMuted, fontSize: Typography.sizes.xs }]}>
          {t('tasks.completed')} {task.completed_date ? formatDate(task.completed_date) : ''}
        </Text>
      </View>
      <TouchableOpacity onPress={()=>onDelete(task.id)}>
        <Ionicons name="trash-outline" size={16} color={C.textMuted} />
      </TouchableOpacity>
    </View>
  );
};
const cr = StyleSheet.create({
  row:   { flexDirection: 'row', alignItems: 'center', borderBottomWidth: 1 },
  checkBtn: { padding: 4 },
  info:  { flex: 1 },
  title: { fontWeight: '500' },
  date:  { marginTop: 2 },
});

// ── Main Tasks Screen ─────────────────────────────────────────────────────────

export default function TasksScreen({ route }) {
  const { t } = useTranslation();
  const { C, scale } = useTheme();
  const { Typography, Spacing } = scaleTheme(scale);
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
      {text:t('tasks.complete'), onPress:()=>{ Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); completeTask(id); load(); }},
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
    <View style={[s.root, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={C.isDark ? 'light-content' : 'dark-content'} backgroundColor={C.bgCard} />
      <DayNavigator/>

      {/* Header */}
      <View style={[s.header, { backgroundColor: C.bgCard, borderBottomColor: C.border, paddingHorizontal: Spacing.base, paddingVertical: Spacing.md }]}>
        <View style={[s.headerLeft, { gap: Spacing.sm }]}>
          <Text style={[s.headerTitle, { color: C.textPrimary, fontSize: Typography.sizes.xl }]}>{t('tasks.title')}</Text>
          {overdueCount > 0 && (
            <Badge label={`${overdueCount} ${t('tasks.overdue')}`} color={C.expense} />
          )}
        </View>
        <Button
          size="sm"
          variant="primary"
          icon="add"
          label={t('tasks.newTask')}
          onPress={()=>{setEditTask(null);setShowModal(true);}}
        />
      </View>

      {/* Tab switcher */}
      <View style={[s.tabRow, { backgroundColor: C.bgCard, borderBottomColor: C.border }]}>
        {['pending','completed'].map(tb=>(
          <TouchableOpacity
            key={tb}
            style={[s.tabBtn, { paddingVertical: Spacing.sm, gap: 6 }, tab===tb && {borderBottomColor:C.primary,borderBottomWidth:2}]}
            onPress={()=>setTab(tb)}
          >
            <Ionicons
              name={tb==='pending' ? 'list-outline' : 'checkmark-done-outline'}
              size={15}
              color={tab===tb ? C.primary : C.textSecondary}
            />
            <Text style={[s.tabTxt, { color:tab===tb?C.primary:C.textSecondary, fontSize: Typography.sizes.sm }]}>
              {tb==='pending'
                ? `${t('tasks.pending')}${pending.length>0?' ('+pending.length+')':''}`
                : `${t('tasks.completed')}${completed.length>0?' ('+completed.length+')':''}`
              }
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={[s.content, { padding: Spacing.base, paddingBottom: 100 }]}
        showsVerticalScrollIndicator={false}
      >

        {tab==='pending' && (
          <>
            {pending.length === 0 ? (
              <View style={{ alignItems: 'center' }}>
                <EmptyState icon="flag-outline" title={t('tasks.noTasks')} subtitle={t('tasks.noTasksSub')} />
                <Button
                  label={t('tasks.addFirst')}
                  onPress={()=>{setEditTask(null);setShowModal(true);}}
                  style={{ marginTop: Spacing.sm }}
                />
              </View>
            ) : (
              pending.map(task => (
                <TaskCard
                  key={task.id} task={task}
                  onComplete={handleComplete}
                  onEdit={handleEdit}
                  onDelete={handleDelete}
                />
              ))
            )}
          </>
        )}

        {tab==='completed' && (
          <Card padding="base">
            {completed.length === 0 ? (
              <EmptyState icon="checkmark-done-circle-outline" subtitle={t('tasks.noCompleted')} />
            ) : (
              completed.map(tk=>(
                <CompletedRow key={tk.id} task={tk} onDelete={handleDelete} onRevert={handleRevert} />
              ))
            )}
          </Card>
        )}
      </ScrollView>

      <TaskModal
        visible={showModal}
        editTask={editTask}
        onSave={handleSave}
        onClose={()=>{setShowModal(false);setEditTask(null);}}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, maxWidth: Platform.OS === 'web' ? 1200 : '100%', width: '100%', alignSelf: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderBottomWidth: 1 },
  headerLeft:   { flexDirection: 'row', alignItems: 'center' },
  headerTitle:  { fontWeight: '700' },
  tabRow:       { flexDirection: 'row', borderBottomWidth: 1 },
  tabBtn:       { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  tabTxt:       { fontWeight: '600' },
  scroll:  { flex: 1 },
  content: {},
});
