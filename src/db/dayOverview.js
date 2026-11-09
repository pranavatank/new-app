import { getDB } from './schema';
import { getVehicleStats } from './queries';

/** Read the selected day's home sections without creating a financial day. */
export const getDayOverview = (date) => {
  const db=getDB();
  const day=db.getFirstSync('SELECT id FROM days WHERE date=?;', [date]);
  const dayId=day?.id;
  const tasks=db.getAllSync(`
    SELECT * FROM tasks
    WHERE (status='pending' AND start_date<=?)
       OR (status='completed' AND completed_date=?)
    ORDER BY CASE WHEN status='pending' THEN 0 ELSE 1 END, start_date, id;`, [date,date]);
  const expenses=dayId ? db.getAllSync(`
    SELECT c.id category_id,c.name,c.icon,c.icon_type,c.sort_order,COALESCE(SUM(e.amount),0) total
    FROM categories c LEFT JOIN expenses e ON e.category_id=c.id AND e.day_id=?
    WHERE c.is_active=1 GROUP BY c.id ORDER BY c.sort_order;`, [dayId]) : [];
  const places=dayId ? db.getAllSync(`
    SELECT p.* FROM places p JOIN day_places dp ON dp.place_id=p.id
    WHERE dp.day_id=? ORDER BY p.name;`, [dayId]) : [];
  const notes=dayId ? db.getAllSync('SELECT * FROM notes WHERE day_id=? ORDER BY created_at,id;', [dayId]) : [];
  const fuel=db.getAllSync('SELECT * FROM vehicle_records WHERE date=? ORDER BY id DESC;', [date]);
  return {tasks,expenses,places,notes,fuel,vehicleStats:getVehicleStats()};
};
