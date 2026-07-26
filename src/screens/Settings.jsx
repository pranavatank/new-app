import React, { useState } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ScrollView, Switch, StatusBar, Alert, ActivityIndicator, Image, Linking, Platform,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { useNavigation } from '@react-navigation/native';
import { AntDesign, MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import { scaleTheme } from '../constants/theme';
import { useTheme } from '../store/ThemeContext';
import { SUPPORTED_LANGUAGES } from '../i18n';
import { exportToExcel, importFromExcel } from '../services/excelService';
import { exportToJSON, importFromJSON } from '../services/backupService';
import { exportToPDF } from '../services/pdfService';
import { getDB } from '../db/schema';
import { Card, Button, Sheet, Row, SectionHeader, ScreenHeader } from '../components/common';

// ── Main Settings Screen ──────────────────────────────────────────────────────

export default function SettingsScreen() {
  const { C, isDark, toggleTheme, language, changeLanguage, scale, changeScale, showMileage, toggleMileage } = useTheme();
  const { Typography, Spacing, Radius } = scaleTheme(scale);
  const { t } = useTranslation();
  const navigation = useNavigation();
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

  const Divider = () => <View style={{ height: 1, backgroundColor: C.divider }} />;

  return (
    <View style={[s.root, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={C.isDark ? 'light-content' : 'dark-content'} backgroundColor={C.bgCard} />

      <ScreenHeader title={t('nav.settings') || 'Settings'} subtitle="Preferences & App Info" />

      <ScrollView
        style={s.scroll}
        contentContainerStyle={{ padding: Spacing.base }}
        showsVerticalScrollIndicator={false}
      >

        {/* ── APPEARANCE ── */}
        <SectionHeader
          title={t('settings.appearance')}
          icon={isDark ? 'moon' : 'sunny'}
          color={isDark ? C.primarySoft : C.warning}
          style={{ marginTop: Spacing.md }}
        />
        <Card padding="none" style={{ paddingHorizontal: Spacing.base }}>
          <Row
            icon={isDark ? 'moon' : 'sunny'}
            iconColor={isDark ? C.primarySoft : C.warning}
            label={isDark ? t('settings.darkMode') : t('settings.lightMode')}
            subtitle={isDark ? t('settings.darkModeSub') : t('settings.lightModeSub')}
            onPress={toggleTheme}
            switchValue={isDark}
            onSwitchChange={toggleTheme}
          />
        </Card>

        {/* ── TEXT SIZE ── */}
        <SectionHeader title={t('settings.textSize')} icon="text-outline" color={C.iconSettings} style={{ marginTop: Spacing.xl }} />
        <Card style={{ marginTop: 0 }}>
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
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
                    st.segBtn,
                    {
                      borderColor: active ? C.primary : C.border,
                      backgroundColor: active ? C.primaryDim : 'transparent',
                      paddingVertical: Spacing.md,
                      borderRadius: Radius.lg,
                      gap: 4,
                    },
                  ]}
                  onPress={() => handleScaleChange(value)}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold, color: active ? C.primary : C.textPrimary }}>
                    {label}
                  </Text>
                  {active && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.primary }} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* ── LANGUAGE ── */}
        <SectionHeader title="Language / ભાષા" icon="language-outline" color={C.iconSettings} style={{ marginTop: Spacing.xl }} />
        <Card style={{ marginTop: 0 }}>
          <View style={{ flexDirection: 'row', gap: Spacing.sm }}>
            {Object.entries(SUPPORTED_LANGUAGES).map(([code, meta]) => {
              const active = language === code;
              return (
                <TouchableOpacity
                  key={code}
                  style={[
                    st.segBtn,
                    {
                      borderColor: active ? C.primary : C.border,
                      backgroundColor: active ? C.primaryDim : 'transparent',
                      paddingVertical: Spacing.sm,
                      borderRadius: Radius.lg,
                      gap: 4,
                    },
                  ]}
                  onPress={() => handleLanguageChange(code)}
                  activeOpacity={0.8}
                >
                  <Text style={{ fontSize: 24 }}>{meta.flag}</Text>
                  <Text style={{ fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold, color: active ? C.primary : C.textPrimary }}>
                    {meta.nativeLabel}
                  </Text>
                  {active && <View style={{ width: 6, height: 6, borderRadius: 3, backgroundColor: C.primary }} />}
                </TouchableOpacity>
              );
            })}
          </View>
        </Card>

        {/* ── DATA ── */}
        <SectionHeader title={t('settings.data')} icon="server-outline" color={C.iconSettings} style={{ marginTop: Spacing.xl }} />
        <Card padding="none" style={{ paddingHorizontal: Spacing.base }}>
          <Row
            icon="cloud-upload-outline"
            iconColor={C.income}
            label={t('settings.export')}
            subtitle={t('settings.exportSub')}
            onPress={() => setShowExportModal(true)}
            right={loading ? <ActivityIndicator color={C.primary} /> : undefined}
          />
          <Divider />
          <Row
            icon="cloud-download-outline"
            iconColor={C.online}
            label={t('settings.import')}
            subtitle={t('settings.importSub')}
            onPress={() => setShowImportModal(true)}
            right={loading ? <ActivityIndicator color={C.primary} /> : undefined}
          />
          <Divider />
          <Row
            icon="trash-outline"
            danger
            label={t('settings.clearData')}
            subtitle={t('settings.clearDataSub')}
            onPress={handleClearAllData}
            right={loading ? <ActivityIndicator color={C.primary} /> : undefined}
          />
        </Card>

        {/* ── SECURITY ── */}
        <SectionHeader title={t('settings.security')} icon="shield-checkmark-outline" color={C.iconSettings} style={{ marginTop: Spacing.xl }} />
        <Card padding="none" style={{ paddingHorizontal: Spacing.base }}>
          <Row
            icon="lock-closed"
            iconColor={C.online}
            label={t('settings.biometric')}
            subtitle={t('settings.biometricSub')}
            right={
              <Switch
                value={true}
                trackColor={{ false: C.bgElevated, true: C.primary }}
                thumbColor={C.primarySoft}
                disabled
              />
            }
          />
        </Card>

        {/* ── FEATURES ── */}
        <SectionHeader title="Features" icon="options-outline" color={C.iconSettings} style={{ marginTop: Spacing.xl }} />
        <Card padding="none" style={{ paddingHorizontal: Spacing.base }}>
          <Row
            icon="repeat-outline"
            iconColor={C.primary}
            label={t('recurring.title')}
            subtitle={t('recurring.settingsSub')}
            onPress={() => navigation.navigate('Recurring')}
          />
          <Divider />
          <Row
            mciIcon="motorbike"
            iconColor={C.iconExpense}
            label="Bike Mileage Tracking"
            subtitle="Show bike mileage card on home screen"
            onPress={toggleMileage}
            switchValue={showMileage}
            onSwitchChange={toggleMileage}
          />
        </Card>

        {/* ── ABOUT ── */}
        <SectionHeader title={t('settings.about')} icon="information-circle-outline" color={C.iconSettings} style={{ marginTop: Spacing.xl }} />
        <Card padding="none" style={{ paddingHorizontal: Spacing.base }}>
          <Row
            icon="document-text-outline"
            iconColor={C.primary}
            label={t('settings.appName')}
            subtitle={t('settings.version')}
            onPress={() => setShowAboutModal(true)}
          />
          <Divider />
          <Row
            icon="person-circle-outline"
            iconColor={C.online}
            label="Developer"
            subtitle="Pranav Tank"
            onPress={() => setShowDeveloperModal(true)}
          />
        </Card>

        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Export Sheet */}
      <Sheet visible={showExportModal} onClose={() => setShowExportModal(false)} title={t('settings.exportOptions')}>
        <Row
          icon="save-outline"
          iconColor={C.primary}
          label="JSON"
          subtitle={t('settings.jsonBackupSub')}
          onPress={() => handleExport('json')}
          chevron={false}
        />
        <Divider />
        <Row
          mciIcon="file-excel"
          iconColor={C.income}
          label="Excel"
          subtitle={t('settings.excelSub')}
          onPress={() => handleExport('excel')}
          chevron={false}
        />
        <Divider />
        <Row
          icon="document-text-outline"
          iconColor={C.expense}
          label="PDF"
          subtitle={t('settings.exportPDFSub')}
          onPress={() => handleExport('pdf')}
          chevron={false}
        />
        <Button
          variant="ghost"
          label={t('common.cancel')}
          onPress={() => setShowExportModal(false)}
          fullWidth
          style={{ marginTop: Spacing.base }}
        />
      </Sheet>

      {/* Import Sheet */}
      <Sheet visible={showImportModal} onClose={() => setShowImportModal(false)} title={t('settings.importOptions')}>
        <Row
          icon="save-outline"
          iconColor={C.primary}
          label="JSON"
          subtitle={t('settings.importJSONSub')}
          onPress={() => handleImport('json')}
          chevron={false}
        />
        <Divider />
        <Row
          mciIcon="file-excel"
          iconColor={C.income}
          label="Excel"
          subtitle={t('settings.excelImportSub')}
          onPress={() => handleImport('excel')}
          chevron={false}
        />
        <Button
          variant="ghost"
          label={t('common.cancel')}
          onPress={() => setShowImportModal(false)}
          fullWidth
          style={{ marginTop: Spacing.base }}
        />
      </Sheet>

      {/* Developer Sheet */}
      <Sheet visible={showDeveloperModal} onClose={() => setShowDeveloperModal(false)} title="Developer">
        <View style={{ alignItems: 'center', gap: Spacing.sm }}>
          <Image source={require('../../assets/developer.jpg')} style={{ width: 100, height: 100, borderRadius: 50, marginBottom: Spacing.sm }} />
          <Text style={{ fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold, color: C.textPrimary }}>Pranav Tank</Text>
          <Text style={{ fontSize: Typography.sizes.sm, color: C.textSecondary, marginBottom: Spacing.base }}>Developer</Text>

          <View style={{ flexDirection: 'row', gap: Spacing.sm, marginVertical: Spacing.base }}>
            <TouchableOpacity style={st.linkBtn} onPress={() => Linking.openURL('https://www.linkedin.com/in/pranav-tank-1763b6242')}>
              <AntDesign name="linkedin-square" size={20} color="#0A66C2" />
              <Text style={{ fontSize: Typography.sizes.xs, fontWeight: Typography.weights.semibold, color: C.textPrimary }}>LinkedIn</Text>
            </TouchableOpacity>
            <TouchableOpacity style={st.linkBtn} onPress={() => Linking.openURL('https://github.com/Pranav-Tank')}>
              <AntDesign name="github" size={20} color={C.textPrimary} />
              <Text style={{ fontSize: Typography.sizes.xs, fontWeight: Typography.weights.semibold, color: C.textPrimary }}>GitHub</Text>
            </TouchableOpacity>
            <TouchableOpacity style={st.linkBtn} onPress={() => Linking.openURL('mailto:pranavatank@gmail.com')}>
              <MaterialCommunityIcons name="gmail" size={20} color="#EA4335" />
              <Text style={{ fontSize: Typography.sizes.xs, fontWeight: Typography.weights.semibold, color: C.textPrimary }}>Mail</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: Spacing.sm }}>
            <Ionicons name="heart" size={16} color={C.expense} />
            <Text style={{ fontSize: Typography.sizes.sm, color: C.textMuted, textAlign: 'center' }}>Thank you for using this app!</Text>
          </View>

          <Button
            variant="primary"
            label="Close"
            onPress={() => setShowDeveloperModal(false)}
            style={{ marginTop: Spacing.base }}
          />
        </View>
      </Sheet>

      {/* About Sheet */}
      <Sheet visible={showAboutModal} onClose={() => setShowAboutModal(false)}>
        <View style={{ alignItems: 'center', paddingVertical: Spacing.md }}>
          <Ionicons name="document-text" size={48} color={C.primary} style={{ marginBottom: Spacing.sm }} />
          <Text style={{ fontSize: Typography.sizes.xxl, fontWeight: Typography.weights.black, color: C.textPrimary }}>Hisab</Text>
          <Text style={{ fontSize: Typography.sizes.base, color: C.textSecondary, marginBottom: Spacing.xs }}>Family Cash Ledger</Text>
          <Text style={{ fontSize: Typography.sizes.xs, color: C.textMuted, marginBottom: Spacing.lg }}>Version 1.0.0</Text>

          <Text style={{ fontSize: Typography.sizes.sm, color: C.textSecondary, textAlign: 'center', lineHeight: 20, marginBottom: Spacing.lg }}>
            A simple and elegant app to manage your daily expenses, tasks, and family activities. Track your cash flow, set reminders, and keep notes all in one place.
          </Text>

          <Button
            variant="primary"
            label="Close"
            onPress={() => setShowAboutModal(false)}
          />
        </View>
      </Sheet>
    </View>
  );
}

const s = StyleSheet.create({
  root:   { flex: 1, maxWidth: Platform.OS === 'web' ? 1200 : '100%', width: '100%', alignSelf: 'center' },
  scroll: { flex: 1 },
});

const st = StyleSheet.create({
  segBtn:  { flex: 1, alignItems: 'center', borderWidth: 1.5 },
  linkBtn: { flexDirection: 'row', alignItems: 'center', padding: 4, gap: 6 },
});
