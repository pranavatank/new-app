import * as XLSX from "xlsx";
import * as FileSystem from "expo-file-system";
import * as Sharing from "expo-sharing";
import { getDB } from "../db/schema";

// Export to Excel with analytics and raw data.
export const exportToExcel = async () => {
  const db = getDB();
  const wb = XLSX.utils.book_new();

  // 1. Summary Sheet - Easy overview for family
  const summary = db.getAllSync(`
    SELECT 
      d.date as Date,
      d.deposit_today as Deposited,
      COALESCE((SELECT SUM(amount) FROM expenses WHERE day_id=d.id AND payment_type='cash'), 0) as CashSpent,
      COALESCE((SELECT SUM(amount) FROM expenses WHERE day_id=d.id AND payment_type='online'), 0) as OnlineSpent,
      COALESCE((SELECT SUM(amount * CASE direction WHEN 'in' THEN 1 ELSE -1 END) FROM ledger_movements WHERE day_id=d.id AND kind='receipt'),0) as Receipts,
      COALESCE((SELECT SUM(amount * CASE direction WHEN 'in' THEN 1 ELSE -1 END) FROM ledger_movements WHERE day_id=d.id AND kind='transfer'),0) as TransferNet,
      (d.deposit_today + COALESCE((SELECT SUM(amount * CASE direction WHEN 'in' THEN 1 ELSE -1 END) FROM ledger_movements WHERE day_id=d.id AND kind='receipt'),0) - COALESCE((SELECT SUM(amount) FROM expenses WHERE day_id=d.id AND payment_type='cash'),0) - COALESCE((SELECT SUM(amount) FROM expenses WHERE day_id=d.id AND payment_type='online'),0)) as ReceiptsLessSpending,
      d.closing_balance as ClosingBalance
    FROM days d ORDER BY d.date DESC;
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
      SUM((SELECT COALESCE(SUM(amount),0) FROM expenses WHERE day_id=d.id AND payment_type='cash')) as TotalCashSpent,
      SUM((SELECT COALESCE(SUM(amount),0) FROM expenses WHERE day_id=d.id AND payment_type='online')) as TotalOnlineSpent,
      SUM((SELECT COALESCE(SUM(amount * CASE direction WHEN 'in' THEN 1 ELSE -1 END),0) FROM ledger_movements WHERE day_id=d.id AND kind='receipt')) as Receipts,
      SUM((SELECT COALESCE(SUM(amount * CASE direction WHEN 'in' THEN 1 ELSE -1 END),0) FROM ledger_movements WHERE day_id=d.id AND kind='transfer')) as TransferNet,
      SUM(d.deposit_today + (SELECT COALESCE(SUM(amount * CASE direction WHEN 'in' THEN 1 ELSE -1 END),0) FROM ledger_movements WHERE day_id=d.id AND kind='receipt') - (SELECT COALESCE(SUM(amount),0) FROM expenses WHERE day_id=d.id AND payment_type='cash') - (SELECT COALESCE(SUM(amount),0) FROM expenses WHERE day_id=d.id AND payment_type='online')) as ReceiptsLessSpending
    FROM days d
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

  const movements = db.getAllSync(`SELECT d.date as Date,m.kind as Kind,m.amount as Amount,m.direction as Direction,m.note as Note,m.id as Id FROM ledger_movements m JOIN days d ON d.id=m.day_id ORDER BY d.date,m.id;`);
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(movements),"Movements");
  const purchases = db.getAllSync('SELECT * FROM purchases ORDER BY date,id;');
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(purchases),"Purchases");

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
  const rawPlaces = db.getAllSync('SELECT * FROM places ORDER BY id;');
  const rawItems = db.getAllSync('SELECT * FROM category_items ORDER BY id;');
  const rawMovements = db.getAllSync('SELECT * FROM ledger_movements ORDER BY id;');
  const rawPurchases = db.getAllSync('SELECT * FROM purchases ORDER BY id;');
  XLSX.utils.book_append_sheet(
    wb,
    XLSX.utils.json_to_sheet(rawDays),
    "_RawDays",
  );
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rawMovements),"_RawMovements");
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rawPurchases),"_RawPurchases");
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rawPlaces),"_RawPlaces");
  XLSX.utils.book_append_sheet(wb,XLSX.utils.json_to_sheet(rawItems),"_RawItems");
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

// Import from Excel as a duplicate-safe merge.
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
  db.execSync('BEGIN TRANSACTION;');
  try {
  let imported = {
    days: 0,
    expenses: 0,
    tasks: 0,
    notes: 0,
    places: 0,
    categories: 0,
    movements: 0,
    purchases: 0,
  };
  const sourceCategoryRows = wb.SheetNames.includes("_RawCategories") ? XLSX.utils.sheet_to_json(wb.Sheets["_RawCategories"]) : [];
  const sourceDayRows = wb.SheetNames.includes("_RawDays") ? XLSX.utils.sheet_to_json(wb.Sheets["_RawDays"]) : [];
  const sourcePlaceRows = wb.SheetNames.includes("_RawPlaces") ? XLSX.utils.sheet_to_json(wb.Sheets["_RawPlaces"]) : [];
  const sourceItemRows = wb.SheetNames.includes("_RawItems") ? XLSX.utils.sheet_to_json(wb.Sheets["_RawItems"]) : [];
  const resolveDayId = (sourceId) => {
    const source = sourceDayRows.find((row) => Number(row.id) === Number(sourceId));
    if (source?.date) return db.getFirstSync("SELECT id FROM days WHERE date=?;", [source.date])?.id;
    return db.getFirstSync("SELECT id FROM days WHERE id=?;", [sourceId])?.id;
  };
  const resolveCategoryId = (sourceId) => {
    const source = sourceCategoryRows.find((row) => Number(row.id) === Number(sourceId));
    if (source?.name) return db.getFirstSync("SELECT id FROM categories WHERE name=?;", [source.name])?.id;
    return db.getFirstSync("SELECT id FROM categories WHERE id=?;", [sourceId])?.id;
  };
  const resolvePlaceId = (sourceId) => {
    const source=sourcePlaceRows.find(row=>Number(row.id)===Number(sourceId));
    if(source?.name) return db.getFirstSync('SELECT id FROM places WHERE name=?;',[source.name])?.id;
    return db.getFirstSync('SELECT id FROM places WHERE id=?;',[sourceId])?.id;
  };
  const resolveItemId = (sourceId) => {
    const source=sourceItemRows.find(row=>Number(row.id)===Number(sourceId));
    if(source) {
      const category=resolveCategoryId(source.category_id);
      return db.getFirstSync('SELECT id FROM category_items WHERE category_id=? AND name=?;',[category,source.name])?.id;
    }
    return db.getFirstSync('SELECT id FROM category_items WHERE id=?;',[sourceId])?.id;
  };

  // Import from Raw sheets (for backup restore)
  if (wb.SheetNames.includes("_RawCategories")) {
    sourceCategoryRows.forEach((row) => {
      const exists = db.getFirstSync(
        "SELECT id FROM categories WHERE name = ?;",
        [row.name],
      );
      if (!exists) {
        db.runSync(
          "INSERT INTO categories (id, name, icon, sort_order, is_active) VALUES (?, ?, ?, ?, ?);",
          [
            db.getFirstSync("SELECT id FROM categories WHERE id=?;", [row.id]) ? null : row.id,
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
    sourceDayRows.forEach((row) => {
      const exists = db.getFirstSync("SELECT id FROM days WHERE date = ?;", [
        row.date,
      ]);
      if (!exists) {
        db.runSync(
          "INSERT INTO days (id, date, deposit_today, closing_balance) VALUES (?, ?, ?, ?);",
          [db.getFirstSync("SELECT id FROM days WHERE id=?;", [row.id]) ? null : row.id, row.date, row.deposit_today || 0, row.closing_balance || 0],
        );
        imported.days++;
      }
    });
  }

  if (wb.SheetNames.includes("Places")) {
    const places = XLSX.utils.sheet_to_json(wb.Sheets["Places"]);
    places.forEach((row) => {
      const name=row.name||row.Place;
      if (!name) return;
      const exists = db.getFirstSync(
        "SELECT id FROM places WHERE name = ? OR name = ?;",
        [name, name],
      );
      if (!exists) {
        db.runSync(
          "INSERT INTO places (name, is_favorite, icon) VALUES (?, ?, ?);",
          [
            name,
            row.IsFavorite || row.is_favorite || 0,
            row.Icon || row.icon || "📍",
          ],
        );
        imported.places++;
      }
    });
  }

  for (const row of sourcePlaceRows) {
    const exists=db.getFirstSync("SELECT id FROM places WHERE name=?;",[row.name]);
    if (!exists) db.runSync('INSERT INTO places(id,name,is_favorite,icon,icon_type) VALUES(?,?,?,?,?);',
      [db.getFirstSync('SELECT id FROM places WHERE id=?;',[row.id])?null:row.id,row.name,row.is_favorite||0,row.icon||'📍',row.icon_type||'emoji']);
  }
  for (const row of sourceItemRows) {
    const categoryId=resolveCategoryId(row.category_id);
    if (!categoryId || db.getFirstSync('SELECT id FROM category_items WHERE category_id=? AND name=?;',[categoryId,row.name])) continue;
    db.runSync('INSERT INTO category_items(id,category_id,name,icon,icon_type,is_active) VALUES(?,?,?,?,?,?);',
      [db.getFirstSync('SELECT id FROM category_items WHERE id=?;',[row.id])?null:row.id,categoryId,row.name,row.icon||'📦',row.icon_type||'emoji',row.is_active??1]);
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
    const matchedExpenseIds=new Set();
    expenses.forEach((row) => {
      const dayId = resolveDayId(row.day_id), categoryId = resolveCategoryId(row.category_id);
      const itemId=row.item_id ? (resolveItemId(row.item_id) ?? null) : null;
      const placeId=row.place_id ? (resolvePlaceId(row.place_id) ?? null) : null;
      if (dayId && categoryId) {
        const existing=db.getFirstSync("SELECT * FROM expenses WHERE id=?;",[row.id]);
        const matches=db.getAllSync("SELECT id FROM expenses WHERE day_id=? AND category_id=? AND item_id IS ? AND amount=? AND payment_type=? AND place_id IS ? AND COALESCE(note,'')=COALESCE(?,'') AND origin=? AND created_at IS ? ORDER BY id;",
          [dayId,categoryId,itemId,row.amount||0,row.payment_type||'cash',placeId,row.note||null,row.origin||'legacy',row.created_at||null]);
        const same=matches.find(match=>!matchedExpenseIds.has(Number(match.id)));
        if (same) { matchedExpenseIds.add(Number(same.id)); return; }
        const hasId=!existing;
        db.runSync(
          `INSERT INTO expenses (${hasId?'id, ':''}day_id, category_id, item_id, amount, payment_type, place_id, note, origin, created_at) VALUES (${hasId?'?, ':''}?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [...(hasId?[row.id]:[]),dayId,categoryId,itemId,row.amount||0,row.payment_type||'cash',placeId,row.note||null,row.origin||'legacy',row.created_at||null],
        );
        matchedExpenseIds.add(Number(db.getFirstSync('SELECT last_insert_rowid() id;').id));
        imported.expenses++;
      }
    });
  }

  if (wb.SheetNames.includes("_RawMovements")) {
    const matchedMovementIds=new Set();
    for (const row of XLSX.utils.sheet_to_json(wb.Sheets["_RawMovements"])) {
      const dayId=resolveDayId(row.day_id);
      if (!dayId) continue;
      const existing=db.getFirstSync('SELECT * FROM ledger_movements WHERE id=?;',[row.id]);
      const matches=db.getAllSync('SELECT id FROM ledger_movements WHERE day_id=? AND kind=? AND amount=? AND direction=? AND note=? AND created_at IS ? ORDER BY id;',[dayId,row.kind,row.amount,row.direction,row.note||'',row.created_at||null]);
      const same=matches.find(match=>!matchedMovementIds.has(Number(match.id)));
      if(same) { matchedMovementIds.add(Number(same.id)); continue; }
      db.runSync(`INSERT INTO ledger_movements(${existing?'':'id,'}day_id,kind,amount,direction,note,created_at) VALUES(${existing?'':'?,'}?,?,?,?,?,?);`,
        [...(existing?[]:[row.id]),dayId,row.kind,row.amount,row.direction,row.note||'',row.created_at||null]);
      matchedMovementIds.add(Number(db.getFirstSync('SELECT last_insert_rowid() id;').id));
      imported.movements++;
    }
  }
  if (wb.SheetNames.includes("_RawPurchases")) {
    const matchedPurchaseIds=new Set();
    for (const row of XLSX.utils.sheet_to_json(wb.Sheets["_RawPurchases"])) {
      const existing=db.getFirstSync('SELECT * FROM purchases WHERE id=?;',[row.id]);
      const matches=db.getAllSync('SELECT id FROM purchases WHERE name=? AND date=? AND amount IS ? AND shop=? AND details=? AND image_uri IS ? AND category=? ORDER BY id;',[row.name,row.date,row.amount??null,row.shop||'',row.details||'',row.image_uri||null,row.category||'']);
      const same=matches.find(match=>!matchedPurchaseIds.has(Number(match.id)));
      if(same) { matchedPurchaseIds.add(Number(same.id)); continue; }
      db.runSync(`INSERT INTO purchases(${existing?'':'id,'}name,date,amount,shop,details,image_uri,category) VALUES(${existing?'':'?,'}?,?,?,?,?,?,?);`,
        [...(existing?[]:[row.id]),row.name,row.date,row.amount??null,row.shop||'',row.details||'',row.image_uri||null,row.category||'']);
      matchedPurchaseIds.add(Number(db.getFirstSync('SELECT last_insert_rowid() id;').id));
      imported.purchases++;
    }
  }

  if (wb.SheetNames.includes("Notes")) {
    const notes = XLSX.utils.sheet_to_json(wb.Sheets["Notes"]);
    const matchedNoteIds=new Set();
    notes.forEach((row) => {
      const date = row.Date || row.date;
      const day = db.getFirstSync("SELECT id FROM days WHERE date = ?;", [
        date,
      ]);
      if (day) {
        const text=row.Note||row.text, mood=row.Type||row.mood||'other', createdAt=row.CreatedAt||row.created_at||new Date().toISOString();
        const duplicates=db.getAllSync('SELECT id FROM notes WHERE day_id=? AND text=? AND mood=? AND created_at=? ORDER BY id;', [day.id,text,mood,createdAt]);
        const duplicate=duplicates.find(item=>!matchedNoteIds.has(Number(item.id)));
        if (duplicate) matchedNoteIds.add(Number(duplicate.id));
        if (duplicate) return;
        db.runSync(
          "INSERT INTO notes (day_id, text, mood, created_at) VALUES (?, ?, ?, ?);",
          [
            day.id,
            text,
            mood,
            createdAt,
          ],
        );
        matchedNoteIds.add(Number(db.getFirstSync('SELECT last_insert_rowid() id;').id));
        imported.notes++;
      }
    });
  }

  if (imported.days || imported.expenses || imported.movements) {
    let closing=0;
    for (const day of db.getAllSync('SELECT id,deposit_today FROM days ORDER BY date;')) {
      const cash=db.getFirstSync("SELECT COALESCE(SUM(amount),0) total FROM expenses WHERE day_id=? AND payment_type='cash';",[day.id]).total;
      const receipts=db.getFirstSync("SELECT COALESCE(SUM(amount*CASE direction WHEN 'in' THEN 1 ELSE -1 END),0) total FROM ledger_movements WHERE day_id=? AND kind='receipt';",[day.id]).total;
      const transfers=db.getFirstSync("SELECT COALESCE(SUM(amount*CASE direction WHEN 'in' THEN 1 ELSE -1 END),0) total FROM ledger_movements WHERE day_id=? AND kind='transfer';",[day.id]).total;
      closing+=day.deposit_today+receipts+transfers-cash;
      db.runSync('UPDATE days SET closing_balance=? WHERE id=?;',[closing,day.id]);
    }
  }

  db.execSync('COMMIT;');
  return imported;
  } catch (error) {
    try { db.execSync('ROLLBACK;'); } catch (_) {}
    throw error;
  }
};
