import React, { useState, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, Alert, StatusBar,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { useTranslation } from 'react-i18next';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { scaleTheme } from '../constants/theme';
import { useTheme } from '../store/ThemeContext';
import {
  Card, Button, IconBadge, Sheet, Input, Chip, EmptyState, ScreenHeader, FAB,
} from '../components/common';
import {
  getAllCategoryItems,
  addCategoryItem,
  updateCategoryItem,
  deleteCategoryItem,
  getAllCategories,
} from '../db/queries';

const ItemCard = ({ item, onEdit, onDelete }) => {
  const { C, scale } = useTheme();
  const { Typography, Spacing } = scaleTheme(scale);
  const st = styles(scale);

  return (
    <Card padding="base" elevation="sm" style={st.itemCard}>
      <IconBadge
        photoUri={item.icon_type === 'image' ? item.icon : undefined}
        emoji={item.icon_type !== 'image' ? item.icon : undefined}
        size={44}
        style={{ marginRight: Spacing.sm }}
      />
      <View style={{ flex: 1 }}>
        <Text style={{ fontSize: Typography.sizes.base, fontWeight: Typography.weights.semibold, color: C.textPrimary }}>
          {item.name}
        </Text>
      </View>
      <View style={{ flexDirection: 'row', gap: Spacing.xs }}>
        <TouchableOpacity
          style={[st.actionBtn, { backgroundColor: C.primaryDim }]}
          onPress={() => onEdit(item)}
        >
          <Ionicons name="create-outline" size={18} color={C.primary} />
        </TouchableOpacity>
        <TouchableOpacity
          style={[st.actionBtn, { backgroundColor: C.expenseLight }]}
          onPress={() => onDelete(item)}
        >
          <Ionicons name="trash-outline" size={18} color={C.expense} />
        </TouchableOpacity>
      </View>
    </Card>
  );
};

const ItemFormSheet = ({ visible, item, categoryId, onSave, onClose }) => {
  const { C, scale } = useTheme();
  const { Spacing } = scaleTheme(scale);
  const { t } = useTranslation();
  const st = styles(scale);

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
    <Sheet
      visible={visible}
      onClose={onClose}
      title={item ? t('expenseItems.editItem') : t('expenseItems.addItem')}
    >
      <Text style={[st.label, { color: C.textSecondary }]}>{t('expenseItems.icon')}</Text>
      <View style={st.iconRow}>
        <IconBadge
          photoUri={iconType === 'image' ? icon : undefined}
          emoji={iconType !== 'image' ? icon : undefined}
          size={64}
        />
        {iconType !== 'image' && (
          <TextInput
            style={[st.iconInput, { backgroundColor: C.bgInput, color: C.textPrimary, borderColor: C.border }]}
            value={icon}
            onChangeText={setIcon}
            placeholder="📦"
            maxLength={2}
          />
        )}
        <TouchableOpacity
          style={[st.imageBtn, { backgroundColor: C.primaryDim, borderColor: C.primary }]}
          onPress={pickImage}
        >
          <Ionicons name="camera" size={22} color={C.primary} />
        </TouchableOpacity>
        {iconType === 'image' && (
          <TouchableOpacity
            style={[st.imageBtn, { backgroundColor: C.expenseLight, borderColor: C.expense }]}
            onPress={() => { setIcon('📦'); setIconType('emoji'); }}
          >
            <Ionicons name="close" size={22} color={C.expense} />
          </TouchableOpacity>
        )}
      </View>

      <Input
        label={t('expenseItems.itemName')}
        value={name}
        onChangeText={setName}
        placeholder={t('expenseItems.itemNamePlaceholder')}
        style={{ marginTop: Spacing.sm }}
      />

      <View style={st.btnRow}>
        <Button
          label={t('common.cancel')}
          variant="secondary"
          onPress={onClose}
          style={{ flex: 1 }}
        />
        <Button
          label={t('common.save')}
          variant="primary"
          onPress={handleSave}
          style={{ flex: 1 }}
        />
      </View>
    </Sheet>
  );
};

export default function ExpenseItemsScreen({ navigation }) {
  const { t } = useTranslation();
  const { C, scale } = useTheme();
  const st = styles(scale);

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
    <View style={[st.root, { backgroundColor: C.bg }]}>
      <StatusBar barStyle={C.isDark ? 'light-content' : 'dark-content'} />

      <ScreenHeader title={t('expenseItems.title')} onBack={() => navigation.goBack()} />

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={st.tabsContainer}
        contentContainerStyle={st.tabs}
      >
        {categories.map((cat, index) => (
          <Chip
            key={cat.id}
            label={cat.name}
            emoji={cat.icon}
            active={selectedCategory?.id === cat.id}
            color={C.accents[index % C.accents.length]}
            onPress={() => setSelectedCategory(cat)}
          />
        ))}
      </ScrollView>

      <ScrollView style={st.content} contentContainerStyle={st.contentInner}>
        {selectedCategory && (
          <>
            <View style={st.sectionHeader}>
              <Text style={[st.sectionTitle, { color: C.textPrimary }]}>
                {selectedCategory.icon} {selectedCategory.name} {t('expenseItems.items')}
              </Text>
              <Text style={[st.itemCount, { color: C.textSecondary }]}>
                {items.length} {t('expenseItems.itemsCount')}
              </Text>
            </View>

            {items.length === 0 ? (
              <EmptyState
                icon="cube-outline"
                title={t('expenseItems.noItems')}
                subtitle={t('expenseItems.addFirstItem')}
              />
            ) : (
              <View style={st.itemsList}>
                {items.map((item) => (
                  <ItemCard
                    key={item.id}
                    item={item}
                    onEdit={handleEditItem}
                    onDelete={handleDeleteItem}
                  />
                ))}
              </View>
            )}
          </>
        )}
      </ScrollView>

      {selectedCategory && (
        <FAB icon="add" onPress={handleAddItem} style={st.fab} />
      )}

      <ItemFormSheet
        visible={showForm}
        item={editingItem}
        categoryId={selectedCategory?.id}
        onSave={handleSaveItem}
        onClose={() => setShowForm(false)}
      />
    </View>
  );
}

const styles = (scale) => {
  const { Typography, Spacing, Radius } = scaleTheme(scale);
  return StyleSheet.create({
    root: { flex: 1 },

    tabsContainer: { maxHeight: 80 },
    tabs: { paddingHorizontal: Spacing.base, paddingVertical: Spacing.md, gap: Spacing.sm },

    content: { flex: 1 },
    contentInner: { padding: Spacing.base, paddingBottom: 100 },

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
    },
    actionBtn: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
      justifyContent: 'center',
    },

    fab: {
      position: 'absolute',
      bottom: 100,
      right: Spacing.xl,
    },

    label: { fontSize: Typography.sizes.sm, fontWeight: Typography.weights.semibold, marginBottom: Spacing.xs, marginTop: Spacing.sm },
    iconRow: { flexDirection: 'row', alignItems: 'center', gap: Spacing.sm, marginBottom: Spacing.sm },
    iconInput: {
      flex: 1,
      borderRadius: Radius.lg,
      borderWidth: 1,
      paddingHorizontal: Spacing.base,
      paddingVertical: Spacing.md,
      fontSize: 28,
      textAlign: 'center',
    },
    imageBtn: { width: 56, height: 56, borderRadius: Radius.lg, alignItems: 'center', justifyContent: 'center', borderWidth: 1.5 },

    btnRow: { flexDirection: 'row', gap: Spacing.sm, marginTop: Spacing.lg },
  });
};
