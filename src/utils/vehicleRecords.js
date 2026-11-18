/** Find the adjacent readings in records sorted by date and id, newest first. */
export function getOdometerNeighbors(records, date, editingId = Infinity) {
  let next = null;
  for (const record of records) {
    if (record.id === editingId) continue;
    const recordDate = record.rawDate || record.date;
    if (recordDate < date || (recordDate === date && record.id < editingId)) {
      return { previous: record, next };
    }
    next = record;
  }
  return { previous: null, next };
}
