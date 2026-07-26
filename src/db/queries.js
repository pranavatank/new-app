import { getDB } from './schema';

// ─── Helpers ─────────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().split('T')[0];

// ─── Days ─────────────────────────────────────────────────────────────────────

/**
 * Get the most recent closing balance BEFORE a given date.
 * Returns 0 if no previous record exists.
 */
export const getPreviousClosingBalance = (date) => {
  const db = getDB();
  const row = db.getFirstSync(
    `SELECT closing_balance FROM days
     WHERE date < ? ORDER BY date DESC LIMIT 1;`,
    [date]
  );
  return row ? row.closing_balance : 0;
};

/**
 * Get or create a day record for the given date.
 * On creation, opening balance is auto-pulled from previous day.
 */
export const getOrCreateDay = (date) => {
  const db = getDB();
  let day = db.getFirstSync('SELECT * FROM days WHERE date = ?;', [date]);
  if (!day) {
    const prevBalance = getPreviousClosingBalance(date);
    db.runSync(
      'INSERT INTO days (date, deposit_today, closing_balance) VALUES (?, 0, ?);',
      [date, prevBalance]
    );
    day = db.getFirstSync('SELECT * FROM days WHERE date = ?;', [date]);
  }
  return day;
};

/**
 * Get full day data including computed opening balance and totals.
 */
export const getDayData = (date) => {
  const db = getDB();
  const day = getOrCreateDay(date);

  const cashSpent = db.getFirstSync(
    `SELECT COALESCE(SUM(amount), 0) as total FROM expenses
     WHERE day_id = ? AND payment_type = 'cash';`,
    [day.id]
  ).total;

  const onlineSpent = db.getFirstSync(
    `SELECT COALESCE(SUM(amount), 0) as total FROM expenses
     WHERE day_id = ? AND payment_type = 'online';`,
    [day.id]
  ).total;

  const openingBalance = getPreviousClosingBalance(date);

  return {
    ...day,
    opening_balance: openingBalance,
    cash_spent:      cashSpent,
    online_spent:    onlineSpent,
    // closing = opening + deposit - cash spent (online doesn't affect cash)
    closing_balance: openingBalance + day.deposit_today - cashSpent,
  };
};

/**
 * Update deposit for a day and recalculate closing balance.
 */
export const updateDeposit = (date, amount) => {
  const db = getDB();
  const day = getOrCreateDay(date);
  const openingBalance = getPreviousClosingBalance(date);

  const cashSpent = db.getFirstSync(
    `SELECT COALESCE(SUM(amount), 0) as total FROM expenses
     WHERE day_id = ? AND payment_type = 'cash';`,
    [day.id]
  ).total;

  const newClosing = openingBalance + amount - cashSpent;

  db.runSync(
    'UPDATE days SET deposit_today = ?, closing_balance = ? WHERE id = ?;',
    [amount, newClosing, day.id]
  );
};

/**
 * Recalculate and save closing balance (call after any expense change).
 */
export const recalculateBalance = (dayId, date) => {
  const db = getDB();
  const day = db.getFirstSync('SELECT * FROM days WHERE id = ?;', [dayId]);
  if (!day) return;

  const openingBalance = getPreviousClosingBalance(date);

  const cashSpent = db.getFirstSync(
    `SELECT COALESCE(SUM(amount), 0) as total FROM expenses
     WHERE day_id = ? AND payment_type = 'cash';`,
    [dayId]
  ).total;

  const newClosing = openingBalance + day.deposit_today - cashSpent;
  db.runSync('UPDATE days SET closing_balance = ? WHERE id = ?;', [newClosing, dayId]);
};

// ─── Expenses ─────────────────────────────────────────────────────────────────

/**
 * Get all expenses for a day, joined with category info.
 */
export const getExpensesForDay = (dayId) => {
  const db = getDB();
  return db.getAllSync(
    `SELECT e.*, c.name as category_name, c.icon as category_icon
     FROM expenses e
     JOIN categories c ON e.category_id = c.id
     WHERE e.day_id = ?
     ORDER BY c.sort_order;`,
    [dayId]
  );
};

/**
 * Get expense totals grouped by category for a day.
 */
