import * as SQLite from 'expo-sqlite';
import { Platform } from 'react-native';
import { DEFAULT_CATEGORIES } from '../constants/defaultCategories';

let db = null;
let webDB = null;

// Web SQL.js wrapper
const initWebDB = async () => {
  if (webDB) return webDB;
  
  try {
    const initSqlJs = require('sql.js');
    const SQL = await initSqlJs({
      locateFile: file => `https://sql.js.org/dist/${file}`
    });
    
    // Try to load from localStorage
    const saved = localStorage.getItem('hisab_db');
    if (saved) {
      const arr = new Uint8Array(JSON.parse(saved));
      webDB = new SQL.Database(arr);
    } else {
      webDB = new SQL.Database();
    }
    
    // Save to localStorage on changes
    const saveDB = () => {
      const data = webDB.export();
      localStorage.setItem('hisab_db', JSON.stringify(Array.from(data)));
    };
    
    return {
      execSync: (sql) => { webDB.run(sql); saveDB(); },
      runSync: (sql, params) => { webDB.run(sql, params); saveDB(); },
      getFirstSync: (sql, params) => {
        const result = webDB.exec(sql, params);
        if (!result[0]) return null;
        const cols = result[0].columns;
        const vals = result[0].values[0];
        if (!vals) return null;
        const obj = {};
        cols.forEach((col, i) => obj[col] = vals[i]);
        return obj;
      },
      getAllSync: (sql, params) => {
        const result = webDB.exec(sql, params);
        if (!result[0]) return [];
        const cols = result[0].columns;
        return result[0].values.map(vals => {
          const obj = {};
          cols.forEach((col, i) => obj[col] = vals[i]);
          return obj;
        });
      },
    };
  } catch (e) {
    console.error('Web DB init failed:', e);
    throw e;
  }
};

export const getDB = () => {
  if (Platform.OS === 'web') {
    if (!db) {
      throw new Error('Web DB not initialized. Call initializeDatabase first.');
    }
    return db;
  }
  
  if (!db) {
    db = SQLite.openDatabaseSync('hisab.db');
  }
  return db;
};

// ─── Schema ─────────────────────────────────────────────────────────────────

