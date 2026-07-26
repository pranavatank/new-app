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
 * Recompute and persist closing_balance for every day strictly after `date`,
 * in chronological order, chaining each day's opening balance off the
 * previous day's freshly-recomputed closing balance.
 *
 * Without this, editing a past day's deposit/expenses only updates that
 * day's own stored closing_balance — any later day that was already
 * created in the `days` table keeps its stale balance until it happens to
 * be recalculated on its own.
 */
const cascadeBalanceForward = (db, date) => {
  const laterDays = db.getAllSync(
    'SELECT id, date, deposit_today FROM days WHERE date > ? ORDER BY date ASC;',
    [date]
  );
  if (laterDays.length === 0) return;

  let prevClosing = getPreviousClosingBalance(laterDays[0].date);

  for (const d of laterDays) {
    const cashSpent = db.getFirstSync(
      `SELECT COALESCE(SUM(amount), 0) as total FROM expenses
       WHERE day_id = ? AND payment_type = 'cash';`,
      [d.id]
    ).total;

    const newClosing = prevClosing + d.deposit_today - cashSpent;
    db.runSync('UPDATE days SET closing_balance = ? WHERE id = ?;', [newClosing, d.id]);
    prevClosing = newClosing;
  }
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
  cascadeBalanceForward(db, date);
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
  cascadeBalanceForward(db, date);
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

export const addPlace = (name, isFavorite = 0, icon = '📍', iconType = 'emoji') => {
  const db = getDB();
  db.runSync(
    'INSERT INTO places (name, is_favorite, icon, icon_type) VALUES (?, ?, ?, ?);',
    [name, isFavorite, icon, iconType]
  );
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

export const updatePlace = (id, name, icon, iconType) => {
  const db = getDB();
  if (icon !== undefined && iconType !== undefined) {
    db.runSync(
      'UPDATE places SET name = ?, icon = ?, icon_type = ? WHERE id = ?;',
      [name, icon, iconType, id]
    );
  } else {
    db.runSync('UPDATE places SET name = ? WHERE id = ?;', [name, id]);
  }
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
     LEFT JOIN days d       ON e.day_id = d.id
     WHERE c.is_active = 1 AND (d.date LIKE ? OR e.id IS NULL)
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

  // Calculate distances and averages.
  //
  // A fill-up's liters power the riding that happens AFTER it, up until the
  // next fill-up — not the distance that was already covered to reach it.
  // So the distance between fill-up i-1 and fill-up i was fuelled by
  // `previous.liters` (the older, i.e. already-consumed, fill-up), never by
  // `current.liters` (which is still sitting in the tank, powering the next,
  // not-yet-completed leg). Using `current.liters` here was the original bug.
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
    const fuelUsed = Number(previous?.liters) || 0;
    if (prevReading <= 0 || fuelUsed <= 0) continue;
    const distance = currReading - prevReading;
    if (distance <= 0) continue;

    totalDistance += distance;
    totalFuel += fuelUsed;
    averages.push(distance / fuelUsed);
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

// ─── Search ───────────────────────────────────────────────────────────────────

export const SEARCH_MIN_QUERY_LENGTH = 2;
const SEARCH_DEFAULT_LIMIT = 25;

/**
 * Build a safe LIKE pattern. The query is NEVER concatenated into SQL — it is
 * always bound as a `?` parameter. This only neutralises the LIKE wildcards
 * `%` and `_` (and the escape char itself) so a user typing "50%" or "a_b"
 * searches literally instead of matching everything.
 */
const buildLikePattern = (query) => {
  const escaped = String(query == null ? '' : query)
    .trim()
    .replace(/[\\%_]/g, (ch) => '\\' + ch);
  return `%${escaped}%`;
};

/**
 * Search expenses by category name, sub-item name, or the expense's own note.
 * Returns rows: { id, date, amount, payment_type, note, category_id,
 *                 category_name, category_icon, category_icon_type,
 *                 item_id, item_name, item_icon, item_icon_type }
 * Most recent day first. Read-only.
 */
export const searchExpenses = (query, limit = SEARCH_DEFAULT_LIMIT, extraCategoryIds = []) => {
  const q = String(query || '').trim();
  if (q.length < SEARCH_MIN_QUERY_LENGTH) return [];
  const db = getDB();
  const pattern = buildLikePattern(q);
  const idPlaceholders = extraCategoryIds.length > 0 ? extraCategoryIds.map(() => '?').join(',') : null;
  return db.getAllSync(
    `SELECT
       e.id            AS id,
       d.date          AS date,
       e.amount        AS amount,
       e.payment_type  AS payment_type,
       e.note          AS note,
       c.id            AS category_id,
       c.name          AS category_name,
       c.icon          AS category_icon,
       c.icon_type     AS category_icon_type,
       ci.id           AS item_id,
       ci.name         AS item_name,
       ci.icon         AS item_icon,
       ci.icon_type    AS item_icon_type
     FROM expenses e
     JOIN days d            ON d.id  = e.day_id
     JOIN categories c      ON c.id  = e.category_id
     LEFT JOIN category_items ci ON ci.id = e.item_id
     WHERE c.name LIKE ? ESCAPE '\\'
        OR (ci.name IS NOT NULL AND ci.name LIKE ? ESCAPE '\\')
        OR (e.note  IS NOT NULL AND e.note  LIKE ? ESCAPE '\\')
        ${idPlaceholders ? `OR c.id IN (${idPlaceholders})` : ''}
     ORDER BY d.date DESC, e.id DESC
     LIMIT ?;`,
    [pattern, pattern, pattern, ...extraCategoryIds, limit]
  );
};

/**
 * Search daily notes by their text content.
 * Returns rows: { id, text, mood, created_at, date }. Most recent day first.
 */
export const searchNotes = (query, limit = SEARCH_DEFAULT_LIMIT) => {
  const q = String(query || '').trim();
  if (q.length < SEARCH_MIN_QUERY_LENGTH) return [];
  const db = getDB();
  const pattern = buildLikePattern(q);
  return db.getAllSync(
    `SELECT
       n.id         AS id,
       n.text       AS text,
       n.mood       AS mood,
       n.created_at AS created_at,
       d.date       AS date
     FROM notes n
     JOIN days d ON d.id = n.day_id
     WHERE n.text LIKE ? ESCAPE '\\'
     ORDER BY d.date DESC, n.id DESC
     LIMIT ?;`,
    [pattern, limit]
  );
};

/**
 * Search tasks by title (pending and completed).
 * Returns rows: { id, title, start_date, completed_date, status }.
 */
export const searchTasks = (query, limit = SEARCH_DEFAULT_LIMIT) => {
  const q = String(query || '').trim();
  if (q.length < SEARCH_MIN_QUERY_LENGTH) return [];
  const db = getDB();
  const pattern = buildLikePattern(q);
  return db.getAllSync(
    `SELECT id, title, start_date, completed_date, status
     FROM tasks
     WHERE title LIKE ? ESCAPE '\\'
     ORDER BY start_date DESC, id DESC
     LIMIT ?;`,
    [pattern, limit]
  );
};

/**
 * Convenience wrapper — one call, three grouped result sets.
 * Returns { expenses: [], notes: [], tasks: [] }.
 */
export const searchAll = (query, limit = SEARCH_DEFAULT_LIMIT) => ({
  expenses: searchExpenses(query, limit),
  notes:    searchNotes(query, limit),
  tasks:    searchTasks(query, limit),
});

// ─── Recurring Expenses ───────────────────────────────────────────────────────

/** Format a JS Date as a local 'YYYY-MM-DD' string (no UTC shift). */
const toLocalISO = (d) => {
  const y  = d.getFullYear();
  const m  = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${dd}`;
};

/** Parse a 'YYYY-MM-DD' string into a local-midnight Date. */
const parseLocalISO = (s) => {
  const [y, m, d] = String(s).split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** Clamp a day-of-month into the safe 1..28 range. */
const clampDom = (n) => Math.min(28, Math.max(1, parseInt(n, 10) || 1));

/** Clamp a weekday into 0..6 (0 = Sunday, matching Date.getDay()). */
const clampDow = (n) => {
  const v = parseInt(n, 10);
  return Number.isNaN(v) ? 1 : ((v % 7) + 7) % 7;
};

/**
 * Given a due date string, return the NEXT occurrence strictly after it.
 * Monthly: same day-of-month next calendar month. day_of_month is capped at
 *   1..28 so new Date(y, m + 1, dom) can never roll over into the wrong month.
 * Weekly: exactly +7 days.
 */
const advanceDueDate = (dueDateStr, frequency, dayOfMonth, dayOfWeek) => {
  const d = parseLocalISO(dueDateStr);
  if (frequency === 'weekly') {
    d.setDate(d.getDate() + 7);
    return toLocalISO(d);
  }
  const dom = clampDom(dayOfMonth);
  return toLocalISO(new Date(d.getFullYear(), d.getMonth() + 1, dom));
};

/**
 * Compute the first due date for a brand-new / edited rule: the soonest date
 * that is today or later and matches the rule.
 */
export const computeFirstDueDate = (frequency, dayOfMonth, dayOfWeek, fromDateStr = null) => {
  const base = fromDateStr ? parseLocalISO(fromDateStr) : new Date();
  const from = new Date(base.getFullYear(), base.getMonth(), base.getDate());

  if (frequency === 'weekly') {
    const target = clampDow(dayOfWeek);
    const diff   = (target - from.getDay() + 7) % 7;
    const d      = new Date(from.getFullYear(), from.getMonth(), from.getDate() + diff);
    return toLocalISO(d);
  }

  const dom = clampDom(dayOfMonth);
  if (from.getDate() <= dom) {
    return toLocalISO(new Date(from.getFullYear(), from.getMonth(), dom));
  }
  return toLocalISO(new Date(from.getFullYear(), from.getMonth() + 1, dom));
};

/**
 * All recurring rules joined with category / item display info.
 * Active rules first, then by next_due_date.
 */
export const getAllRecurringExpenses = () => {
  const db = getDB();
  return db.getAllSync(
    `SELECT
       r.id             AS id,
       r.category_id    AS category_id,
       r.item_id        AS item_id,
       r.amount         AS amount,
       r.payment_type   AS payment_type,
       r.note           AS note,
       r.frequency      AS frequency,
       r.day_of_month   AS day_of_month,
       r.day_of_week    AS day_of_week,
       r.next_due_date  AS next_due_date,
       r.is_active      AS is_active,
       c.name           AS category_name,
       c.icon           AS category_icon,
       c.icon_type      AS category_icon_type,
       ci.name          AS item_name,
       ci.icon          AS item_icon,
       ci.icon_type     AS item_icon_type
     FROM recurring_expenses r
     JOIN categories c            ON c.id  = r.category_id
     LEFT JOIN category_items ci  ON ci.id = r.item_id
     ORDER BY r.is_active DESC, r.next_due_date ASC, r.id DESC;`
  );
};

/**
 * Create a recurring rule. next_due_date is derived automatically.
 * Returns the new row id.
 */
export const addRecurringExpense = ({
  categoryId,
  itemId       = null,
  amount,
  paymentType  = 'cash',
  note         = null,
  frequency    = 'monthly',
  dayOfMonth   = 1,
  dayOfWeek    = 1,
}) => {
  const db   = getDB();
  const freq = frequency === 'weekly' ? 'weekly' : 'monthly';
  const dom  = clampDom(dayOfMonth);
  const dow  = clampDow(dayOfWeek);
  const next = computeFirstDueDate(freq, dom, dow);

  db.runSync(
    `INSERT INTO recurring_expenses
       (category_id, item_id, amount, payment_type, note,
        frequency, day_of_month, day_of_week, next_due_date, is_active)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 1);`,
    [categoryId, itemId, Number(amount) || 0, paymentType, note, freq, dom, dow, next]
  );

  const row = db.getFirstSync('SELECT last_insert_rowid() AS id;');
  return row ? row.id : null;
};

/**
 * Update a recurring rule. Recomputes next_due_date from today so a changed
 * schedule takes effect immediately (never back-posts on edit).
 */
export const updateRecurringExpense = (id, {
  categoryId,
  itemId       = null,
  amount,
  paymentType  = 'cash',
  note         = null,
  frequency    = 'monthly',
  dayOfMonth   = 1,
  dayOfWeek    = 1,
}) => {
  const db   = getDB();
  const freq = frequency === 'weekly' ? 'weekly' : 'monthly';
  const dom  = clampDom(dayOfMonth);
  const dow  = clampDow(dayOfWeek);
  const next = computeFirstDueDate(freq, dom, dow);

  db.runSync(
    `UPDATE recurring_expenses SET
       category_id   = ?,
       item_id       = ?,
       amount        = ?,
       payment_type  = ?,
       note          = ?,
       frequency     = ?,
       day_of_month  = ?,
       day_of_week   = ?,
       next_due_date = ?
     WHERE id = ?;`,
    [categoryId, itemId, Number(amount) || 0, paymentType, note, freq, dom, dow, next, id]
  );
};

export const deleteRecurringExpense = (id) => {
  const db = getDB();
  db.runSync('DELETE FROM recurring_expenses WHERE id = ?;', [id]);
};

/**
 * Pause / resume. When resuming, next_due_date is pulled forward to the next
 * future occurrence so pausing for months does not cause a burst of backfill.
 * Returns the new is_active value (1 or 0).
 */
export const toggleRecurringExpenseActive = (id) => {
  const db  = getDB();
  const row = db.getFirstSync('SELECT * FROM recurring_expenses WHERE id = ?;', [id]);
  if (!row) return null;

  const nextActive = row.is_active ? 0 : 1;
  if (nextActive === 1) {
    const next = computeFirstDueDate(row.frequency, row.day_of_month, row.day_of_week);
    db.runSync(
      'UPDATE recurring_expenses SET is_active = 1, next_due_date = ? WHERE id = ?;',
      [next, id]
    );
  } else {
    db.runSync('UPDATE recurring_expenses SET is_active = 0 WHERE id = ?;', [id]);
  }
  return nextActive;
};

/**
 * Cold-start catch-up. For every ACTIVE rule whose next_due_date is today or
 * earlier, insert a real expense row on that historical date, recalculate that
 * day's balance, and advance next_due_date — repeating until the rule is in the
 * future (capped at MAX_CATCHUP_PER_RULE iterations as a runaway guard).
 *
 * Inserts into `expenses` DIRECTLY — setExpenseAmount is upsert-keyed on
 * (day, category, item, payment_type) and would overwrite instead of append.
 *
 * Returns { posted, rules } — number of expense rows created and rules touched.
 */
const MAX_CATCHUP_PER_RULE = 36;

export const processRecurringExpenses = () => {
  const db       = getDB();
  const todayStr = toLocalISO(new Date());
  let posted     = 0;
  let rulesHit   = 0;

  let rules = [];
  try {
    rules = db.getAllSync(
      `SELECT * FROM recurring_expenses
       WHERE is_active = 1 AND next_due_date <= ?
       ORDER BY id ASC;`,
      [todayStr]
    );
  } catch (_) {
    return { posted: 0, rules: 0 };
  }

  rules.forEach((rule) => {
    let due   = rule.next_due_date;
    let guard = 0;
    let any   = false;

    while (due <= todayStr && guard < MAX_CATCHUP_PER_RULE) {
      try {
        const day = getOrCreateDay(due);
        db.runSync(
          `INSERT INTO expenses
             (day_id, category_id, item_id, amount, payment_type, place_id, note)
           VALUES (?, ?, ?, ?, ?, NULL, ?);`,
          [
            day.id,
            rule.category_id,
            rule.item_id == null ? null : rule.item_id,
            Number(rule.amount) || 0,
            rule.payment_type || 'cash',
            rule.note == null ? null : rule.note,
          ]
        );
        recalculateBalance(day.id, due);
        posted += 1;
        any = true;
      } catch (e) {
        console.warn('Recurring post failed for rule', rule.id, due, e?.message || e);
      }

      due = advanceDueDate(due, rule.frequency, rule.day_of_month, rule.day_of_week);
      guard += 1;
    }

    if (guard >= MAX_CATCHUP_PER_RULE && due <= todayStr) {
      due = computeFirstDueDate(rule.frequency, rule.day_of_month, rule.day_of_week);
    }

    db.runSync('UPDATE recurring_expenses SET next_due_date = ? WHERE id = ?;', [due, rule.id]);
    if (any) rulesHit += 1;
  });

  return { posted, rules: rulesHit };
};
