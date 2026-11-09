import { getDB } from './schema';
import { getDayData, getOrCreateDay, recalculateBalance } from './queries';

const validDate = (date) => {
  if (typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) return false;
  const [y,m,d] = date.split('-').map(Number), parsed = new Date(Date.UTC(y,m-1,d));
  return parsed.getUTCFullYear()===y && parsed.getUTCMonth()===m-1 && parsed.getUTCDate()===d;
};
const positiveAmount = (amount) => {
  const value = Number(amount);
  if (!Number.isFinite(value) || value <= 0) throw new Error('Amount must be a positive finite number');
  const rounded=Math.round((value + Number.EPSILON) * 100) / 100;
  if (rounded<=0) throw new Error('Amount must be at least one paisa');
  return rounded;
};
const dayFor = (date) => {
  if (!validDate(date)) throw new Error('Date must use YYYY-MM-DD');
  return getOrCreateDay(date);
};
const atomic = (db, work) => {
  db.execSync('BEGIN TRANSACTION;');
  try {
    const result=work();
    db.execSync('COMMIT;');
    return result;
  } catch (error) {
    try { db.execSync('ROLLBACK;'); } catch (_) {}
    throw error;
  }
};

const mappedExpenses = (date, dayId) => getDB().getAllSync(`
  SELECT e.id, e.amount, e.payment_type, e.category_id, e.note, e.origin, e.created_at,
         e.item_id, i.name item_name, i.icon item_icon, i.icon_type item_icon_type,
         c.name category_name, c.icon, c.icon_type
  FROM expenses e JOIN categories c ON c.id=e.category_id
  LEFT JOIN category_items i ON i.id=e.item_id
  WHERE e.day_id=? ORDER BY e.id;`, [dayId])
  .map((row) => ({ ...row, kind: 'expense', date }));

const movementEntries = (date, dayId) => getDB().getAllSync(
  'SELECT id,kind,amount,direction,note,created_at FROM ledger_movements WHERE day_id=? ORDER BY id;', [dayId]
).map((row) => ({ ...row, date }));
const timeValue = (value) => {
  if (!value) return null;
  const normalized=String(value).includes('T') ? String(value) : String(value).replace(' ','T');
  const parsed=Date.parse(normalized);
  return Number.isNaN(parsed) ? null : parsed;
};

const dailyDeposit = (date, day) => day.deposit_today ? [{
  id: day.id, kind: 'legacy_receipt', date, amount: day.deposit_today,
  direction: 'in', note: 'Daily deposit',
}] : [];

const entriesForDay = (date, day) => [
  ...mappedExpenses(date, day.id),
  ...dailyDeposit(date, day),
  ...movementEntries(date, day.id),
  ...getDB().getAllSync('SELECT id,text,created_at FROM notes WHERE day_id=? ORDER BY created_at,id;', [day.id])
    .map(row => ({ ...row, kind: 'note', date })),
].sort((a,b) => {
  const aTime=timeValue(a.created_at), bTime=timeValue(b.created_at);
  if (aTime!==null && bTime!==null && aTime!==bTime) return aTime-bTime;
  if (Boolean(aTime)!==Boolean(bTime)) return aTime ? 1 : -1;
  return Number(a.id)-Number(b.id) || a.kind.localeCompare(b.kind);
});

export const getDayLedger = (date) => {
  const day = getDayData(date);
  const db = getDB();
  const setting = db.getFirstSync("SELECT value FROM ledger_settings WHERE key='locker_opening';");
  const movement = db.getFirstSync(`
    SELECT COALESCE(SUM(amount * CASE direction WHEN 'in' THEN 1 ELSE -1 END),0) total
    FROM ledger_movements m JOIN days d ON d.id=m.day_id WHERE d.date<=? AND m.kind='transfer';`, [date]).total;
  return { day, entries: entriesForDay(date, day), locker_balance: setting ? Number(setting.value) - movement : null };
};

