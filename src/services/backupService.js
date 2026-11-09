import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import { getDB } from '../db/schema';

const TABLES = ['categories','places','days','category_items','day_places','expenses','notes','tasks','vehicle_records','recurring_expenses','ledger_movements','purchases','ledger_settings'];
const ASSET_COLUMNS = ['icon','image_uri'];
const tableExists = (db,name) => !!db.getFirstSync("SELECT name FROM sqlite_master WHERE type='table' AND name=?;",[name]);
const safeRows = (db,table) => tableExists(db,table) ? db.getAllSync(`SELECT * FROM "${table}";`) : [];
const localUri = (value) => typeof value==='string' && /^(file:|content:|ph:)/i.test(value);
const extensionOf = (uri) => {
  const ext=String(uri).split(/[?#]/)[0].split('.').pop();
  return /^[a-zA-Z0-9]{1,8}$/.test(ext||'') ? ext : 'jpg';
};

export const exportToJSON = async () => {
  const db=getDB(), data=Object.fromEntries(TABLES.map(t=>[t,safeRows(db,t)])), assets={};
  for (const table of TABLES) for (const row of data[table]||[]) for (const key of ASSET_COLUMNS) {
    const uri=row[key];
    if (!uri || !localUri(uri) || assets[uri]) continue;
    try {
      assets[uri]={base64:await FileSystem.readAsStringAsync(uri,{encoding:FileSystem.EncodingType.Base64}),extension:extensionOf(uri)};
    } catch (error) {
      throw new Error(`Cannot include local image asset in backup (${table}.${key}): ${error?.message||error}`);
    }
  }
  const backup={format:'rojnishi-backup',version:2,exportDate:new Date().toISOString(),data,assets};
  const stamp=new Date().toISOString().replace(/[:.]/g,'-');
  const fileName=`hisab_backup_${stamp}_${Math.random().toString(16).slice(2,8)}.json`;
  const fileUri=FileSystem.documentDirectory+fileName;
  await FileSystem.writeAsStringAsync(fileUri,JSON.stringify(backup));
  await Sharing.shareAsync(fileUri,{mimeType:'application/json',dialogTitle:'Export Rojnishi Backup'});
  return fileName;
};

const writeAsset = async (asset) => {
  if (!asset?.base64) throw new Error('Backup image asset is incomplete');
  const dir=FileSystem.documentDirectory+'hisab_assets/';
  await FileSystem.makeDirectoryAsync(dir,{intermediates:true});
  const ext=/^[a-zA-Z0-9]{1,8}$/.test(asset.extension||'')?asset.extension:'jpg';
  const uri=dir+`asset_${Date.now()}_${Math.random().toString(16).slice(2)}.${ext}`;
  await FileSystem.writeAsStringAsync(uri,asset.base64,{encoding:FileSystem.EncodingType.Base64});
  return uri;
};

const validateBackup = (db,backup) => {
  if (!backup || !backup.data || typeof backup.data!=='object' || Array.isArray(backup.data)) throw new Error('Invalid backup file format');
  if (backup.format && backup.format!=='rojnishi-backup') throw new Error('Unsupported backup format');
  if (![1,2,'1.0.0'].includes(backup.version)) throw new Error('Unsupported backup version');
  const source=backup.data;
  if (!Array.isArray(source.categories)||!Array.isArray(source.days)) throw new Error('Backup must include categories and days');
  for (const table of TABLES) {
    if (!tableExists(db,table)) throw new Error(`Database table is unavailable: ${table}`);
    if (source[table]!==undefined && !Array.isArray(source[table])) throw new Error(`Invalid backup table: ${table}`);
    const allowed=new Set(db.getAllSync(`PRAGMA table_info("${table}");`).map(row=>row.name));
    for (const row of source[table]||[]) {
      if (!row || typeof row!=='object' || Array.isArray(row)) throw new Error(`Invalid row in backup table: ${table}`);
      for (const column of Object.keys(row)) if (!allowed.has(column)) throw new Error(`Unsupported column in backup table ${table}: ${column}`);
    }
  }
};

const recalculateRestoredBalances = (db) => {
  let previous=0;
  const days=db.getAllSync('SELECT id,date,deposit_today FROM days ORDER BY date;');
  for (const day of days) {
    const cash=db.getFirstSync("SELECT COALESCE(SUM(amount),0) total FROM expenses WHERE day_id=? AND payment_type='cash';",[day.id]).total;
    const receipts=db.getFirstSync("SELECT COALESCE(SUM(amount*CASE direction WHEN 'in' THEN 1 ELSE -1 END),0) total FROM ledger_movements WHERE day_id=? AND kind='receipt';",[day.id]).total;
    const transfers=db.getFirstSync("SELECT COALESCE(SUM(amount*CASE direction WHEN 'in' THEN 1 ELSE -1 END),0) total FROM ledger_movements WHERE day_id=? AND kind='transfer';",[day.id]).total;
    previous += day.deposit_today + receipts + transfers - cash;
    db.runSync('UPDATE days SET closing_balance=? WHERE id=?;',[previous,day.id]);
  }
};

const restoreAll = async (db,backup) => {
  validateBackup(db,backup);
  const source=backup.data;
  const rows=Object.fromEntries(TABLES.map(t=>[t,(source[t]||[]).map(row=>({...row}))]));
  for (const table of TABLES) for (const row of rows[table]) for (const key of ASSET_COLUMNS) {
    const uri=row[key];
    if (uri && backup.assets?.[uri]) row[key]=await writeAsset(backup.assets[uri]);
  }

  try {
    db.execSync('PRAGMA foreign_keys=OFF;');
    db.execSync('BEGIN TRANSACTION;');
    for (const table of [...TABLES].reverse()) db.runSync(`DELETE FROM "${table}";`);
    for (const table of TABLES) for (const row of rows[table]) {
      const columns=Object.keys(row);
      if (!columns.length) continue;
      const quoted=columns.map(c=>`"${c.replaceAll('"','""')}"`).join(',');
      const slots=columns.map(()=>'?').join(',');
      db.runSync(`INSERT INTO "${table}" (${quoted}) VALUES (${slots});`,columns.map(c=>row[c]));
    }
    recalculateRestoredBalances(db);
    const violations=db.getAllSync('PRAGMA foreign_key_check;');
    if (violations.length) throw new Error('Backup contains broken references; restore was rolled back');
    db.execSync('COMMIT;');
    db.execSync('PRAGMA foreign_keys=ON;');
  } catch (error) {
    try { db.execSync('ROLLBACK;'); } catch (_) {}
    try { db.execSync('PRAGMA foreign_keys=ON;'); } catch (_) {}
    throw error;
  }
  return Object.fromEntries(TABLES.map(t=>[t,rows[t].length]));
};

export const importFromJSON = async () => {
  const result=await DocumentPicker.getDocumentAsync({type:'application/json',copyToCacheDirectory:true});
  if (result.canceled) return null;
  const content=await FileSystem.readAsStringAsync(result.assets[0].uri);
  return restoreAll(getDB(),JSON.parse(content));
};

export const restoreFromJSONData = (backup) => restoreAll(getDB(),backup);
