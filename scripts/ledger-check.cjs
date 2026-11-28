const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const babel = require('@babel/core');
const initSqlJs = require('sql.js');

(async () => {
  const SQL = await initSqlJs();
  const raw = new SQL.Database();
  let spreadsheetContent='';
  let printedHtml='';
  const db = {
    execSync(sql) { raw.run(sql); },
    runSync(sql, params=[]) { raw.run(sql,params); },
    getFirstSync(sql, params=[]) {
      const stmt=raw.prepare(sql,params);
      try { return stmt.step() ? stmt.getAsObject() : null; } finally { stmt.free(); }
    },
    getAllSync(sql, params=[]) {
      const stmt=raw.prepare(sql,params), rows=[];
      try { while(stmt.step()) rows.push(stmt.getAsObject()); return rows; } finally { stmt.free(); }
    },
  };
  const cache = new Map();
  const mockRequire = (specifier, fromFile) => {
    if (specifier === 'expo-sqlite') return { openDatabaseSync: () => db };
    if (specifier === 'react-native') return { Platform: { OS: 'android' } };
    if (specifier === 'expo-file-system') return { EncodingType:{Base64:'base64'},documentDirectory:'memory://',async makeDirectoryAsync(){},async writeAsStringAsync(uri,data){if(String(uri).endsWith('.xlsx')) spreadsheetContent=data;},async readAsStringAsync(){return spreadsheetContent} };
    if (specifier === 'expo-sharing') return { async shareAsync(){} };
    if (specifier === 'expo-print') return { async printToFileAsync({html}){printedHtml=html;return {uri:'memory://report.pdf'}} };
    if (specifier === 'expo-document-picker') return { async getDocumentAsync(){return {canceled:false,assets:[{uri:'memory://synthetic.xlsx'}]}} };
    if (specifier.includes('defaultCategories')) return { DEFAULT_CATEGORIES: [{name:'Food',icon:'🍲',sort_order:1}] };
    if (!specifier.startsWith('.')) return require(specifier);
    const target = path.resolve(path.dirname(fromFile),specifier) + (path.extname(specifier) ? '' : '.js');
    return loadModule(target);
  };
  const loadModule = (filename) => {
    if(cache.has(filename)) return cache.get(filename).exports;
    const out = babel.transformFileSync(filename, {
      babelrc: false,
      configFile: false,
      plugins: ['@babel/plugin-transform-modules-commonjs'],
    }).code;
    const mod={exports:{}};
    cache.set(filename,mod);
    const localRequire=(id)=>mockRequire(id,filename);
    vm.runInThisContext('(function(require,module,exports,__filename,__dirname){'+out+'\n})',{filename})(localRequire,mod,mod.exports,filename,path.dirname(filename));
    return mod.exports;
  };
  const root=path.resolve(__dirname,'..');
  const {initializeDatabase}=loadModule(path.join(root,'src/db/schema.js'));
  const queries=loadModule(path.join(root,'src/db/queries.js'));
  const ledger=loadModule(path.join(root,'src/db/ledger.js'));
  const { getDayOverview } = loadModule(path.join(root, 'src/db/dayOverview.js'));
  const { getOdometerNeighbors } = loadModule(path.join(root, 'src/utils/vehicleRecords.js'));
  const backup=loadModule(path.join(root,'src/services/backupService.js'));
  const excel=loadModule(path.join(root,'src/services/excelService.js'));
  const pdf=loadModule(path.join(root,'src/services/pdfService.js'));

  await initializeDatabase();
  const category=db.getFirstSync("SELECT id FROM categories WHERE name='Food'").id;
  db.runSync("INSERT INTO categories(name,icon,sort_order,is_active) VALUES('Other test','📍',99,1);");
  const alternateCategory=db.getFirstSync("SELECT last_insert_rowid() id;").id;
  queries.setCategoryOrder([alternateCategory, category]);
  assert.deepEqual(queries.getAllCategories().map(row => row.id), [alternateCategory, category]);
  const writeCategoryOrder = db.runSync;
  db.runSync = (sql, params) => {
    if (sql.startsWith('UPDATE categories SET sort_order') && params[1] === alternateCategory) {
      throw new Error('synthetic category order failure');
    }
    return writeCategoryOrder(sql, params);
  };
  try {
    assert.throws(() => queries.setCategoryOrder([category, alternateCategory]), /synthetic category order failure/);
  } finally {
    db.runSync = writeCategoryOrder;
  }
  assert.deepEqual(queries.getAllCategories().map(row => row.id), [alternateCategory, category], 'partial reorder rolls back');
  queries.setCategoryOrder([category, alternateCategory]);
  db.runSync("INSERT INTO category_items(category_id,name,icon,icon_type) VALUES(?,?,?,?);",[category,'Tomato','🍅','emoji']);
  const tomato=db.getFirstSync("SELECT last_insert_rowid() id;").id;
  db.runSync("INSERT INTO category_items(category_id,name,icon,icon_type) VALUES(?,?,?,?);",[category,'Brinjal','🍆','emoji']);
  const brinjal=db.getFirstSync("SELECT last_insert_rowid() id;").id;
  const itemIds=ledger.saveExpenseBatch({date:'2026-11-05',categoryId:category,paymentType:'online',note:'market',items:[{itemId:tomato,amount:12},{itemId:brinjal,amount:8}]});
  assert.equal(itemIds.length,2,'batch appends one expense per item');
  assert.equal(db.getFirstSync("SELECT SUM(amount) total FROM expenses e JOIN days d ON d.id=e.day_id WHERE d.date='2026-11-05';").total,20,'item batch preserves aggregate amount');
  const itemEntries=ledger.getDayLedger('2026-11-05').entries.filter(x=>x.kind==='expense');
  assert.deepEqual(itemEntries.map(x=>[x.item_name,x.item_icon,x.item_icon_type]),[['Tomato','🍅','emoji'],['Brinjal','🍆','emoji']],'ledger projects expense item metadata');
  const shoppingDay = ledger.getMonthLedger(2026, 11).days.find(day => day.date === '2026-11-05');
  assert.deepEqual(shoppingDay.entries.map(entry => entry.item_name), ['Tomato', 'Brinjal']);
  ledger.saveExpense({id:itemIds[0],date:'2026-11-05',categoryId:category,amount:13});
  assert.equal(db.getFirstSync('SELECT item_id FROM expenses WHERE id=?;',[itemIds[0]]).item_id,tomato,'omitted itemId preserves item on edit');
  assert.throws(()=>ledger.saveExpense({id:itemIds[0],date:'2026-11-05',categoryId:alternateCategory,amount:13}),/Item must belong/,'category changes cannot retain a mismatched item');
  ledger.saveExpense({id:itemIds[0],date:'2026-11-05',categoryId:category,amount:13,itemId:null});
  assert.equal(db.getFirstSync('SELECT item_id FROM expenses WHERE id=?;',[itemIds[0]]).item_id,null,'null itemId explicitly clears item');
  const preBatch=db.getFirstSync("SELECT COUNT(*) n FROM expenses WHERE day_id=(SELECT id FROM days WHERE date='2026-11-06');").n;
  assert.throws(()=>ledger.saveExpenseBatch({date:'2026-11-06',categoryId:category,items:[{itemId:tomato,amount:5},{itemId:brinjal,amount:0}]}),/Amount/,'invalid batch is rejected');
  assert.equal(db.getFirstSync("SELECT COUNT(*) n FROM expenses WHERE day_id=(SELECT id FROM days WHERE date='2026-11-06');").n,preBatch,'invalid batch inserts no partial entries');
  const failingRun=db.runSync;
  db.runSync=(sql,params=[])=>{if(/^UPDATE days SET closing_balance/i.test(sql)) throw new Error('synthetic batch balance failure'); return failingRun(sql,params);};
  assert.throws(()=>ledger.saveExpenseBatch({date:'2026-11-06',categoryId:category,items:[{itemId:tomato,amount:5},{itemId:brinjal,amount:6}]}),/synthetic batch balance/,'batch recalc failure rolls back');
  db.runSync=failingRun;
  assert.equal(db.getFirstSync("SELECT COUNT(*) n FROM expenses WHERE day_id=(SELECT id FROM days WHERE date='2026-11-06');").n,0,'failed batch recalc leaves no expense rows');
  assert.equal(db.getFirstSync("SELECT COUNT(*) n FROM days WHERE date='2026-11-06';").n,0,'failed batch recalc rolls back created day');
  queries.getOrCreateDay('2026-11-01');
  queries.getOrCreateDay('2026-11-03');
  queries.updateDeposit('2026-11-01',100);

  const first=ledger.saveExpense({date:'2026-11-01',categoryId:category,amount:20,paymentType:'cash',note:'legacy-independent'});
  const second=ledger.saveExpense({date:'2026-11-01',categoryId:category,amount:7,paymentType:'cash',note:'second'});
  assert.equal(db.getFirstSync('SELECT COUNT(*) n FROM expenses').n,4,'append creates independent expense rows');
  ledger.saveExpense({id:first,date:'2026-11-01',categoryId:category,amount:25,paymentType:'cash'});
  assert.equal(db.getFirstSync('SELECT COUNT(*) n FROM expenses').n,4,'editing an ID does not collapse other entries');
  queries.setExpenseAmount; // keep legacy API exercised below
  db.runSync("INSERT INTO expenses(day_id,category_id,amount,payment_type,origin) VALUES((SELECT id FROM days WHERE date='2026-11-01'),?,12,'cash','legacy');",[category]);
  db.runSync("INSERT INTO expenses(day_id,category_id,amount,payment_type,origin) VALUES((SELECT id FROM days WHERE date='2026-11-01'),?,8,'cash','legacy');",[category]);
  queries.setExpenseAmount(db.getFirstSync("SELECT id FROM days WHERE date='2026-11-01'").id,category,15,'cash');
  assert.equal(db.getFirstSync("SELECT amount FROM expenses WHERE origin='entry' AND id=?",[first]).amount,25,'legacy grid edit leaves saved row unchanged');
  assert.equal(db.getFirstSync("SELECT SUM(amount) total FROM expenses WHERE origin='legacy'").total,15,'legacy grid normalizes prior duplicate legacy rows to the requested total');
  assert.equal(db.getFirstSync("SELECT COUNT(*) n FROM expenses WHERE origin='legacy'").n,1,'legacy grid removes only duplicate legacy rows');

  ledger.saveMovement({date:'2026-11-01',kind:'receipt',amount:40,direction:'in',note:'cash in'});
  const oldDay = queries.getOrCreateDay('2026-11-01');
  db.runSync("INSERT INTO ledger_movements (day_id,kind,amount,direction,account) VALUES (?,'transfer',8,'in','wallet'),(?,'transfer',3,'out','wallet');", [oldDay.id, oldDay.id]);
  queries.recalculateBalance(oldDay.id, '2026-11-01');
  assert.throws(() => ledger.saveMovement({date:'2026-11-01',kind:'transfer',amount:3,direction:'out'}), /read-only/);
  let day=ledger.getDayLedger('2026-11-01').day;
  assert.equal(day.cash_spent,47,'cash_spent contains expenses only');
  assert.equal(day.receipt_total,40);
  assert.equal(day.transfer_net,5);
  assert.equal(day.closing_balance,98,'closing includes deposit, receipts, transfer net, and cash expenses once');
  assert.equal(ledger.getDayLedger('2026-11-01').locker_balance,null,'unknown locker opening remains unknown');
  assert.throws(() => ledger.saveMovement({date:'2026-11-01',kind:'transfer',amount:1,direction:'in'}), error => error.code === 'LOCKER_LIMIT' && error.limit === null);
  ledger.setLockerOpeningBalance(100);
  assert.equal(ledger.getDayLedger('2026-11-01').locker_balance,95,'locker balance follows transfer direction and excludes receipts');

  const undo=ledger.removeLedgerEntry({kind:'expense',id:second,date:'2026-11-01'});
  assert.equal(db.getFirstSync('SELECT COUNT(*) n FROM expenses WHERE id=?',[second]).n,0);
  ledger.restoreLedgerEntry(undo);
  assert.equal(db.getFirstSync('SELECT COUNT(*) n FROM expenses WHERE id=?',[second]).n,1,'undo restores the same row ID');

  const month=ledger.getMonthLedger(2026,11);
  assert.equal(month.days.length,30,'month ledger projects all calendar dates without creating extra DB days');
  assert.equal(month.totals.receipts,40);
  assert.equal(month.totals.transfer_in,8);
  assert.equal(month.totals.transfer_out,3);
  assert.equal(db.getFirstSync('SELECT COUNT(*) n FROM days').n,3);
  const summary=queries.getMonthTotals(2026,11);
  assert.equal(summary.deposited,140,'month deposits include signed external receipts without transfer double-counting');
  assert.equal(summary.cash_spent,47,'month cash spending remains actual expenses');
  assert.equal(summary.transfer_net,5);

  ledger.saveExpense({id:first,date:'2026-11-02',categoryId:category,amount:25,paymentType:'cash'});
  assert.equal(db.getFirstSync("SELECT closing_balance FROM days WHERE date='2026-11-02'").closing_balance,98,'moved backdated expense recalculates later balances');
  assert.equal(db.getFirstSync("SELECT closing_balance FROM days WHERE date='2026-11-01'").closing_balance,123,'old date recalculates after moving entry');
  const online=ledger.saveExpense({date:'2026-11-02',categoryId:category,amount:30,paymentType:'online'});
  const beforeOnline=ledger.getDayLedger('2026-11-02').day;
  assert.equal(beforeOnline.cash_spent,25,'online purchases do not change cash spending');
  assert.equal(beforeOnline.online_spent,30);
  const noteId=ledger.saveDailyNote({date:'2026-11-02',text:'remember this'});
  db.runSync("UPDATE notes SET mood='happy' WHERE id=?;",[noteId]);
  const noteUndo=ledger.removeLedgerEntry({kind:'note',id:noteId,date:'2026-11-02'});
  ledger.restoreLedgerEntry(noteUndo);
  assert.equal(db.getFirstSync('SELECT mood FROM notes WHERE id=?;',[noteId]).mood,'happy','note undo preserves mood');
  const preFailureExpenses=db.getFirstSync('SELECT COUNT(*) n FROM expenses').n;
  const preFailureClosing=db.getFirstSync("SELECT closing_balance FROM days WHERE date='2026-11-02';").closing_balance;
  const runSync=db.runSync;
  db.runSync=(sql,params=[])=>{if(/^UPDATE days SET closing_balance/i.test(sql)) throw new Error('synthetic balance write failure'); return runSync(sql,params);};
  assert.throws(()=>ledger.saveExpense({date:'2026-11-02',categoryId:category,amount:9,paymentType:'cash'}),/synthetic balance/);
  db.runSync=runSync;
  assert.equal(db.getFirstSync('SELECT COUNT(*) n FROM expenses').n,preFailureExpenses,'failed balance recalc rolls back new expense');
  assert.equal(db.getFirstSync("SELECT closing_balance FROM days WHERE date='2026-11-02';").closing_balance,preFailureClosing,'failed write leaves prior closing balance intact');

  assert.throws(()=>ledger.saveExpense({date:'2026-02-30',categoryId:category,amount:1}),/Date/,'rejects impossible calendar dates');
  const daysBeforePurchase=db.getFirstSync('SELECT COUNT(*) n FROM days').n;
  const expensesBeforePurchase=db.getFirstSync('SELECT COUNT(*) n FROM expenses').n;
  const purchaseId=ledger.savePurchase({name:'Rice sack',date:'2026-11-01',amount:55,shop:'Market',details:'10kg',category:'grocery'});
  assert.equal(db.getFirstSync('SELECT COUNT(*) n FROM expenses').n,expensesBeforePurchase,'purchase is independent from expenses');
  assert.equal(db.getFirstSync('SELECT COUNT(*) n FROM days').n,daysBeforePurchase,'purchase memories do not create financial days');
  assert.equal(ledger.getPurchases()[0].id,purchaseId);
  ledger.deletePurchase(purchaseId);
  assert.equal(ledger.getPurchases().length,0);

  const collisionPurchase=ledger.savePurchase({name:'Collision sample',date:'2026-11-01',amount:12});
  await excel.exportToExcel();
  const beforeExcel={expenses:db.getFirstSync('SELECT COUNT(*) n FROM expenses').n,movements:db.getFirstSync('SELECT COUNT(*) n FROM ledger_movements').n,notes:db.getFirstSync('SELECT COUNT(*) n FROM notes').n};
  db.runSync("UPDATE purchases SET name='Changed in target' WHERE id=?;",[collisionPurchase]);
  await excel.importFromExcel();
  assert.equal(db.getFirstSync('SELECT COUNT(*) n FROM expenses').n,beforeExcel.expenses,'Excel round-trip preserves existing expenses without duplicates');
  assert.equal(db.getFirstSync('SELECT COUNT(*) n FROM ledger_movements').n,beforeExcel.movements,'Excel round-trip covers movements without duplicates');
  assert.equal(db.getFirstSync('SELECT COUNT(*) n FROM notes').n,beforeExcel.notes,'Excel round-trip skips duplicate notes');
  const afterCollisionImport=db.getFirstSync('SELECT COUNT(*) n FROM purchases').n;
  assert.equal(afterCollisionImport,2,'Excel ID collision imports the original purchase as a separate row');
  await excel.importFromExcel();
  assert.equal(db.getFirstSync('SELECT COUNT(*) n FROM purchases').n,afterCollisionImport,'repeating an Excel import does not duplicate a resolved ID collision');

  queries.updateDeposit('2026-10-31',500);
  ledger.saveExpense({date:'2026-10-31',categoryId:category,amount:400,paymentType:'cash'});
  await pdf.exportToPDF(2026,11);
  assert.match(printedHtml,/Receipts less spending/);
  assert.equal(printedHtml.match(/Receipts less spending<\/div>\s*<div class="card-value">([^<]+)/)?.[1], '₹93 (66.4%)',
    'PDF net cash excludes other months, online notes and internal transfers');

  const snapshot={version:2,data:Object.fromEntries(['categories','places','days','category_items','day_places','expenses','notes','tasks','vehicle_records','recurring_expenses','ledger_movements','purchases','ledger_settings'].map(t=>[t,db.getAllSync(`SELECT * FROM "${t}"`)])),assets:{}};
  const before=db.getFirstSync('SELECT COUNT(*) n FROM expenses').n;
  await backup.restoreFromJSONData(snapshot);
  assert.equal(db.getFirstSync('SELECT COUNT(*) n FROM expenses').n,before,'full restore recreates transaction rows');
  await backup.restoreFromJSONData(snapshot);
  assert.equal(db.getFirstSync('SELECT COUNT(*) n FROM expenses').n,before,'repeating full restore does not duplicate rows');
  await initializeDatabase();
  assert.equal(db.getFirstSync('SELECT COUNT(*) n FROM expenses').n,before,'repeat initialize preserves restored data');
  const existingDay=db.getFirstSync("SELECT closing_balance FROM days WHERE date='2026-11-01';").closing_balance;
  const badSnapshot={version:2,data:{categories:[],days:[],places:[],category_items:[],day_places:[],expenses:[{id:999,day_id:888,category_id:777,amount:1,payment_type:'cash'}],notes:[],tasks:[],vehicle_records:[],recurring_expenses:[],ledger_movements:[],purchases:[],ledger_settings:[]}};
  await assert.rejects(()=>backup.restoreFromJSONData(badSnapshot),/broken references/,'invalid foreign keys reject restore');
  assert.equal(db.getFirstSync("SELECT closing_balance FROM days WHERE date='2026-11-01';").closing_balance,existingDay,'failed restore rolls back all prior rows');
  await backup.restoreFromJSONData({version:'1.0.0',data:{categories:[{id:category,name:'Food',icon:'🍲',sort_order:1,is_active:1}],days:[{id:1,date:'2026-12-01',deposit_today:5,closing_balance:0}]}});
  assert.equal(db.getFirstSync('SELECT COUNT(*) n FROM expenses').n,0,'partial v1 restore clears unsupported newer tables instead of retaining orphans');
  assert.equal(db.getFirstSync('SELECT COUNT(*) n FROM ledger_movements').n,0);
  await backup.restoreFromJSONData({version:'1.0.0',data:{categories:[{id:category,name:'Food',icon:'🍲',sort_order:1,is_active:1}],days:[{id:1,date:'2026-12-02',deposit_today:100,closing_balance:100}]}});
  await excel.exportToExcel();
  await backup.restoreFromJSONData({version:'1.0.0',data:{categories:[{id:category,name:'Food',icon:'🍲',sort_order:1,is_active:1}],days:[{id:1,date:'2026-12-01',deposit_today:500,closing_balance:500}]}});
  await excel.importFromExcel();
  assert.equal(db.getFirstSync("SELECT closing_balance FROM days WHERE date='2026-12-02';").closing_balance,600,'Excel import rebuilds balances for newly imported deposit-only days');

  const overviewDate = '2026-12-02';
  const priorDate = '2026-12-01';
  const nextDate = '2026-12-03';
  queries.addTask('Carried forward', priorDate);
  queries.addTask('Future task', nextDate);
  db.runSync("INSERT INTO tasks(title,start_date,completed_date,status) VALUES (?,?,?,'completed'),(?,?,?,'completed');",
    ['Done on selection', priorDate, overviewDate, 'Done before selection', priorDate, priorDate]);
  const market = queries.addPlace('Market');
  const bakery = queries.addPlace('Bakery');
  queries.togglePlaceForDay(queries.getOrCreateDay(overviewDate).id, market.id);
  queries.togglePlaceForDay(queries.getOrCreateDay(priorDate).id, bakery.id);
  ledger.saveDailyNote({ date: overviewDate, text: 'Selected note' });
  ledger.saveDailyNote({ date: priorDate, text: 'Earlier note' });
  db.runSync('INSERT INTO vehicle_records(date,reading,liters,price_per_liter,amount) VALUES (?,100,2,100,200),(?,180,3,100,300);',
    [priorDate, overviewDate]);
  const overview = getDayOverview(overviewDate);
  assert.deepEqual(overview.tasks.map(task => task.title), ['Carried forward', 'Done on selection']);
  assert.deepEqual(overview.places.map(place => place.name), ['Market']);
  assert.deepEqual(overview.notes.map(note => note.text), ['Selected note']);
  assert.deepEqual(overview.fuel.map(record => record.reading), [180]);
  const vehicleRecords = queries.getAllVehicleRecords();
  const beforeLaterFill = getOdometerNeighbors(vehicleRecords, priorDate);
  assert.equal(beforeLaterFill.previous.reading, 100);
  assert.equal(beforeLaterFill.next.reading, 180, 'a backdated fuel form has an upper bound from the next fill');
  const afterLaterFill = getOdometerNeighbors(vehicleRecords, nextDate);
  assert.equal(afterLaterFill.previous.reading, 180, 'changing the form date changes the predecessor');
  assert.equal(afterLaterFill.next, null);
  const editing = getOdometerNeighbors(vehicleRecords, overviewDate, vehicleRecords[0].id);
  assert.equal(editing.previous.reading, 100, 'editing excludes the record itself');
  assert.deepEqual(getDayOverview(nextDate).places, []);
  assert.equal(db.getFirstSync('SELECT id FROM days WHERE date=?;', [nextDate]), null, 'previewing a day does not create it');

  const emptyCashBook = { version: '1.0.0', data: {
    categories: [{ id: category, name: 'Food', icon: '🍲', sort_order: 1, is_active: 1 }],
    days: [],
  } };
  await backup.restoreFromJSONData(emptyCashBook);
  const cashDate = '2026-01-31';
  const balances = date => {
    const { day, locker_balance } = ledger.getDayLedger(date);
    return [day.closing_balance, locker_balance];
  };
  assert.throws(() => ledger.saveMovement({date:cashDate,kind:'transfer',amount:1,direction:'in'}), error => error.code === 'LOCKER_LIMIT' && error.limit === 0);
  const received = ledger.saveMovement({ date: cashDate, kind: 'receipt', account: 'locker', amount: 8000, direction: 'in' });
  assert.deepEqual(balances(cashDate), [0, 8000]);
  const withdrawn = ledger.saveMovement({ date: cashDate, kind: 'transfer', amount: 2000, direction: 'in' });
  assert.deepEqual(balances(cashDate), [2000, 6000]);
  assert.equal(ledger.getLockerWithdrawalLimit(cashDate, withdrawn), 8000, 'Editing credits the existing withdrawal once');
  assert.throws(() => ledger.saveMovement({date:cashDate,kind:'transfer',amount:6000.01,direction:'in'}), error => error.code === 'LOCKER_LIMIT' && error.limit === 6000);
  assert.deepEqual(ledger.getAmountHistory({kind:'deposit_locker',date:cashDate}), [8000]);
  assert.deepEqual(ledger.getAmountHistory({kind:'take_locker',date:cashDate}), [2000]);

  ledger.saveExpense({ date: cashDate, categoryId: category, amount: 200, paymentType: 'cash' });
  ledger.saveExpense({ date: cashDate, categoryId: category, amount: 1200, paymentType: 'locker', note: 'Milk' });
  assert.deepEqual(balances(cashDate), [1800, 4800]);
  ledger.saveExpense({ date: cashDate, categoryId: category, amount: 550, paymentType: 'online' });
  assert.deepEqual(balances(cashDate), [1800, 4800]);
  const forgotten = ledger.saveExpense({ date: cashDate, amount: 50, paymentType: 'locker', forgotten: true });
  assert.deepEqual(balances('2026-02-01'), [1750, 4800]);
  assert.equal(ledger.getDayLedger(cashDate).entries.find(entry => entry.kind === 'expense' && entry.id === forgotten).origin, 'forgotten');
  const cashMonth = ledger.getMonthLedger(2026, 1);
  assert.equal(cashMonth.totals.wallet_spent, 250);
  assert.equal(cashMonth.totals.locker_spent, 1200);
  assert.equal(cashMonth.totals.online_spent, 550);
  const cashTotals = queries.getMonthTotals(2026, 1);
  assert.deepEqual([cashTotals.deposited, cashTotals.cash_spent, cashTotals.online_spent], [8000, 1450, 550]);
  const [analyticsDay] = queries.getDailyTotals(2026, 1).filter(day => day.date === cashDate);
  assert.deepEqual(
    [analyticsDay.wallet_total, analyticsDay.locker_total, analyticsDay.online_total, analyticsDay.forgotten_total],
    [250, 1200, 550, 50],
  );

  ledger.saveMovement({ id: withdrawn, date: cashDate, kind: 'transfer', amount: 2100, direction: 'in' });
  assert.deepEqual(balances('2026-02-01'), [1850, 4700]);
  ledger.saveMovement({ id: withdrawn, date: cashDate, kind: 'transfer', amount: 2000, direction: 'in' });
  const removedReceipt = ledger.removeLedgerEntry({ kind: 'receipt', id: received, date: cashDate });
  ledger.restoreLedgerEntry(removedReceipt);
  assert.deepEqual(balances('2026-02-01'), [1750, 4800]);

  const recent = new Date();
  const monthStart = new Date(recent.getFullYear(), recent.getMonth(), 1);
  const due = [monthStart.getFullYear(), String(monthStart.getMonth() + 1).padStart(2, '0'), '01'].join('-');
  db.runSync("INSERT INTO recurring_expenses(category_id,amount,payment_type,frequency,day_of_month,next_due_date,note) VALUES (?,300,'locker','monthly',1,?,'Milk');", [category, due]);
  assert.equal(queries.processRecurringExpenses().posted, 1);
  assert.equal(queries.processRecurringExpenses().posted, 0, 'a second launch does not repeat a monthly charge');
  assert.deepEqual(balances(due), [1750, 4500]);

  await excel.exportToExcel();
  await backup.restoreFromJSONData(emptyCashBook);
  await excel.importFromExcel();
  assert.deepEqual(balances(due), [1750, 4500], 'Excel round trip preserves account, recurring spending and opening balance');
  const cashSnapshot = { ...snapshot, data: Object.fromEntries(Object.keys(snapshot.data).map(table => [table, db.getAllSync(`SELECT * FROM "${table}"`)])) };
  await backup.restoreFromJSONData(cashSnapshot);
  assert.deepEqual(balances(due), [1750, 4500], 'JSON restores both balances');
  assert.equal(ledger.getLockerWithdrawalLimit(cashDate), 4500, 'Existing later locker spending reduces the backdated limit');
  assert.throws(() => ledger.saveMovement({ date: cashDate, kind: 'transfer', amount: 4501, direction: 'in' }),
    error => error.code === 'LOCKER_LIMIT' && error.limit === 4500);
  assert.deepEqual(balances(due), [1750, 4500], 'Rejected backdated withdrawal leaves both balances intact');

  const { suggestAmounts } = loadModule(path.join(root, 'src/utils/cash.js'));
  const defaults = [50, 100, 200];
  assert.deepEqual(suggestAmounts([], defaults), defaults);
  assert.deepEqual(suggestAmounts([], defaults, 70), [50, 70]);
  assert.deepEqual(suggestAmounts([], defaults, 0), []);
  queries.addCategory('Vegetables', '🥬');
  const vegetables = queries.getAllCategories().find(row => row.name === 'Vegetables').id;
  const veggieDate = '2026-02-12';
  for (let amount = 100; amount < 200; amount += 10) ledger.saveExpense({ date: veggieDate, categoryId: vegetables, amount });
  ledger.saveExpense({ date: '2026-02-13', categoryId: vegetables, amount: 600 });
  ledger.saveExpense({ date: veggieDate, categoryId: vegetables, amount: 700, paymentType: 'online' });
  const history = ledger.getAmountHistory({ kind: 'expense', categoryId: vegetables, date: veggieDate });
  assert.equal(history.length, 10, 'Same category and payment source history excludes future entries and online notes');
  assert.deepEqual(suggestAmounts(history, defaults), [120, 150, 170]);
  assert.deepEqual(suggestAmounts(history, defaults, 145), [120, 145]);
  console.log('ledger-check: actual schema/query/ledger/restore APIs passed synthetic SQL.js assertions');
  raw.close();
})().catch(e=>{console.error(e);process.exitCode=1});

