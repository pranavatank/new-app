import i18n from '../i18n';

export const getLocalizedDayName = (date, short = false) => {
  const dayIndex = new Date(date).getDay();
  const dayKeys = short 
    ? ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
    : ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  
  return i18n.t(`days.${dayKeys[dayIndex]}`);
};

export const formatDateWithDay = (date, short = true) => {
  const d = new Date(date);
  const day = d.getDate();
  const month = d.toLocaleString('default', { month: short ? 'short' : 'long' });
  const dayName = getLocalizedDayName(date, short);
  
  return `${dayName}, ${day} ${month}`;
};

export function formatLedgerDate(value, language, options = { day: 'numeric', month: 'short', year: 'numeric' }) {
  if (!value) return '';
  const date = value instanceof Date ? value : new Date(value + 'T00:00:00');
  if (Number.isNaN(date.getTime())) return String(value);
  return date.toLocaleDateString(language === 'gu' ? 'gu-IN-u-nu-latn' : 'en-IN', options);
}