export const setLockerOpeningBalance = (amount) => {
  const value = Number(amount);
  if (!Number.isFinite(value) || value < 0) throw new Error('Locker opening balance must be a non-negative finite number');
  getDB().runSync("INSERT INTO ledger_settings(key,value) VALUES('locker_opening',?) ON CONFLICT(key) DO UPDATE SET value=excluded.value;", [String(value)]);
};

export const getMonthLedger = (year, month) => {
  if (!Number.isInteger(Number(year)) || !Number.isInteger(Number(month)) || Number(month)<1 || Number(month)>12) throw new Error('Month must be between 1 and 12');
  const prefix = `${year}-${String(month).padStart(2,'0')}`;
  const db = getDB();
  const count = new Date(year,month,0).getDate();
  const dates = Array.from({length:count},(_,i)=>`${prefix}-${String(i+1).padStart(2,'0')}`);
  let carry = getDB().getFirstSync('SELECT closing_balance FROM days WHERE date < ? ORDER BY date DESC LIMIT 1;', [dates[0]])?.closing_balance ?? 0;
  const days = dates.map(date => {
    const stored = db.getFirstSync('SELECT * FROM days WHERE date=?;', [date]);
    const data = stored ? getDayData(date) : null;
    const movements = stored ? movementEntries(date, stored.id) : [];
    const receipts = movements.filter(x => x.kind==='receipt').reduce((n,x)=>n+x.amount*(x.direction==='in'?1:-1),0);
    const transfer_in = movements.filter(x => x.kind==='transfer' && x.direction==='in').reduce((n,x)=>n+x.amount,0);
    const transfer_out = movements.filter(x => x.kind==='transfer' && x.direction==='out').reduce((n,x)=>n+x.amount,0);
    const opening_balance = carry;
    const cash_spent = data?.cash_spent ?? 0;
    const online_spent = data?.online_spent ?? 0;
    const transfer_net = transfer_in - transfer_out;
    const closing_balance = opening_balance + (stored?.deposit_today ?? 0) + receipts + transfer_net - cash_spent;
    carry = closing_balance;
    return { date, opening_balance, closing_balance,
      cash_spent, online_spent, receipts, transfer_in, transfer_out,
      entries: stored ? entriesForDay(date, {...data,opening_balance,closing_balance}) : [] };
  });
  const totals = days.reduce((acc,d) => {
    for (const k of Object.keys(acc)) acc[k] += d[k];
    return acc;
  }, {cash_spent:0,online_spent:0,receipts:0,transfer_in:0,transfer_out:0});
  return { days, totals, opening_balance: days[0]?.opening_balance ?? 0, closing_balance: days[days.length-1]?.closing_balance ?? 0 };
};

const checkedExpenseFields = (db, {categoryId, amount, paymentType, note, itemId}, existing) => {
  const targetCategory = categoryId ?? existing?.category_id;
  const type = paymentType ?? existing?.payment_type ?? 'cash';
  const memo = note ?? existing?.note ?? '';
  const value = positiveAmount(amount);
  if (!Number.isInteger(Number(targetCategory)) || !db.getFirstSync('SELECT id FROM categories WHERE id=?;', [targetCategory])) throw new Error('A valid category is required');
  if (!['cash','online'].includes(type)) throw new Error('Payment type must be cash or online');
  const targetItem = itemId === undefined ? (existing?.item_id ?? null) : itemId;
  if (targetItem != null) {
    const item = db.getFirstSync('SELECT id,category_id FROM category_items WHERE id=?;', [targetItem]);
    if (!item || Number(item.category_id)!==Number(targetCategory)) throw new Error('Item must belong to the selected category');
  }
  return {targetCategory,type,memo,value,targetItem};
};