export const getExpenseSummaryForDay = (dayId) => {
  const db = getDB();
  return db.getAllSync(
    `SELECT 
       c.id as category_id, c.name, c.icon, c.sort_order,
       COALESCE(SUM(CASE WHEN e.payment_type='cash'   THEN e.amount ELSE 0 END), 0) as cash_total,
       COALESCE(SUM(CASE WHEN e.payment_type='online' THEN e.amount ELSE 0 END), 0) as online_total,
       COALESCE(SUM(e.amount), 0) as total
     FROM categories c
     LEFT JOIN expenses e ON e.category_id = c.id AND e.day_id = ?
     WHERE c.is_active = 1
     GROUP BY c.id
     ORDER BY c.sort_order;`,
    [dayId]
  );
};

/**
 * Upsert expense for a day + category + payment_type.
 * If amount is 0, deletes the record.
 */
export const setExpenseAmount = (dayId, categoryId, amount, paymentType = 'cash', itemId = null, note = null) => {
  const db = getDB();

  if (amount <= 0) {
    if (itemId) {
      db.runSync(
        'DELETE FROM expenses WHERE day_id = ? AND category_id = ? AND item_id = ? AND payment_type = ?;',
        [dayId, categoryId, itemId, paymentType]
      );
    } else {
      db.runSync(
        'DELETE FROM expenses WHERE day_id = ? AND category_id = ? AND item_id IS NULL AND payment_type = ?;',
        [dayId, categoryId, paymentType]
      );
    }
  } else {
    const existing = itemId
      ? db.getFirstSync(
          'SELECT id FROM expenses WHERE day_id = ? AND category_id = ? AND item_id = ? AND payment_type = ?;',
          [dayId, categoryId, itemId, paymentType]
        )
      : db.getFirstSync(
          'SELECT id FROM expenses WHERE day_id = ? AND category_id = ? AND item_id IS NULL AND payment_type = ?;',
          [dayId, categoryId, paymentType]
        );
    
    if (existing) {
      db.runSync(
        'UPDATE expenses SET amount = ?, note = ? WHERE id = ?;',
        [amount, note, existing.id]
      );
    } else {
      db.runSync(
        'INSERT INTO expenses (day_id, category_id, item_id, amount, payment_type, note) VALUES (?, ?, ?, ?, ?, ?);',
        [dayId, categoryId, itemId, amount, paymentType, note]
      );
    }
  }
};

// ─── Categories ───────────────────────────────────────────────────────────────

export const getAllCategories = () => {
  const db = getDB();
  return db.getAllSync(
    'SELECT * FROM categories WHERE is_active = 1 ORDER BY sort_order;'
  );
};

export const addCategory = (name, icon = '💰') => {
  const db = getDB();
  const maxOrder = db.getFirstSync('SELECT MAX(sort_order) as m FROM categories;').m || 0;
  db.runSync(
    'INSERT INTO categories (name, icon, sort_order) VALUES (?, ?, ?);',
    [name, icon, maxOrder + 1]
  );
};

export const updateCategory = (id, name, icon) => {
  const db = getDB();
  db.runSync('UPDATE categories SET name = ?, icon = ? WHERE id = ?;', [name, icon, id]);
};

export const deleteCategory = (id) => {
  const db = getDB();
  db.runSync('UPDATE categories SET is_active = 0 WHERE id = ?;', [id]);
};

export const getItemExpenses = (dayId, categoryId, paymentType = 'cash') => {
  const db = getDB();
  return db.getAllSync(
    `SELECT e.*, ci.name as item_name, ci.icon, ci.icon_type
     FROM expenses e
     LEFT JOIN category_items ci ON e.item_id = ci.id
     WHERE e.day_id = ? AND e.category_id = ? AND e.payment_type = ?
     ORDER BY ci.name;`,
    [dayId, categoryId, paymentType]
  );
};

export const updateCategoryOrder = (id, sortOrder) => {
  const db = getDB();
  db.runSync('UPDATE categories SET sort_order = ? WHERE id = ?;', [sortOrder, id]);
};

// ─── Tasks ────────────────────────────────────────────────────────────────────

