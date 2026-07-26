import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { getDB } from '../db/schema';

// ── Export to JSON ────────────────────────────────────────────────────────────
export const exportToJSON = async () => {
  const db = getDB();
  
  const backup = {
    version: '1.0.0',
    exportDate: new Date().toISOString(),
    data: {
      days: db.getAllSync('SELECT * FROM days ORDER BY date;'),
      expenses: db.getAllSync('SELECT * FROM expenses ORDER BY day_id;'),
      tasks: db.getAllSync('SELECT * FROM tasks ORDER BY start_date;'),
      notes: db.getAllSync('SELECT * FROM notes ORDER BY day_id, created_at;'),
      places: db.getAllSync('SELECT * FROM places ORDER BY name;'),
      day_places: db.getAllSync('SELECT * FROM day_places ORDER BY day_id;'),
      categories: db.getAllSync('SELECT * FROM categories ORDER BY sort_order;'),
    }
  };

  const timestamp = new Date().toISOString().split('T')[0];
  const fileName = `hisab_backup_${timestamp}.json`;
  const fileUri = FileSystem.documentDirectory + fileName;

  await FileSystem.writeAsStringAsync(fileUri, JSON.stringify(backup, null, 2));
  await Sharing.shareAsync(fileUri, {
    mimeType: 'application/json',
    dialogTitle: 'Export Hisab Backup',
  });

  return fileName;
};

// ── Import from JSON ──────────────────────────────────────────────────────────
export const importFromJSON = async () => {
  const result = await DocumentPicker.getDocumentAsync({
    type: 'application/json',
    copyToCacheDirectory: true,
  });

  if (result.canceled) return null;

  const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri);
  const backup = JSON.parse(fileContent);

  if (!backup.data) throw new Error('Invalid backup file format');

  const db = getDB();
  let imported = { days: 0, expenses: 0, tasks: 0, notes: 0, places: 0, categories: 0 };

  // Import Categories (skip duplicates by name)
  backup.data.categories?.forEach(row => {
    const exists = db.getFirstSync('SELECT id FROM categories WHERE name = ?;', [row.name]);
    if (!exists) {
      db.runSync(
        'INSERT INTO categories (name, icon, sort_order, is_active) VALUES (?, ?, ?, ?);',
        [row.name, row.icon || '💰', row.sort_order || 99, row.is_active ?? 1]
      );
      imported.categories++;
    }
  });

  // Import Days (skip duplicates by date)
  backup.data.days?.forEach(row => {
    const exists = db.getFirstSync('SELECT id FROM days WHERE date = ?;', [row.date]);
    if (!exists) {
      db.runSync(
        'INSERT INTO days (date, deposit_today, closing_balance) VALUES (?, ?, ?);',
        [row.date, row.deposit_today || 0, row.closing_balance || 0]
      );
      imported.days++;
    }
  });

  // Import Places (skip duplicates by name)
  backup.data.places?.forEach(row => {
    const exists = db.getFirstSync('SELECT id FROM places WHERE name = ?;', [row.name]);
    if (!exists) {
      db.runSync(
        'INSERT INTO places (name, is_favorite, icon) VALUES (?, ?, ?);',
        [row.name, row.is_favorite || 0, row.icon || '📍']
      );
      imported.places++;
    }
  });

  // Import Tasks (skip duplicates by title + start_date)
  backup.data.tasks?.forEach(row => {
    const exists = db.getFirstSync(
      'SELECT id FROM tasks WHERE title = ? AND start_date = ?;',
      [row.title, row.start_date]
    );
    if (!exists) {
      db.runSync(
        'INSERT INTO tasks (title, start_date, completed_date, status) VALUES (?, ?, ?, ?);',
        [row.title, row.start_date, row.completed_date || null, row.status || 'pending']
      );
      imported.tasks++;
    }
  });

  // Import Expenses (always import if day and category exist)
  backup.data.expenses?.forEach(row => {
    const dayExists = db.getFirstSync('SELECT id FROM days WHERE id = ?;', [row.day_id]);
    const catExists = db.getFirstSync('SELECT id FROM categories WHERE id = ?;', [row.category_id]);
    if (dayExists && catExists) {
      db.runSync(
        'INSERT INTO expenses (day_id, category_id, amount, payment_type, place_id, note) VALUES (?, ?, ?, ?, ?, ?);',
        [row.day_id, row.category_id, row.amount || 0, row.payment_type || 'cash', row.place_id || null, row.note || null]
      );
      imported.expenses++;
    }
  });

  // Import Notes (always import if day exists)
  backup.data.notes?.forEach(row => {
    const dayExists = db.getFirstSync('SELECT id FROM days WHERE id = ?;', [row.day_id]);
    if (dayExists) {
      db.runSync(
        'INSERT INTO notes (day_id, text, mood, created_at) VALUES (?, ?, ?, ?);',
        [row.day_id, row.text, row.mood || 'other', row.created_at || new Date().toISOString()]
      );
      imported.notes++;
    }
  });

  // Import Day Places (always import if both exist)
  backup.data.day_places?.forEach(row => {
    const dayExists = db.getFirstSync('SELECT id FROM days WHERE id = ?;', [row.day_id]);
    const placeExists = db.getFirstSync('SELECT id FROM places WHERE id = ?;', [row.place_id]);
    if (dayExists && placeExists) {
      const exists = db.getFirstSync(
        'SELECT id FROM day_places WHERE day_id = ? AND place_id = ?;',
        [row.day_id, row.place_id]
      );
      if (!exists) {
        db.runSync(
          'INSERT INTO day_places (day_id, place_id) VALUES (?, ?);',
          [row.day_id, row.place_id]
        );
      }
    }
  });

  return imported;
};
