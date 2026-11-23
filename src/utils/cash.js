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