/**
 * Get tasks visible on a given date:
 *   start_date <= date AND status = 'pending'
 */
export const getTasksForDay = (date) => {
  const db = getDB();
  return db.getAllSync(
    `SELECT * FROM tasks
     WHERE start_date <= ? AND status = 'pending'
     ORDER BY start_date ASC;`,
    [date]
  );
};

export const getAllTasks = () => {
  const db = getDB();
  return db.getAllSync('SELECT * FROM tasks ORDER BY start_date ASC;');
};

export const addTask = (title, startDate) => {
  const db = getDB();
  db.runSync(
    'INSERT INTO tasks (title, start_date) VALUES (?, ?);',
    [title, startDate]
  );
};

export const completeTask = (id) => {
  const db = getDB();
  const completedDate = today();
  db.runSync(
    "UPDATE tasks SET status = 'completed', completed_date = ? WHERE id = ?;",
    [completedDate, id]
  );
};

export const deleteTask = (id) => {
  const db = getDB();
  db.runSync('DELETE FROM tasks WHERE id = ?;', [id]);
};

export const updateTask = (id, title, startDate) => {
  const db = getDB();
  db.runSync('UPDATE tasks SET title = ?, start_date = ? WHERE id = ?;', [title, startDate, id]);
};

export const revertTask = (id) => {
  const db = getDB();
  db.runSync(
    "UPDATE tasks SET status = 'pending', completed_date = NULL WHERE id = ?;",
    [id]
  );
};

export const getCompletedTasks = () => {
  const db = getDB();
  return db.getAllSync(
    `SELECT * FROM tasks WHERE status = 'completed' ORDER BY completed_date DESC LIMIT 50;`
  );
};

// ─── Places ───────────────────────────────────────────────────────────────────

export const getAllPlaces = () => {
  const db = getDB();
  return db.getAllSync(
    'SELECT * FROM places ORDER BY is_favorite DESC, name ASC;'
  );
};

export const getPlacesForDay = (dayId) => {
  const db = getDB();
  return db.getAllSync(
    `SELECT p.* FROM places p
     JOIN day_places dp ON dp.place_id = p.id
     WHERE dp.day_id = ?;`,
    [dayId]
  );
};

export const addPlace = (name, isFavorite = 0) => {
  const db = getDB();
  db.runSync('INSERT INTO places (name, is_favorite) VALUES (?, ?);', [name, isFavorite]);
  return db.getFirstSync('SELECT * FROM places WHERE rowid = last_insert_rowid();');
};

export const togglePlaceForDay = (dayId, placeId) => {
  const db = getDB();
  const exists = db.getFirstSync(
    'SELECT id FROM day_places WHERE day_id = ? AND place_id = ?;',
    [dayId, placeId]
  );
  if (exists) {
    db.runSync('DELETE FROM day_places WHERE day_id = ? AND place_id = ?;', [dayId, placeId]);
    return false;
  } else {
    db.runSync('INSERT INTO day_places (day_id, place_id) VALUES (?, ?);', [dayId, placeId]);
    return true;
  }
};

export const toggleFavoritePlace = (id) => {
  const db = getDB();
  db.runSync('UPDATE places SET is_favorite = NOT is_favorite WHERE id = ?;', [id]);
};

export const deletePlace = (id) => {
  const db = getDB();
  db.runSync('DELETE FROM day_places WHERE place_id = ?;', [id]);
  db.runSync('DELETE FROM places WHERE id = ?;', [id]);
};

export const updatePlace = (id, name) => {
  const db = getDB();
  db.runSync('UPDATE places SET name = ? WHERE id = ?;', [name, id]);
};

// ─── Notes ────────────────────────────────────────────────────────────────────

export const getNotesForDay = (dayId) => {
  const db = getDB();
  return db.getAllSync(
    'SELECT * FROM notes WHERE day_id = ? ORDER BY created_at ASC;',
    [dayId]
  );
};

export const addNote = (dayId, text, mood = 'other') => {
  const db = getDB();
  db.runSync('INSERT INTO notes (day_id, text, mood) VALUES (?, ?, ?);', [dayId, text, mood]);
};