export const saveExpense = ({ id, date, categoryId, amount, paymentType, note, itemId }) => {
  const db = getDB();
  return atomic(db, () => {
  if (!validDate(date)) throw new Error('Date must use YYYY-MM-DD');
  const existing = id != null ? db.getFirstSync('SELECT * FROM expenses WHERE id=?;', [id]) : null;
  if (id != null && !existing) throw new Error('Expense entry not found');
  const {targetCategory,type,memo,value,targetItem}=checkedExpenseFields(db,{categoryId,amount,paymentType,note,itemId},existing);
  const day = dayFor(date);
  if (id != null) {
    const old = existing;
    const oldDate = db.getFirstSync('SELECT date FROM days WHERE id=?;', [old.day_id])?.date;
    db.runSync('UPDATE expenses SET day_id=?,category_id=?,item_id=?,amount=?,payment_type=?,note=? WHERE id=?;', [day.id,targetCategory,targetItem,value,type,memo,id]);
    if (oldDate && oldDate !== date) recalculateBalance(old.day_id,oldDate);
  } else {
    db.runSync("INSERT INTO expenses (day_id,category_id,item_id,amount,payment_type,note,origin,created_at) VALUES (?,?,?,?,?,?,'entry',?);", [day.id,targetCategory,targetItem,value,type,memo,new Date().toISOString()]);
  }
  recalculateBalance(day.id,date);
  return id ?? db.getFirstSync('SELECT last_insert_rowid() id;').id;
  });
};

export const saveExpenseBatch = ({date,categoryId,paymentType='cash',note='',items}) => {
  const db=getDB();
  return atomic(db, () => {
    if (!validDate(date)) throw new Error('Date must use YYYY-MM-DD');
    if (!Array.isArray(items) || items.length===0) throw new Error('At least one item expense is required');
    const type=paymentType;
    if (!['cash','online'].includes(type)) throw new Error('Payment type must be cash or online');
    if (!Number.isInteger(Number(categoryId)) || !db.getFirstSync('SELECT id FROM categories WHERE id=?;', [categoryId])) throw new Error('A valid category is required');
    if (typeof note!=='string') throw new Error('Expense note must be text');
    const validated=items.map((item)=>{
      const value=positiveAmount(item?.amount), itemId=item?.itemId;
      if (itemId==null) throw new Error('A valid item is required');
      const found=db.getFirstSync('SELECT id,category_id FROM category_items WHERE id=?;', [itemId]);
      if (!found || Number(found.category_id)!==Number(categoryId)) throw new Error('Item must belong to the selected category');
      return {itemId,value};
    });
    const day=dayFor(date), ids=[];
    for (const item of validated) {
      db.runSync("INSERT INTO expenses (day_id,category_id,item_id,amount,payment_type,note,origin,created_at) VALUES (?,?,?,?,?,?, 'entry', ?);", [day.id,categoryId,item.itemId,item.value,type,note,new Date().toISOString()]);
      ids.push(db.getFirstSync('SELECT last_insert_rowid() id;').id);
    }
    recalculateBalance(day.id,date);
    return ids;
  });
};

export const saveMovement = ({ id, date, kind, amount, direction, note='' }) => {
  const db = getDB();
  return atomic(db, () => {
  const day = dayFor(date), value = positiveAmount(amount);
  if (!['receipt','transfer'].includes(kind) || !['in','out'].includes(direction)) throw new Error('Invalid movement kind or direction');
  if (id != null) {
    const old=db.getFirstSync('SELECT day_id FROM ledger_movements WHERE id=?;',[id]);
    if (!old) throw new Error('Movement entry not found');
    const oldDate=db.getFirstSync('SELECT date FROM days WHERE id=?;',[old.day_id])?.date;
    db.runSync('UPDATE ledger_movements SET day_id=?,kind=?,amount=?,direction=?,note=? WHERE id=?;', [day.id,kind,value,direction,note,id]);
    if(oldDate && oldDate!==date) recalculateBalance(old.day_id,oldDate);
  }
  else db.runSync('INSERT INTO ledger_movements (day_id,kind,amount,direction,note) VALUES (?,?,?,?,?);', [day.id,kind,value,direction,note]);
  recalculateBalance(day.id,date);
  return id ?? db.getFirstSync('SELECT last_insert_rowid() id;').id;
  });
};

