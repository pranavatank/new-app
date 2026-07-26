import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Switch, StatusBar, Alert, ActivityIndicator, Modal, Image, Linking, Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { AntDesign, MaterialCommunityIcons } from '@expo/vector-icons';
import { scaleTheme, Typography, Spacing, Radius, makeShadow } from '../constants/theme';
import { useTheme } from '../store/ThemeContext';
import { SUPPORTED_LANGUAGES } from '../i18n';
import { exportToExcel, importFromExcel } from '../services/excelService';
import { exportToJSON, importFromJSON } from '../services/backupService';
import { exportToPDF } from '../services/pdfService';
import { getDB } from '../db/schema';

// ── Reusable Row ──────────────────────────────────────────────────────────────

const Row = ({ icon, iconBg, label, sub, right, onPress, C, isFirst, isLast }) => (
  <TouchableOpacity
    style={[
      sr.row,
      { backgroundColor: C.bgCard, borderColor: C.border },
      isFirst && sr.firstRow,
      isLast  && sr.lastRow,
      !isLast && { borderBottomWidth: 1, borderBottomColor: C.divider },
    ]}
    onPress={onPress}
    activeOpacity={onPress ? 0.72 : 1}
  >
    <View style={[sr.iconBox, { backgroundColor: iconBg || C.primaryDim }]}>
      <Text style={{ fontSize: 18 }}>{icon}</Text>
    </View>
    <View style={sr.body}>
      <Text style={[sr.label, { color: C.textPrimary }]}>{label}</Text>
      {sub ? <Text style={[sr.sub, { color: C.textMuted }]}>{sub}</Text> : null}
    </View>
    {right}
  </TouchableOpacity>
);
const sr = StyleSheet.create({
  row:      { flexDirection: 'row', alignItems: 'center', padding: Spacing.base, gap: Spacing.md, borderLeftWidth: 1, borderRightWidth: 1 },
  firstRow: { borderTopLeftRadius: Radius.xl, borderTopRightRadius: Radius.xl, borderTopWidth: 1 },
  lastRow:  { borderBottomLeftRadius: Radius.xl, borderBottomRightRadius: Radius.xl, borderBottomWidth: 1 },
  iconBox:  { width: 40, height: 40, borderRadius: Radius.md, alignItems: 'center', justifyContent: 'center' },
  body:     { flex: 1 },
  label:    { fontSize: Typography.sizes.base, fontWeight: Typography.weights.semibold },
  sub:      { fontSize: Typography.sizes.xs, marginTop: 2 },
});

const SectionLabel = ({ text, C }) => (
  <Text style={[sl.t, { color: C.textSecondary }]}>{text.toUpperCase()}</Text>
);
const sl = StyleSheet.create({
  t: { fontSize: 11, fontWeight: Typography.weights.bold, letterSpacing: 1.5, marginBottom: Spacing.xs, marginLeft: 4, marginTop: Spacing.xl },
});

const Chevron = ({ C }) => (
  <Text style={{ color: C.textMuted, fontSize: 20 }}>›</Text>
);

// ── Language Picker ───────────────────────────────────────────────────────────

const LanguagePicker = ({ current, onChange, C, Shadow }) => (
  <View style={[lp.wrap, { backgroundColor: C.bgCard, borderColor: C.border }, Shadow.sm]}>
    <Text style={[lp.title, { color: C.textSecondary }]}>App Language</Text>
    <View style={lp.row}>
      {Object.entries(SUPPORTED_LANGUAGES).map(([code, meta]) => {
        const active = current === code;
        return (
          <TouchableOpacity
            key={code}
            style={[
              lp.btn,
              { borderColor: active ? C.primary : C.border },
              active && { backgroundColor: C.primaryDim },
            ]}
            onPress={() => onChange(code)}
            activeOpacity={0.8}
          >
            <Text style={lp.flag}>{meta.flag}</Text>
            <Text style={[lp.lang, { color: active ? C.primary : C.textPrimary }]}>
              {meta.nativeLabel}
            </Text>
            <Text style={[lp.sub, { color: active ? C.primary : C.textMuted }]}>
              {meta.label}
            </Text>
            {active && (
              <View style={[lp.check, { backgroundColor: C.primary }]}>
                <Text style={lp.checkTxt}>✓</Text>
              </View>
            )}
          </TouchableOpacity>
        );
      })}
    </View>
  </View>
);
const lp = StyleSheet.create({
  wrap:     { borderRadius: Radius.xl, padding: Spacing.base, borderWidth: 1, marginTop: Spacing.xs },
  title:    { fontSize: 11, fontWeight: Typography.weights.bold, letterSpacing: 1.5, marginBottom: Spacing.md },
  row:      { flexDirection: 'row', gap: Spacing.sm },
  btn:      { flex: 1, alignItems: 'center', padding: Spacing.md, borderRadius: Radius.lg, borderWidth: 1.5, gap: Spacing.xs },
  flag:     { fontSize: 28 },
  lang:     { fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold },
  sub:      { fontSize: Typography.sizes.xs },
  check:    { width: 22, height: 22, borderRadius: 11, alignItems: 'center', justifyContent: 'center', marginTop: 2 },
  checkTxt: { color: '#fff', fontSize: 12, fontWeight: '700' },
});