export const deleteNote = (id) => {
  const db = getDB();
  db.runSync('DELETE FROM notes WHERE id = ?;', [id]);
};

export const updateNote = (id, text, mood = 'other') => {
  const db = getDB();
  db.runSync('UPDATE notes SET text = ?, mood = ? WHERE id = ?;', [text, mood, id]);
};

// ─── Analytics ────────────────────────────────────────────────────────────────

/**
 * Get monthly summary: total cash spent, online spent, deposited — per category.
 */
export const getMonthlySummary = (year, month) => {
  const db = getDB();
  const prefix = `${year}-${String(month).padStart(2, '0')}`;

  return db.getAllSync(
    `SELECT 
       c.name, c.icon,
       COALESCE(SUM(CASE WHEN e.payment_type='cash'   THEN e.amount ELSE 0 END), 0) as cash_total,
       COALESCE(SUM(CASE WHEN e.payment_type='online' THEN e.amount ELSE 0 END), 0) as online_total,
       COALESCE(SUM(e.amount), 0) as total
     FROM categories c
     LEFT JOIN expenses e   ON e.category_id = c.id
     LEFT JOIN days d       ON e.day_id = d.id AND d.date LIKE ?
     WHERE c.is_active = 1
     GROUP BY c.id
     HAVING total > 0
     ORDER BY total DESC;`,
    [`${prefix}%`]
  );
};

export const getMonthlyDeposit = (year, month) => {
  const db = getDB();
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  const row = db.getFirstSync(
    `SELECT COALESCE(SUM(deposit_today), 0) as total
     FROM days WHERE date LIKE ?;`,
    [`${prefix}%`]
  );
  return row ? row.total : 0;
};

/**
 * Daily expense totals for a month — for the trend bar chart.
 */
export const getDailyTotals = (year, month) => {
  const db = getDB();
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  return db.getAllSync(
    `SELECT
       d.date,
       COALESCE(SUM(CASE WHEN e.payment_type='cash'   THEN e.amount ELSE 0 END), 0) as cash_total,
       COALESCE(SUM(CASE WHEN e.payment_type='online' THEN e.amount ELSE 0 END), 0) as online_total,
       COALESCE(SUM(e.amount), 0) as total,
       d.deposit_today
     FROM days d
     LEFT JOIN expenses e ON e.day_id = d.id
     WHERE d.date LIKE ?
     GROUP BY d.date
     ORDER BY d.date ASC;`,
    [`${prefix}%`]
  );
};

/**
 * Overall month totals: deposited, cash_spent, online_spent, savings.
 */
export const getMonthTotals = (year, month) => {
  const db = getDB();
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  const row = db.getFirstSync(
    `SELECT
       COALESCE(SUM(d.deposit_today), 0) as deposited,
       COALESCE(SUM(CASE WHEN e.payment_type='cash'   THEN e.amount ELSE 0 END), 0) as cash_spent,
       COALESCE(SUM(CASE WHEN e.payment_type='online' THEN e.amount ELSE 0 END), 0) as online_spent
     FROM days d
     LEFT JOIN expenses e ON e.day_id = d.id
     WHERE d.date LIKE ?;`,
    [`${prefix}%`]
  );
  return row || { deposited: 0, cash_spent: 0, online_spent: 0 };
};

/**
 * Top spending days for a month.
 */
export const getTopSpendingDays = (year, month, limit = 5) => {
  const db = getDB();
  const prefix = `${year}-${String(month).padStart(2, '0')}`;
  return db.getAllSync(
    `SELECT d.date, COALESCE(SUM(e.amount), 0) as total
     FROM days d
     LEFT JOIN expenses e ON e.day_id = d.id
     WHERE d.date LIKE ?
     GROUP BY d.date
     HAVING total > 0
     ORDER BY total DESC
     LIMIT ?;`,
    [`${prefix}%`, limit]
  );
};

/**
 * Available months that have any data.
 */
export const getAvailableMonths = () => {
  const db = getDB();
  return db.getAllSync(
    `SELECT DISTINCT substr(date,1,7) as month
     FROM days
     ORDER BY month DESC
     LIMIT 24;`
  );
};