export const saveDailyNote = ({ id, date, text }) => {
  const day = dayFor(date), db = getDB();
  if (!String(text ?? '').trim()) throw new Error('Note text is required');
  if (id != null) {
    const old = db.getFirstSync('SELECT mood FROM notes WHERE id=?;', [id]);
    db.runSync('UPDATE notes SET day_id=?,text=?,mood=? WHERE id=?;', [day.id,String(text),old?.mood ?? 'other',id]);
  }
  else db.runSync('INSERT INTO notes(day_id,text,mood) VALUES(?,?,"other");', [day.id,String(text)]);
  return id ?? db.getFirstSync('SELECT last_insert_rowid() id;').id;
};

export const removeLedgerEntry = ({ kind,id,date }) => {
  const db = getDB();
  return atomic(db, () => {
  const day = dayFor(date);
  let row;
  if (kind==='expense') {
    row = db.getFirstSync('SELECT * FROM expenses WHERE id=?;', [id]);
    if (row) db.runSync('DELETE FROM expenses WHERE id=?;', [id]);
  } else if (kind==='note') {
    row = db.getFirstSync('SELECT * FROM notes WHERE id=?;', [id]);
    if (row) db.runSync('DELETE FROM notes WHERE id=?;', [id]);
  } else if (kind==='receipt' || kind==='transfer') {
    row = db.getFirstSync('SELECT * FROM ledger_movements WHERE id=? AND kind=?;', [id,kind]);
    if (row) db.runSync('DELETE FROM ledger_movements WHERE id=?;', [id]);
  } else if (kind==='legacy_receipt') {
    row = db.getFirstSync('SELECT * FROM days WHERE id=?;', [id]);
    if (row) db.runSync('UPDATE days SET deposit_today=0 WHERE id=?;', [id]);
  }
  if (row) recalculateBalance(day.id,date);
  return row ? { kind,record:row,date } : null;
  });
};

export const restoreLedgerEntry = (snapshot) => {
  if (!snapshot?.record) return false;
  const db=getDB();
  return atomic(db, () => {
  const day=dayFor(snapshot.date), r=snapshot.record;
  if (snapshot.kind==='expense') db.runSync('INSERT INTO expenses(id,day_id,category_id,item_id,amount,payment_type,place_id,note,origin,created_at) VALUES(?,?,?,?,?,?,?,?,?,?);',
    [r.id,day.id,r.category_id,r.item_id??null,r.amount,r.payment_type,r.place_id??null,r.note??null,r.origin??'entry',r.created_at??null]);
  else if (snapshot.kind==='note') db.runSync('INSERT INTO notes(id,day_id,text,mood,created_at) VALUES(?,?,?,?,?);',[r.id,day.id,r.text,r.mood,r.created_at]);
  else if (snapshot.kind==='receipt'||snapshot.kind==='transfer') db.runSync('INSERT INTO ledger_movements(id,day_id,kind,amount,direction,note,created_at) VALUES(?,?,?,?,?,?,?);',[r.id,day.id,r.kind,r.amount,r.direction,r.note,r.created_at]);
  else if (snapshot.kind==='legacy_receipt') db.runSync('UPDATE days SET deposit_today=? WHERE id=?;',[r.deposit_today,day.id]);
  recalculateBalance(day.id,snapshot.date);
  return true;
  });
};

export const getPurchases = () => getDB().getAllSync('SELECT * FROM purchases ORDER BY date DESC,id DESC;');
export const savePurchase = ({ id,name,date,amount=null,shop='',details='',image_uri=null,category='' }) => {
  if (!validDate(date)) throw new Error('Date must use YYYY-MM-DD');
  if (!String(name??'').trim()) throw new Error('Purchase name is required');
  const value = amount == null || amount === '' ? null : positiveAmount(amount), db=getDB();
  if (id != null) db.runSync('UPDATE purchases SET name=?,date=?,amount=?,shop=?,details=?,image_uri=?,category=? WHERE id=?;',
    [name,date,value,shop,details,image_uri,category,id]);
  else db.runSync('INSERT INTO purchases(name,date,amount,shop,details,image_uri,category) VALUES(?,?,?,?,?,?,?);',[name,date,value,shop,details,image_uri,category]);
  return id ?? db.getFirstSync('SELECT last_insert_rowid() id;').id;
};
export const deletePurchase = (id) => getDB().runSync('DELETE FROM purchases WHERE id=?;', [id]);

