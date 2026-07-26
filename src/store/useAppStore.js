import { create } from 'zustand';
import { getDayData } from '../db/queries';

const toDateString = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

const useAppStore = create((set, get) => ({
  // ── Selected Date ──────────────────────────────────────────────────────────
  selectedDate: toDateString(new Date()),

  setSelectedDate: (date) => {
    set({ selectedDate: date });
    get().refreshDayData(date);
  },

  goToPrevDay: () => {
    const { selectedDate } = get();
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() - 1);
    const newDate = toDateString(date);
    set({ selectedDate: newDate });
  },

  goToNextDay: () => {
    const { selectedDate } = get();
    const [y, m, d] = selectedDate.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + 1);
    const newDate = toDateString(date);
    set({ selectedDate: newDate });
  },

  // ── Day Data ───────────────────────────────────────────────────────────────
  dayData:     null,
  isLoadingDay: false,

  refreshDayData: (date) => {
    const targetDate = date || get().selectedDate;
    set({ isLoadingDay: true });
    try {
      const data = getDayData(targetDate);
      set({ dayData: data, isLoadingDay: false });
    } catch (e) {
      console.error('refreshDayData error:', e);
      set({ isLoadingDay: false });
    }
  },

  // ── DB initialized ─────────────────────────────────────────────────────────
  dbReady: false,
  setDbReady: (val) => set({ dbReady: val }),
}));

export default useAppStore;