// ─── Category Items ───────────────────────────────────────────────────────────

export const getAllCategoryItems = (categoryId) => {
  const db = getDB();
  return db.getAllSync(
    'SELECT * FROM category_items WHERE category_id = ? AND is_active = 1 ORDER BY name;',
    [categoryId]
  );
};

export const addCategoryItem = (categoryId, name, icon = '📦', iconType = 'emoji') => {
  const db = getDB();
  db.runSync(
    'INSERT INTO category_items (category_id, name, icon, icon_type) VALUES (?, ?, ?, ?);',
    [categoryId, name, icon, iconType]
  );
};

export const updateCategoryItem = (id, name, icon = '📦', iconType = 'emoji') => {
  const db = getDB();
  db.runSync(
    'UPDATE category_items SET name = ?, icon = ?, icon_type = ? WHERE id = ?;',
    [name, icon, iconType, id]
  );
};

export const deleteCategoryItem = (id) => {
  const db = getDB();
  db.runSync('UPDATE category_items SET is_active = 0 WHERE id = ?;', [id]);
};

export const getCategoryItem = (id) => {
  const db = getDB();
  return db.getFirstSync('SELECT * FROM category_items WHERE id = ?;', [id]);
};

// ─── Vehicle Records ──────────────────────────────────────────────────────────

export const getAllVehicleRecords = () => {
  const db = getDB();
  return db.getAllSync(
    'SELECT * FROM vehicle_records ORDER BY date DESC, id DESC;'
  );
};

export const addVehicleRecord = (date, reading, liters, pricePerLiter, amount, paymentType = 'online') => {
  const db = getDB();
  db.runSync(
    'INSERT INTO vehicle_records (date, reading, liters, price_per_liter, amount, payment_type) VALUES (?, ?, ?, ?, ?, ?);',
    [date, reading, liters, pricePerLiter, amount, paymentType]
  );
};

export const updateVehicleRecord = (id, date, reading, liters, pricePerLiter, amount, paymentType) => {
  const db = getDB();
  db.runSync(
    'UPDATE vehicle_records SET date = ?, reading = ?, liters = ?, price_per_liter = ?, amount = ?, payment_type = ? WHERE id = ?;',
    [date, reading, liters, pricePerLiter, amount, paymentType, id]
  );
};

export const deleteVehicleRecord = (id) => {
  const db = getDB();
  db.runSync('DELETE FROM vehicle_records WHERE id = ?;', [id]);
};

export const getVehicleStats = () => {
  const db = getDB();
  const records = db.getAllSync(
    'SELECT * FROM vehicle_records ORDER BY date ASC, id ASC;'
  );
  
  if (records.length === 0) {
    return {
      totalAvg: 0,
      last10Avg: 0,
      totalDistance: 0,
      totalAmount: 0,
      totalFuel: 0,
      recordCount: 0,
    };
  }

  // Calculate distances and averages
  let totalDistance = 0;
  let totalFuel = 0;
  let totalAmount = 0;
  const averages = [];

  for (let i = 0; i < records.length; i++) {
    const current = records[i];
    totalAmount += current.amount;

    if (i === 0) continue;
    const previous = records[i - 1];
    const prevReading = Number(previous?.reading) || 0;
    const currReading = Number(current?.reading) || 0;
    if (prevReading <= 0) continue;
    const distance = currReading - prevReading;
    if (distance <= 0) continue;

    totalDistance += distance;
    totalFuel += current.liters;

    if (current.liters > 0) {
      const avg = distance / current.liters;
      averages.push(avg);
    }
  }

  // Total average
  const totalAvg = totalFuel > 0 ? (totalDistance / totalFuel).toFixed(2) : 0;

  // Last 10 average
  const last10Records = averages.slice(-10);
  const last10Avg = last10Records.length > 0
    ? (last10Records.reduce((sum, avg) => sum + avg, 0) / last10Records.length).toFixed(2)
    : 0;

  return {
    totalAvg: parseFloat(totalAvg),
    last10Avg: parseFloat(last10Avg),
    totalDistance,
    totalAmount,
    totalFuel,
    recordCount: records.length,
  };
};
