import * as XLSX from "xlsx";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { getDB } from "../db/schema";

// ── Export to Excel (Enhanced) ────────────────────────────────────────────────
export const exportToExcel = async () => {
  const db = getDB();
  const wb = XLSX.utils.book_new();

  // 1. Summary Sheet - Easy overview for family
  const summary = db.getAllSync(`
    SELECT 
      d.date as Date,
      d.deposit_today as Deposited,
      COALESCE(SUM(CASE WHEN e.payment_type='cash' THEN e.amount ELSE 0 END), 0) as CashSpent,
      COALESCE(SUM(CASE WHEN e.payment_type='online' THEN e.amount ELSE 0 END), 0) as OnlineSpent,
      (d.deposit_today - COALESCE(SUM(CASE WHEN e.payment_type='cash' THEN e.amount ELSE 0 END), 0)) as Savings,
      d.closing_balance as ClosingBalance
    FROM days d
    LEFT JOIN expenses e ON e.day_id = d.id
    GROUP BY d.id
    ORDER BY d.date DESC;
  `);
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(summary),
    "Summary",
  );

  // 2. Detailed Expenses - With category names
  const expenses = db.getAllSync(`
    SELECT 
      d.date as Date,
      c.name as Category,
      c.icon as Icon,
      e.amount as Amount,
      e.payment_type as PaymentType,
      p.name as Place,
      e.note as Note
    FROM expenses e
    JOIN days d ON e.day_id = d.id
    JOIN categories c ON e.category_id = c.id
    LEFT JOIN places p ON e.place_id = p.id
    ORDER BY d.date DESC, c.name;
  `);
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(expenses),
    "Expenses",
  );

  // 3. Monthly Analytics
  const monthly = db.getAllSync(`
    SELECT 
      substr(d.date, 1, 7) as Month,
      SUM(d.deposit_today) as TotalDeposited,
      SUM(CASE WHEN e.payment_type='cash' THEN e.amount ELSE 0 END) as TotalCashSpent,
      SUM(CASE WHEN e.payment_type='online' THEN e.amount ELSE 0 END) as TotalOnlineSpent,
      (SUM(d.deposit_today) - SUM(CASE WHEN e.payment_type='cash' THEN e.amount ELSE 0 END)) as TotalSavings
    FROM days d
    LEFT JOIN expenses e ON e.day_id = d.id
    GROUP BY substr(d.date, 1, 7)
    ORDER BY Month DESC;
  `);
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(monthly),
    "Monthly",
  );

  // 4. Category Breakdown
  const categoryBreakdown = db.getAllSync(`
    SELECT 
      c.name as Category,
      c.icon as Icon,
      COUNT(DISTINCT d.id) as DaysUsed,
      SUM(e.amount) as TotalSpent,
      AVG(e.amount) as AvgPerTransaction,
      SUM(CASE WHEN e.payment_type='cash' THEN e.amount ELSE 0 END) as CashTotal,
      SUM(CASE WHEN e.payment_type='online' THEN e.amount ELSE 0 END) as OnlineTotal
    FROM categories c
    LEFT JOIN expenses e ON e.category_id = c.id
    LEFT JOIN days d ON e.day_id = d.id
    WHERE c.is_active = 1
    GROUP BY c.id
    HAVING TotalSpent > 0
    ORDER BY TotalSpent DESC;
  `);
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(categoryBreakdown),
    "Categories",
  );

  // 5. Tasks
  const tasks = db.getAllSync(`
    SELECT 
      title as Task,
      start_date as StartDate,
      completed_date as CompletedDate,
      status as Status
    FROM tasks
    ORDER BY start_date DESC;
  `);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(tasks), "Tasks");

  // 6. Notes
  const notes = db.getAllSync(`
    SELECT 
      d.date as Date,
      n.mood as Type,
      n.text as Note,
      n.created_at as CreatedAt
    FROM notes n
    JOIN days d ON n.day_id = d.id
    ORDER BY d.date DESC;
  `);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(notes), "Notes");

  // 7. Places
  const places = db.getAllSync(`
    SELECT 
      p.name as Place,
      p.icon as Icon,
      p.is_favorite as IsFavorite,
      COUNT(dp.id) as TimesVisited
    FROM places p
    LEFT JOIN day_places dp ON dp.place_id = p.id
    GROUP BY p.id
    ORDER BY TimesVisited DESC;
  `);
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(places), "Places");

  // 8. Raw Data (for backup/import)
  const rawDays = db.getAllSync("SELECT * FROM days ORDER BY date;");
  const rawExpenses = db.getAllSync("SELECT * FROM expenses ORDER BY day_id;");
  const rawCategories = db.getAllSync(
    "SELECT * FROM categories ORDER BY sort_order;",
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(rawDays),
    "_RawDays",
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(rawExpenses),
    "_RawExpenses",
  );
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(rawCategories),
    "_RawCategories",
  );

  const wbout = XLSX.write(wb, { type: "base64", bookType: "xlsx" });
  const timestamp = new Date().toISOString().split("T")[0];
  const fileName = `hisab_export_${timestamp}.xlsx`;
  const fileUri = FileSystem.documentDirectory + fileName;

  await FileSystem.writeAsStringAsync(fileUri, wbout, {
    encoding: FileSystem.EncodingType.Base64,
  });

  await Sharing.shareAsync(fileUri, {
    mimeType:
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    dialogTitle: "Export Rojnishi Data",
    UTI: "com.microsoft.excel.xlsx",
  });

  return fileName;
};