export const initializeDatabase = async () => {
  if (Platform.OS === 'web') {
    db = await initWebDB();
  }
  
  const database = getDB();

  // Days table — one row per active day
  database.execSync(`
    CREATE TABLE IF NOT EXISTS days (
      id               INTEGER PRIMARY KEY AUTOINCREMENT,
      date             TEXT    NOT NULL UNIQUE,
      deposit_today    REAL    NOT NULL DEFAULT 0,
      closing_balance  REAL    NOT NULL DEFAULT 0
    );
  `);

  // Categories — editable by user
  database.execSync(`
    CREATE TABLE IF NOT EXISTS categories (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      name        TEXT    NOT NULL,
      icon        TEXT    NOT NULL DEFAULT '💰',
      icon_type   TEXT    NOT NULL DEFAULT 'emoji',
      sort_order  INTEGER NOT NULL DEFAULT 99,
      is_active   INTEGER NOT NULL DEFAULT 1
    );
  `);

  // Expenses — core transaction records
  database.execSync(`
    CREATE TABLE IF NOT EXISTS expenses (
      id            INTEGER PRIMARY KEY AUTOINCREMENT,
      day_id        INTEGER NOT NULL,
      category_id   INTEGER NOT NULL,
      item_id       INTEGER,
      amount        REAL    NOT NULL DEFAULT 0,
      payment_type  TEXT    NOT NULL DEFAULT 'cash',
      place_id      INTEGER,
      note          TEXT,
      FOREIGN KEY (day_id)      REFERENCES days(id)       ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id),
      FOREIGN KEY (item_id)     REFERENCES category_items(id),
      FOREIGN KEY (place_id)    REFERENCES places(id)
    );
  `);

  // Places — saved locations
  database.execSync(`
    CREATE TABLE IF NOT EXISTS places (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      name         TEXT    NOT NULL,
      is_favorite  INTEGER NOT NULL DEFAULT 0
    );
  `);

  // Day → Places — which places were visited on a given day
  database.execSync(`
    CREATE TABLE IF NOT EXISTS day_places (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      day_id    INTEGER NOT NULL,
      place_id  INTEGER NOT NULL,
      FOREIGN KEY (day_id)   REFERENCES days(id)   ON DELETE CASCADE,
      FOREIGN KEY (place_id) REFERENCES places(id) ON DELETE CASCADE,
      UNIQUE (day_id, place_id)
    );
  `);

  // Notes — daily memory entries
  database.execSync(`
    CREATE TABLE IF NOT EXISTS notes (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      day_id      INTEGER NOT NULL,
      text        TEXT    NOT NULL,
      mood        TEXT    NOT NULL DEFAULT 'other',
      created_at  TEXT    NOT NULL DEFAULT (datetime('now','localtime')),
      FOREIGN KEY (day_id) REFERENCES days(id) ON DELETE CASCADE
    );
  `);

  // Places — add icon column if missing (safe migration)
  try { database.execSync(`ALTER TABLE places ADD COLUMN icon TEXT NOT NULL DEFAULT '📍';`); } catch (_) {}

  // Notes — add mood column if missing (safe migration for existing DBs)
  try { database.execSync(`ALTER TABLE notes ADD COLUMN mood TEXT NOT NULL DEFAULT 'other';`); } catch (_) {}

  // Expenses — add item_id column if missing
  try { database.execSync(`ALTER TABLE expenses ADD COLUMN item_id INTEGER;`); } catch (_) {}

  // Categories — add icon_type column if missing
  try { database.execSync(`ALTER TABLE categories ADD COLUMN icon_type TEXT NOT NULL DEFAULT 'emoji';`); } catch (_) {}

  // Category Items — add icon_type column if missing
  try { database.execSync(`ALTER TABLE category_items ADD COLUMN icon_type TEXT NOT NULL DEFAULT 'emoji';`); } catch (_) {}

  // Tasks — with start date, no end until completed
  database.execSync(`
    CREATE TABLE IF NOT EXISTS tasks (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      title           TEXT    NOT NULL,
      start_date      TEXT    NOT NULL,
      completed_date  TEXT,
      status          TEXT    NOT NULL DEFAULT 'pending'
    );
  `);

  // Category Items — items under each category (e.g., rice, wheat under grains)
  database.execSync(`
    CREATE TABLE IF NOT EXISTS category_items (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id     INTEGER NOT NULL,
      name            TEXT    NOT NULL,
      icon            TEXT    NOT NULL DEFAULT '📦',
      icon_type       TEXT    NOT NULL DEFAULT 'emoji',
      is_active       INTEGER NOT NULL DEFAULT 1,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );
  `);

  // Vehicle Records — bike mileage tracking
  database.execSync(`
    CREATE TABLE IF NOT EXISTS vehicle_records (
      id              INTEGER PRIMARY KEY AUTOINCREMENT,
      date            TEXT    NOT NULL,
      reading         INTEGER NOT NULL,
      liters          REAL    NOT NULL,
      price_per_liter REAL    NOT NULL,
      amount          REAL    NOT NULL,
      payment_type    TEXT    NOT NULL DEFAULT 'online',
      created_at      TEXT    NOT NULL DEFAULT (datetime('now','localtime'))
    );
  `);

  // Seed default categories only if table is empty
  const count = database.getFirstSync('SELECT COUNT(*) as cnt FROM categories;');
  if (count.cnt === 0) {
    DEFAULT_CATEGORIES.forEach(cat => {
      database.runSync(
        'INSERT INTO categories (name, icon, sort_order) VALUES (?, ?, ?);',
        [cat.name, cat.icon, cat.sort_order]
      );
    });
  }
};
