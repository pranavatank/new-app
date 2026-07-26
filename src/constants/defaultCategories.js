export const DEFAULT_CATEGORIES = [
  { name: 'Food',        icon: '🥗', sort_order: 1 },
  { name: 'Vegetables',  icon: '🥬', sort_order: 2 },
  { name: 'Grains',      icon: '🌾', sort_order: 3 },
  { name: 'Fuel',        icon: '⛽', sort_order: 4 },
  { name: 'Medicine',    icon: '💊', sort_order: 5 },
  { name: 'Groceries',   icon: '🛒', sort_order: 6 },
  { name: 'Household',   icon: '🏠', sort_order: 7 },
  { name: 'Recharge',    icon: '📱', sort_order: 8 },
  { name: 'Education',   icon: '🎓', sort_order: 9 },
  { name: 'Occasion',    icon: '🎉', sort_order: 10 },
  { name: 'Other',       icon: '💰', sort_order: 11 },
];

export const translateCategoryName = (name, t) => {
  const keyMap = {
    'Food': 'food',
    'Vegetables': 'vegetables',
    'Grains': 'grains',
    'Fuel': 'fuel',
    'Medicine': 'medicine',
    'Groceries': 'groceries',
    'Household': 'household',
    'Recharge': 'recharge',
    'Education': 'education',
    'Occasion': 'occasion',
    'Other': 'other',
  };
  const key = keyMap[name];
  return key ? t(`categories.${key}`) : name;
};