// ── Import from Excel ─────────────────────────────────────────────────────────
export const importFromExcel = async () => {
  const DocumentPicker = require("expo-document-picker");
  const result = await DocumentPicker.getDocumentAsync({
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    copyToCacheDirectory: true,
  });

  if (result.canceled) return null;

  const db = getDB();
  const fileContent = await FileSystem.readAsStringAsync(result.assets[0].uri, {
    encoding: FileSystem.EncodingType.Base64,
  });

  const wb = XLSX.read(fileContent, { type: "base64" });
  let imported = {
    days: 0,
    expenses: 0,
    tasks: 0,
    notes: 0,
    places: 0,
    categories: 0,
  };

  // Import from Raw sheets (for backup restore)
  if (wb.SheetNames.includes("_RawCategories")) {
    const categories = XLSX.utils.sheet_to_json(wb.Sheets["_RawCategories"]);
    categories.forEach((row) => {
      const exists = db.getFirstSync(
        "SELECT id FROM categories WHERE name = ?;",
        [row.name],
      );
      if (!exists) {
        db.runSync(
          "INSERT INTO categories (name, icon, sort_order, is_active) VALUES (?, ?, ?, ?);",
          [
            row.name,
            row.icon || "💰",
            row.sort_order || 99,
            row.is_active ?? 1,
          ],
        );
        imported.categories++;
      }
    });
  }

  if (wb.SheetNames.includes("_RawDays")) {
    const days = XLSX.utils.sheet_to_json(wb.Sheets["_RawDays"]);
    days.forEach((row) => {
      const exists = db.getFirstSync("SELECT id FROM days WHERE date = ?;", [
        row.date,
      ]);
      if (!exists) {
        db.runSync(
          "INSERT INTO days (date, deposit_today, closing_balance) VALUES (?, ?, ?);",
          [row.date, row.deposit_today || 0, row.closing_balance || 0],
        );
        imported.days++;
      }
    });
  }

  if (wb.SheetNames.includes("Places")) {
    const places = XLSX.utils.sheet_to_json(wb.Sheets["Places"]);
    places.forEach((row) => {
      const exists = db.getFirstSync(
        "SELECT id FROM places WHERE name = ? OR name = ?;",
        [row.name, row.Place],
      );
      if (!exists) {
        db.runSync(
          "INSERT INTO places (name, is_favorite, icon) VALUES (?, ?, ?);",
          [
            row.Place || row.name,
            row.IsFavorite || row.is_favorite || 0,
            row.Icon || row.icon || "📍",
          ],
        );
        imported.places++;
      }
    });
  }

  if (wb.SheetNames.includes("Tasks")) {
    const tasks = XLSX.utils.sheet_to_json(wb.Sheets["Tasks"]);
    tasks.forEach((row) => {
      const title = row.Task || row.title;
      const startDate = row.StartDate || row.start_date;
      const exists = db.getFirstSync(
        "SELECT id FROM tasks WHERE title = ? AND start_date = ?;",
        [title, startDate],
      );
      if (!exists) {
        db.runSync(
          "INSERT INTO tasks (title, start_date, completed_date, status) VALUES (?, ?, ?, ?);",
          [
            title,
            startDate,
            row.CompletedDate || row.completed_date || null,
            row.Status || row.status || "pending",
          ],
        );
        imported.tasks++;
      }
    });
  }

  if (wb.SheetNames.includes("_RawExpenses")) {
    const expenses = XLSX.utils.sheet_to_json(wb.Sheets["_RawExpenses"]);
    expenses.forEach((row) => {
      const dayExists = db.getFirstSync("SELECT id FROM days WHERE id = ?;", [
        row.day_id,
      ]);
      const catExists = db.getFirstSync(
        "SELECT id FROM categories WHERE id = ?;",
        [row.category_id],
      );
      if (dayExists && catExists) {
        db.runSync(
          "INSERT INTO expenses (day_id, category_id, amount, payment_type, place_id, note) VALUES (?, ?, ?, ?, ?, ?);",
          [
            row.day_id,
            row.category_id,
            row.amount || 0,
            row.payment_type || "cash",
            row.place_id || null,
            row.note || null,
          ],
        );
        imported.expenses++;
      }
    });
  }

  if (wb.SheetNames.includes("Notes")) {
    const notes = XLSX.utils.sheet_to_json(wb.Sheets["Notes"]);
    notes.forEach((row) => {
      const date = row.Date || row.date;
      const day = db.getFirstSync("SELECT id FROM days WHERE date = ?;", [
        date,
      ]);
      if (day) {
        db.runSync(
          "INSERT INTO notes (day_id, text, mood, created_at) VALUES (?, ?, ?, ?);",
          [
            day.id,
            row.Note || row.text,
            row.Type || row.mood || "other",
            row.CreatedAt || row.created_at || new Date().toISOString(),
          ],
        );
        imported.notes++;
      }
    });
  }

  return imported;
};
