export function parseCashAmount(value) {
  const number = String(value ?? '').replace(/[\u0AE6-\u0AEF]/g, digit =>
    String(digit.charCodeAt(0) - 0x0AE6)
  ).replace(/[,\s]/g, '');
  return /^(?:\d+(?:\.\d*)?|\.\d+)$/.test(number) ? Number(number) : NaN;
}

export function paymentLabel(type) {
  if (type === 'locker') return 'ledger.payment_locker';
  return type === 'online' ? 'ledger.online' : 'ledger.cash';
}

export function suggestAmounts(history, defaults, limit = Infinity) {
  const recent = history.filter(value => Number.isFinite(value) && value > 0).slice(0, 24).sort((a, b) => a - b);
  const values = recent.length >= 5
    ? [0.25, 0.5, 0.75].map(fraction => recent[Math.round((recent.length - 1) * fraction)])
    : defaults;
  return [...new Set(values.map(value => Math.min(value, limit)).filter(value => value > 0))].sort((a, b) => a - b);
}
