import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Modal, Pressable, Alert, StatusBar, Image,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { scaleTheme, makeShadow, Typography, Spacing, Radius } from '../constants/theme';
import { useTheme } from '../store/ThemeContext';
import {
  getAllCategoryItems,
  addCategoryItem,
  updateCategoryItem,
  deleteCategoryItem,
  getAllCategories,
} from '../db/queries';

const Sheet = ({ visible, onClose, children, C, Shadow }) => (
  <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
    <Pressable style={[s.overlay, { backgroundColor: C.overlay }]} onPress={onClose}>
      <Pressable style={[s.sheet, { backgroundColor: C.bgCard }, Shadow.md]} onPress={() => {}}>
        <View style={[s.handle, { backgroundColor: C.border }]} />
        {children}
      </Pressable>
    </Pressable>
  </Modal>
);

const ItemCard = ({ item, onEdit, onDelete, C, Shadow, t }) => (
  <View style={[s.itemCard, { backgroundColor: C.bgCard, borderColor: C.border }, Shadow.sm]}>
    {item.icon_type === 'image' ? (
      <Image source={{ uri: item.icon }} style={s.itemImage} />
    ) : (
      <Text style={{ fontSize: 28, marginRight: Spacing.sm }}>{item.icon}</Text>
    )}
    <View style={{ flex: 1 }}>
      <Text style={[s.itemName, { color: C.textPrimary }]}>{item.name}</Text>
    </View>
    <View style={s.itemActions}>
      <TouchableOpacity
        style={[s.actionBtn, { backgroundColor: C.primaryDim }]}
        onPress={() => onEdit(item)}
      >
        <Text style={{ fontSize: 16 }}>✏️</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[s.actionBtn, { backgroundColor: C.expenseLight }]}
        onPress={() => onDelete(item)}
      >
        <Text style={{ fontSize: 16 }}>🗑️</Text>
      </TouchableOpacity>
    </View>
  </View>
);

const ItemFormSheet = ({ visible, item, categoryId, onSave, onClose, C, Shadow, t }) => {
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('📦');
  const [iconType, setIconType] = useState('emoji');

  useEffect(() => {
    if (visible) {
      setName(item?.name || '');
      setIcon(item?.icon || '📦');
      setIconType(item?.icon_type || 'emoji');
    }
  }, [visible, item]);

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
    if (!name.trim()) {
      Alert.alert(t('common.error'), 'Please enter item name');
      return;
    }
    onSave({ name: name.trim(), icon, icon_type: iconType });
    onClose();
  };

  return (
    <Sheet visible={visible} onClose={onClose} C={C} Shadow={Shadow}>
      <Text style={[s.sheetTitle, { color: C.textPrimary }]}>
        {item ? t('expenseItems.editItem') : t('expenseItems.addItem')}
      </Text>

      <Text style={[s.label, { color: C.textSecondary }]}>{t('expenseItems.icon')}</Text>
      <View style={s.iconRow}>
        {iconType === 'image' ? (
          <Image source={{ uri: icon }} style={s.iconPreview} />
        ) : (
          <TextInput
            style={[s.iconInput, { backgroundColor: C.bgInput, color: C.textPrimary, borderColor: C.border }]}
            value={icon}
            onChangeText={setIcon}
            placeholder="📦"
            maxLength={2}
          />
        )}
        <TouchableOpacity
          style={[s.imageBtn, { backgroundColor: C.primaryDim, borderColor: C.primary }]}
          onPress={pickImage}
        >
          <Text style={{ fontSize: 20 }}>🖼️</Text>
        </TouchableOpacity>
        {iconType === 'image' && (
          <TouchableOpacity
            style={[s.imageBtn, { backgroundColor: C.expenseLight, borderColor: C.expense }]}
            onPress={() => { setIcon('📦'); setIconType('emoji'); }}
          >
            <Text style={{ fontSize: 20 }}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={[s.label, { color: C.textSecondary }]}>{t('expenseItems.itemName')}</Text>
      <TextInput
        style={[s.input, { backgroundColor: C.bgInput, color: C.textPrimary, borderColor: C.border }]}
        value={name}
        onChangeText={setName}
        placeholder={t('expenseItems.itemNamePlaceholder')}
        placeholderTextColor={C.textMuted}
      />

      <View style={s.btnRow}>
        <TouchableOpacity
          style={[s.btn, { borderColor: C.border, borderWidth: 1 }]}
          onPress={onClose}
        >
          <Text style={[s.btnTxt, { color: C.textSecondary }]}>{t('common.cancel')}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[s.btn, { backgroundColor: C.primary, flex: 1 }]}
          onPress={handleSave}
        >
          <Text style={[s.btnTxt, { color: '#fff' }]}>{t('common.save')}</Text>
        </TouchableOpacity>
      </View>
    </Sheet>
  );
};