// ── Color Swatches Preview ────────────────────────────────────────────────────

const ThemePreview = ({ C, isDark, t }) => (
  <View style={[tp.wrap, { backgroundColor: C.bgCard, borderColor: C.border }]}>
    <Text style={[tp.label, { color: C.textSecondary }]}>
      {isDark ? `🌙  ${t('settings.darkMode')} — ${t('settings.darkModeSub')}` : `☀️  ${t('settings.lightMode')} — ${t('settings.lightModeSub')}`}
    </Text>
    <View style={tp.row}>
      {[C.primary, C.income, C.expense, C.online, C.bgElevated, C.border].map((col, i) => (
        <View key={i} style={[tp.dot, { backgroundColor: col, borderColor: C.border }]} />
      ))}
    </View>
  </View>
);
const tp = StyleSheet.create({
  wrap:  { borderRadius: Radius.xl, padding: Spacing.md, borderWidth: 1, marginTop: Spacing.xs, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: Typography.sizes.xs, fontWeight: Typography.weights.semibold },
  row:   { flexDirection: 'row', gap: Spacing.xs },
  dot:   { width: 24, height: 24, borderRadius: 12, borderWidth: 1 },
});

// ── Main Settings Screen ──────────────────────────────────────────────────────

export default function SettingsScreen() {
  const { C, isDark, toggleTheme, language, changeLanguage, scale, changeScale, showMileage, toggleMileage } = useTheme();
  const Shadow = makeShadow(C);
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showDeveloperModal, setShowDeveloperModal] = useState(false);
  const [showAboutModal, setShowAboutModal] = useState(false);

  const handleExport = async (type) => {
    setShowExportModal(false);
    try {
      setLoading(true);
      let fileName;
      if (type === 'json') {
        fileName = await exportToJSON();
        Alert.alert('✅ Success', `JSON backup exported: ${fileName}`);
      } else if (type === 'excel') {
        fileName = await exportToExcel();
        Alert.alert('✅ Success', `Excel exported: ${fileName}`);
      } else if (type === 'pdf') {
        const now = new Date();
        fileName = await exportToPDF(now.getFullYear(), now.getMonth() + 1);
        Alert.alert('✅ Success', `PDF analytics exported: ${fileName}`);
      }
    } catch (error) {
      Alert.alert('❌ Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleImport = async (type) => {
    setShowImportModal(false);
    Alert.alert(
      '⚠️ Import Data',
      'Existing data will be preserved. Duplicates will be skipped.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          onPress: async () => {
            try {
              setLoading(true);
              const result = type === 'json' ? await importFromJSON() : await importFromExcel();
              if (result) {
                Alert.alert(
                  '✅ Import Complete',
                  `Imported:\n• ${result.days} days\n• ${result.expenses} expenses\n• ${result.tasks} tasks\n• ${result.notes} notes\n• ${result.places} places\n• ${result.categories || 0} categories`
                );
              }
            } catch (error) {
              Alert.alert('❌ Error', error.message);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleClearAllData = () => {
    Alert.alert(
      '⚠️ Clear All Data',
      'This will backup your data first, then delete everything. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear All',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const fileName = await exportToJSON();
              const db = getDB();
              db.execSync('DELETE FROM expenses;');
              db.execSync('DELETE FROM notes;');
              db.execSync('DELETE FROM day_places;');
              db.execSync('DELETE FROM tasks;');
              db.execSync('DELETE FROM days;');
              Alert.alert('✅ Complete', `Backup saved: ${fileName}\n\nAll data cleared.`);
            } catch (error) {
              Alert.alert('❌ Error', error.message);
            } finally {
              setLoading(false);
            }
          },
        },
      ]
    );
  };

  const handleLanguageChange = (code) => {
    if (code === language) return;
    changeLanguage(code);
    Alert.alert(
      code === 'gu' ? 'ભાષા બદલી' : 'Language Changed',
      code === 'gu'
        ? 'ભાષા ગુજરાતીમાં બદલી ગઈ છે.'
        : 'Language changed to English.',
      [{ text: 'OK' }]
    );
  };

  const handleScaleChange = (newScale) => {
    if (newScale === scale) return;
    changeScale(newScale);
  };

  return (
    <View style={[s.root, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={C.isDark ? 'light-content' : 'dark-content'} backgroundColor={C.bgCard} />

      {/* Header */}
      <View style={[s.header, { backgroundColor: C.bgCard, borderBottomColor: C.border }]}>
        <Text style={[s.title, { color: C.textPrimary }]}>
          {t('nav.settings') || 'Settings'}
        </Text>
        <Text style={[s.sub, { color: C.textSecondary }]}>Preferences &amp; App Info</Text>
      </View>

      <ScrollView
        style={s.scroll}
        contentContainerStyle={s.content}
        showsVerticalScrollIndicator={false}
      >

        {/* ── APPEARANCE ── */}
        <SectionLabel text={t('settings.appearance')} C={C} />
        <View style={Shadow.sm}>
          <Row
            icon={isDark ? '🌙' : '☀️'}
            iconBg={isDark ? '#1E213A' : '#FFF7ED'}
            label={isDark ? t('settings.darkMode') : t('settings.lightMode')}
            sub={isDark ? t('settings.darkModeSub') : t('settings.lightModeSub')}
            isFirst isLast
            onPress={toggleTheme}
            C={C}
            right={
              <Switch
                value={isDark}
                onValueChange={toggleTheme}
                trackColor={{ false: C.bgElevated, true: C.primary }}
                thumbColor={isDark ? C.primarySoft : '#ffffff'}
              />
            }
          />
        </View>

        {/* ── TEXT SIZE ── */}
        <SectionLabel text={t('settings.textSize')} C={C} />
        <View style={[ts.wrap, { backgroundColor: C.bgCard, borderColor: C.border }, Shadow.sm]}>
          <View style={ts.row}>
            {[
              { value: 0.9, label: 'S' },
              { value: 1.0, label: 'M' },
              { value: 1.1, label: 'L' },
            ].map(({ value, label }) => {
              const active = scale === value;
              return (
                <TouchableOpacity
                  key={value}
                  style={[
                    ts.btn,
                    { borderColor: active ? C.primary : C.border, backgroundColor: active ? C.primaryDim : 'transparent' },
                  ]}
                  onPress={() => handleScaleChange(value)}
                  activeOpacity={0.8}
                >
                  <Text style={[ts.label, { color: active ? C.primary : C.textPrimary }]}>{label}</Text>
                  {active && <View style={[ts.dot, { backgroundColor: C.primary }]} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── LANGUAGE ── */}
        <SectionLabel text="Language / ભાષા" C={C} />
        <View style={[ts.wrap, { backgroundColor: C.bgCard, borderColor: C.border }, Shadow.sm]}>
          <View style={ts.row}>
            {Object.entries(SUPPORTED_LANGUAGES).map(([code, meta]) => {
              const active = language === code;
              return (
                <TouchableOpacity
                  key={code}
                  style={[
                    ts.langBtn,
                    { borderColor: active ? C.primary : C.border, backgroundColor: active ? C.primaryDim : 'transparent' },
                  ]}
                  onPress={() => handleLanguageChange(code)}
                  activeOpacity={0.8}
                >
                  <Text style={ts.flag}>{meta.flag}</Text>
                  <Text style={[ts.langLabel, { color: active ? C.primary : C.textPrimary }]}>{meta.nativeLabel}</Text>
                  {active && <View style={[ts.dot, { backgroundColor: C.primary }]} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* ── DATA ── */}
        <SectionLabel text={t('settings.data')} C={C} />
        <View style={Shadow.sm}>
          <Row
            icon="📤" iconBg="#ECFDF5"
            label={t('settings.export')}
            sub={t('settings.exportSub')}
            isFirst C={C}
            onPress={() => setShowExportModal(true)}
            right={loading ? <ActivityIndicator color={C.primary} /> : <Chevron C={C} />}
          />
          <Row
            icon="📥" iconBg="#EFF6FF"
            label={t('settings.import')}
            sub={t('settings.importSub')}
            C={C}
            onPress={() => setShowImportModal(true)}
            right={loading ? <ActivityIndicator color={C.primary} /> : <Chevron C={C} />}
          />
          <Row
            icon="🗑️" iconBg="#FEE2E2"
            label={t('settings.clearData')}
            sub={t('settings.clearDataSub')}
            isLast C={C}
            onPress={handleClearAllData}
            right={loading ? <ActivityIndicator color={C.primary} /> : <Chevron C={C} />}
          />
        </View>

        {/* Export Modal */}
        <Modal visible={showExportModal} transparent animationType="fade">
          <TouchableOpacity style={ms.overlay} activeOpacity={1} onPress={() => setShowExportModal(false)}>
            <View style={[ms.modal, { backgroundColor: C.bgCard }]}>
              <Text style={[ms.modalTitle, { color: C.textPrimary }]}>{t('settings.exportOptions')}</Text>
              <TouchableOpacity style={[ms.option, { borderColor: C.border }]} onPress={() => handleExport('json')}>
                <Text style={ms.optionIcon}>💾</Text>
                <View style={ms.optionText}>
                  <Text style={[ms.optionLabel, { color: C.textPrimary }]}>JSON</Text>
                  <Text style={[ms.optionSub, { color: C.textMuted }]}>{t('settings.jsonBackupSub')}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={[ms.option, { borderColor: C.border }]} onPress={() => handleExport('excel')}>
                <Text style={ms.optionIcon}>📊</Text>
                <View style={ms.optionText}>
                  <Text style={[ms.optionLabel, { color: C.textPrimary }]}>Excel</Text>
                  <Text style={[ms.optionSub, { color: C.textMuted }]}>{t('settings.excelSub')}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={[ms.option, { borderColor: C.border }]} onPress={() => handleExport('pdf')}>
                <Text style={ms.optionIcon}>📄</Text>
                <View style={ms.optionText}>
                  <Text style={[ms.optionLabel, { color: C.textPrimary }]}>PDF</Text>
                  <Text style={[ms.optionSub, { color: C.textMuted }]}>{t('settings.exportPDFSub')}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={[ms.cancelBtn, { backgroundColor: C.bgElevated }]} onPress={() => setShowExportModal(false)}>
                <Text style={[ms.cancelText, { color: C.textSecondary }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* Import Modal */}
        <Modal visible={showImportModal} transparent animationType="fade">
          <TouchableOpacity style={ms.overlay} activeOpacity={1} onPress={() => setShowImportModal(false)}>
            <View style={[ms.modal, { backgroundColor: C.bgCard }]}>
              <Text style={[ms.modalTitle, { color: C.textPrimary }]}>{t('settings.importOptions')}</Text>
              <TouchableOpacity style={[ms.option, { borderColor: C.border }]} onPress={() => handleImport('json')}>
                <Text style={ms.optionIcon}>💾</Text>
                <View style={ms.optionText}>
                  <Text style={[ms.optionLabel, { color: C.textPrimary }]}>JSON</Text>
                  <Text style={[ms.optionSub, { color: C.textMuted }]}>{t('settings.importJSONSub')}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={[ms.option, { borderColor: C.border }]} onPress={() => handleImport('excel')}>
                <Text style={ms.optionIcon}>📊</Text>
                <View style={ms.optionText}>
                  <Text style={[ms.optionLabel, { color: C.textPrimary }]}>Excel</Text>
                  <Text style={[ms.optionSub, { color: C.textMuted }]}>{t('settings.excelImportSub')}</Text>
                </View>
              </TouchableOpacity>
              <TouchableOpacity style={[ms.cancelBtn, { backgroundColor: C.bgElevated }]} onPress={() => setShowImportModal(false)}>
                <Text style={[ms.cancelText, { color: C.textSecondary }]}>{t('common.cancel')}</Text>
              </TouchableOpacity>
            </View>
          </TouchableOpacity>
        </Modal>

        {/* ── SECURITY ── */}
        <SectionLabel text={t('settings.security')} C={C} />
        <View style={Shadow.sm}>
          <Row
            icon="🔒" iconBg="#F5F3FF"
            label={t('settings.biometric')}
            sub={t('settings.biometricSub')}
            isFirst isLast C={C}
            right={
              <Switch
                value={true}
                trackColor={{ false: C.bgElevated, true: C.primary }}
                thumbColor={C.primarySoft}
                disabled
              />
            }
          />
        </View>

        {/* ── FEATURES ── */}
        <SectionLabel text="Features" C={C} />
        <View style={Shadow.sm}>
          <Row
            icon="🏍️" iconBg="#FFF7ED"
            label="Bike Mileage Tracking"
            sub="Show bike mileage card on home screen"
            isFirst isLast C={C}
            onPress={toggleMileage}
            right={
              <Switch
                value={showMileage}
                onValueChange={toggleMileage}
                trackColor={{ false: C.bgElevated, true: C.primary }}
                thumbColor={showMileage ? C.primarySoft : '#ffffff'}
              />
            }
          />
        </View>

        {/* ── ABOUT ── */}
        <SectionLabel text={t('settings.about')} C={C} />
        <View style={Shadow.sm}>
          <Row
            icon="📝" iconBg="#FFF7ED"
            label={t('settings.appName')}
            sub={t('settings.version')}
            isFirst C={C}
            onPress={() => setShowAboutModal(true)}
            right={<Chevron C={C} />}
          />
          <Row
            icon="👨💻" iconBg="#EFF6FF"
            label="Developer"
            sub="Pranav Tank"
            isLast C={C}
            onPress={() => setShowDeveloperModal(true)}
            right={<Chevron C={C} />}
          />
        </View>

        <View style={{ height: 52 }} />
      </ScrollView>

      {/* Developer Modal */}
      <Modal visible={showDeveloperModal} transparent animationType="fade">
        <TouchableOpacity style={ms.overlay} activeOpacity={1} onPress={() => setShowDeveloperModal(false)}>
          <View style={[ms.devModal, { backgroundColor: C.bgCard }]}>
            <Image source={require('../../assets/developer.jpg')} style={ms.devPhoto} />
            <Text style={[ms.devName, { color: C.textPrimary }]}>Pranav Tank</Text>
            <Text style={[ms.devRole, { color: C.textSecondary }]}>Developer</Text>
            
            <View style={ms.devLinks}>
              <TouchableOpacity style={ms.linkBtn} onPress={() => Linking.openURL('https://www.linkedin.com/in/pranav-tank-1763b6242')}>
                <AntDesign name="linkedin-square" size={20} color="#0A66C2" />
                <Text style={[ms.linkText, { color: C.textPrimary }]}>LinkedIn</Text>
              </TouchableOpacity>
              <TouchableOpacity style={ms.linkBtn} onPress={() => Linking.openURL('https://github.com/Pranav-Tank')}>
                <AntDesign name="github" size={20} color="#181717" />
                <Text style={[ms.linkText, { color: C.textPrimary }]}>GitHub</Text>
              </TouchableOpacity>
              <TouchableOpacity style={ms.linkBtn} onPress={() => Linking.openURL('mailto:pranavatank@gmail.com')}>
                <MaterialCommunityIcons name="gmail" size={20} color="#EA4335" />
                <Text style={[ms.linkText, { color: C.textPrimary }]}>Mail</Text>
              </TouchableOpacity>
            </View>
            
            <View style={ms.thanksContainer}>
              <Text style={ms.heartIcon}>❤️</Text>
              <Text style={[ms.thanks, { color: C.textMuted }]}>Thank you for using this app!</Text>
            </View>
            
            <TouchableOpacity style={[ms.closeBtn, { backgroundColor: C.primary }]} onPress={() => setShowDeveloperModal(false)}>
              <Text style={ms.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>

      {/* About Modal */}
      <Modal visible={showAboutModal} transparent animationType="fade">
        <TouchableOpacity style={ms.overlay} activeOpacity={1} onPress={() => setShowAboutModal(false)}>
          <View style={[ms.aboutModal, { backgroundColor: C.bgCard }]}>
            <Text style={ms.aboutIcon}>📝</Text>
            <Text style={[ms.aboutTitle, { color: C.textPrimary }]}>Hisab</Text>
            <Text style={[ms.aboutSub, { color: C.textSecondary }]}>Family Cash Ledger</Text>
            <Text style={[ms.aboutVersion, { color: C.textMuted }]}>Version 1.0.0</Text>
            
            <Text style={[ms.aboutDesc, { color: C.textSecondary }]}>
              A simple and elegant app to manage your daily expenses, tasks, and family activities. Track your cash flow, set reminders, and keep notes all in one place.
            </Text>
            
            <TouchableOpacity style={[ms.closeBtn, { backgroundColor: C.primary }]} onPress={() => setShowAboutModal(false)}>
              <Text style={ms.closeBtnText}>Close</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, maxWidth: Platform.OS === 'web' ? 1200 : '100%', width: '100%', alignSelf: 'center' },
  header: { paddingHorizontal: Spacing.lg, paddingTop: Spacing.xl, paddingBottom: Spacing.base, borderBottomWidth: 1 },
  title:  { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.black },
  sub:    { fontSize: Typography.sizes.sm, marginTop: 3 },
  scroll: { flex: 1 },
  content:{ padding: Spacing.base },
});

const ts = StyleSheet.create({
  wrap: { borderRadius: Radius.xl, padding: Spacing.base, borderWidth: 1, marginTop: Spacing.xs },
  row: { flexDirection: 'row', gap: Spacing.sm },
  btn: { flex: 1, alignItems: 'center', paddingVertical: Spacing.md, borderRadius: Radius.lg, borderWidth: 1.5, gap: 4 },
  label: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold },
  dot: { width: 6, height: 6, borderRadius: 3 },
  langBtn: { flex: 1, alignItems: 'center', paddingVertical: Spacing.sm, borderRadius: Radius.lg, borderWidth: 1.5, gap: 4 },
  flag: { fontSize: 24 },
  langLabel: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold },
});

const ms = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  modal: { width: '85%', borderRadius: Radius.xl, padding: Spacing.lg, gap: Spacing.sm },
  modalTitle: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, marginBottom: Spacing.sm },
  option: { flexDirection: 'row', alignItems: 'center', padding: Spacing.base, borderRadius: Radius.lg, borderWidth: 1, gap: Spacing.md },
  optionIcon: { fontSize: 28 },
  optionText: { flex: 1 },
  optionLabel: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.semibold },
  optionSub: { fontSize: Typography.sizes.xs, marginTop: 2 },
  cancelBtn: { padding: Spacing.base, borderRadius: Radius.lg, alignItems: 'center', marginTop: Spacing.xs },
  cancelText: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.semibold },
  devModal: { width: '80%', borderRadius: Radius.xl, padding: Spacing.lg, alignItems: 'center', gap: Spacing.sm },
  devPhoto: { width: 100, height: 100, borderRadius: 50, marginBottom: Spacing.sm },
  devName: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold },
  devRole: { fontSize: Typography.sizes.sm, marginBottom: Spacing.base },
  devLinks: { flexDirection: 'row', gap: Spacing.sm, marginVertical: Spacing.base },
  linkBtn: { flexDirection: 'row', alignItems: 'center', padding: Spacing.xs, gap: 6 },
  linkText: { fontSize: Typography.sizes.xs, fontWeight: Typography.weights.semibold },
  thanksContainer: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.sm },
  heartIcon: { fontSize: 18 },
  thanks: { fontSize: Typography.sizes.sm, textAlign: 'center' },
  closeBtn: { paddingHorizontal: Spacing.xl, paddingVertical: Spacing.sm, borderRadius: Radius.full, marginTop: Spacing.base },
  closeBtnText: { color: '#fff', fontSize: Typography.sizes.base, fontWeight: Typography.weights.semibold },
  aboutModal: { width: '85%', borderRadius: Radius.xl, padding: Spacing.xl, alignItems: 'center' },
  aboutIcon: { fontSize: 48, marginBottom: Spacing.sm },
  aboutTitle: { fontSize: Typography.sizes.xxl, fontWeight: Typography.weights.black },
  aboutSub: { fontSize: Typography.sizes.base, marginBottom: Spacing.xs },
  aboutVersion: { fontSize: Typography.sizes.xs, marginBottom: Spacing.lg },
  aboutDesc: { fontSize: Typography.sizes.sm, textAlign: 'center', lineHeight: 20, marginBottom: Spacing.lg },
});