export default function ExpenseItemsScreen({ navigation }) {
  const { t } = useTranslation();
  const { C, scale } = useTheme();
  const { Typography: T, Spacing: S, Radius: R } = scaleTheme(scale);
  const Shadow = makeShadow(C);

  const [categories, setCategories] = useState([]);
  const [selectedCategory, setSelectedCategory] = useState(null);
  const [items, setItems] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [editingItem, setEditingItem] = useState(null);

  useFocusEffect(
    React.useCallback(() => {
      loadCategories();
    }, [])
  );

  useEffect(() => {
    if (selectedCategory) {
      loadItems(selectedCategory.id);
    }
  }, [selectedCategory]);

  const loadCategories = () => {
    try {
      const cats = getAllCategories();
      setCategories(cats);
      if (cats.length > 0 && !selectedCategory) {
        setSelectedCategory(cats[0]);
      }
    } catch (e) {
      console.error('loadCategories:', e);
    }
  };

  const loadItems = (categoryId) => {
    try {
      const itemsList = getAllCategoryItems(categoryId);
      setItems(itemsList);
    } catch (e) {
      console.error('loadItems:', e);
      setItems([]);
    }
  };

  const handleAddItem = () => {
    setEditingItem(null);
    setShowForm(true);
  };

  const handleEditItem = (item) => {
    setEditingItem(item);
    setShowForm(true);
  };

  const handleSaveItem = (data) => {
    try {
      if (editingItem) {
        updateCategoryItem(editingItem.id, data.name, data.icon, data.icon_type);
      } else {
        addCategoryItem(selectedCategory.id, data.name, data.icon, data.icon_type);
      }
      loadItems(selectedCategory.id);
    } catch (e) {
      console.error('saveItem:', e);
      Alert.alert(t('common.error'), 'Failed to save item');
    }
  };

  const handleDeleteItem = (item) => {
    Alert.alert(
      t('common.delete'),
      t('expenseItems.deleteConfirm'),
      [
        { text: t('common.cancel'), style: 'cancel' },
        {
          text: t('common.delete'),
          style: 'destructive',
          onPress: () => {
            try {
              deleteCategoryItem(item.id);
              loadItems(selectedCategory.id);
            } catch (e) {
              console.error('deleteItem:', e);
            }
          },
        },
      ]
    );
  };

  return (
    <View style={[s.root, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={C.isDark ? 'light-content' : 'dark-content'} />

      <View style={[s.header, { backgroundColor: C.bgCard, borderBottomColor: C.border }, Shadow.sm]}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={s.backBtn}>
          <Text style={{ fontSize: 24 }}>←</Text>
        </TouchableOpacity>
        <Text style={[s.headerTitle, { color: C.textPrimary }]}>
          {t('expenseItems.title')}
        </Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={s.tabsContainer}
        contentContainerStyle={s.tabs}
      >
        {categories.map((cat) => (
          <TouchableOpacity
            key={cat.id}
            style={[
              s.tab,
              {
                backgroundColor: selectedCategory?.id === cat.id ? C.primary : C.bgCard,
                borderColor: selectedCategory?.id === cat.id ? C.primary : C.border,
              },
              Shadow.sm,
            ]}
            onPress={() => setSelectedCategory(cat)}
          >
            <Text style={{ fontSize: 20 }}>{cat.icon}</Text>
            <Text
              style={[
                s.tabText,
                { color: selectedCategory?.id === cat.id ? '#fff' : C.textPrimary },
              ]}
            >
              {cat.name}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      <ScrollView style={s.content} contentContainerStyle={s.contentInner}>
        {selectedCategory && (
          <>
            <View style={s.sectionHeader}>
              <Text style={[s.sectionTitle, { color: C.textPrimary }]}>
                {selectedCategory.icon} {selectedCategory.name} {t('expenseItems.items')}
              </Text>
              <Text style={[s.itemCount, { color: C.textSecondary }]}>
                {items.length} {t('expenseItems.itemsCount')}
              </Text>
            </View>

            {items.length === 0 ? (
              <View style={s.emptyState}>
                <Text style={{ fontSize: 48, marginBottom: S.md }}>📦</Text>
                <Text style={[s.emptyText, { color: C.textSecondary }]}>
                  {t('expenseItems.noItems')}
                </Text>
                <Text style={[s.emptyHint, { color: C.textMuted }]}>
                  {t('expenseItems.addFirstItem')}
                </Text>
              </View>
            ) : (
              <View style={s.itemsList}>
                {items.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    onEdit={handleEditItem}
                    onDelete={handleDeleteItem}
                    C={C}
                    Shadow={Shadow}
                    t={t}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {selectedCategory && (
        <TouchableOpacity
          style={[s.fab, { backgroundColor: C.primary }, Shadow.primary]}
          onPress={handleAddItem}
        >
          <Text style={s.fabText}>+</Text>
        </TouchableOpacity>
      )}

      <ItemFormSheet
        visible={showForm}
        item={editingItem}
        categoryId={selectedCategory?.id}
        onSave={handleSaveItem}
        onClose={() => setShowForm(false)}
        C={C}
        Shadow={Shadow}
        t={t}
      />
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1 },
  overlay: { flex: 1, justifyContent: 'flex-end' },
  sheet: { borderTopLeftRadius: 28, borderTopRightRadius: 28, padding: Spacing.xl, paddingBottom: 42 },
  handle: { width: 44, height: 4, borderRadius: 2, alignSelf: 'center', marginBottom: Spacing.lg },
  
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    borderBottomWidth: 1,
  },
  backBtn: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  headerTitle: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold },

  tabsContainer: { maxHeight: 80 },
  tabs: { paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, gap: Spacing.sm },
  tab: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.full,
    borderWidth: 1.5,
  },
  tabText: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.bold },

  content: { flex: 1 },
  contentInner: { padding: Spacing.base },
  
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  sectionTitle: { fontSize: Typography.sizes.lg, fontWeight: Typography.weights.bold },
  itemCount: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.medium },

  itemsList: { gap: Spacing.sm },
  itemCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.base,
    borderRadius: Radius.lg,
    borderWidth: 1,
  },
  itemImage: { width: 32, height: 32, borderRadius: 8, marginRight: Spacing.sm },
  itemName: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.semibold },
  itemActions: { flexDirection: 'row', gap: Spacing.xs },
  actionBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyState: { alignItems: 'center', paddingVertical: Spacing.xxl * 2 },
  emptyText: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.semibold, marginBottom: 4 },
  emptyHint: { fontSize: Typography.sizes.sm },

  fab: {
    position: 'absolute',
    bottom: Spacing.xl,
    right: Spacing.xl,
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  fabText: { fontSize: 32, color: '#fff', fontWeight: Typography.weights.bold, lineHeight: 36 },

  sheetTitle: { fontSize: Typography.sizes.xl, fontWeight: Typography.weights.bold, marginBottom: Spacing.lg },
  label: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold, marginBottom: Spacing.xs, marginTop: Spacing.sm },
  iconRow: { flexDirection: 'row', gap: Spacing.sm, marginBottom: Spacing.sm },
  iconInput: {
    flex: 1,
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    fontSize: 28,
    textAlign: 'center',
  },
  iconPreview: { width: 56, height: 56, borderRadius: Radius.lg },
  imageBtn: { width: 56, height: 56, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },
  input: {
    borderRadius: Radius.lg,
    borderWidth: 1,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.md,
    fontSize: Typography.sizes.base,
  },
  
  btnRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  btn: { flex: 1, paddingVertical: Spacing.md, borderRadius: Radius.lg, alignItems: 'center' },
  btnTxt: { fontSize: Typography.sizes.base, fontWeight: Typography.weights.bold },
});
