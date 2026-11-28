// Runs the actual entry form's callbacks with mocked hooks/controls and API spies.
// This verifies financial routing, not React Native layout or device behavior.
const assert = require('node:assert/strict');
const babel = require('@babel/core');
const vm = require('node:vm');
const path = require('node:path');

const compiled = babel.transformFileSync(path.resolve('src/components/ledger/LedgerEntryForm.jsx'), {
  babelrc: false,
  configFile: false,
  plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'],
}).code;

const cashModule = { exports: {} };
const compiledCash = babel.transformFileSync(path.resolve('src/utils/cash.js'), {
  babelrc: false,
  configFile: false,
  plugins: ['@babel/plugin-transform-modules-commonjs'],
}).code;
vm.runInThisContext(`(function(exports){${compiledCash}\n})`)(cashModule.exports);

function harness(entry = null, existingItems = [{ id: 10, category_id: 1, name: 'Tomato' }, { id: 11, category_id: 1, name: 'Brinjal' }], mode = 'expense', options = {}) {
  let cursor = 0, changed = false, tree;
  const slots = [], effects = [], calls = [], alerts = [];
  const categories = [{ id: 1, name: 'Vegetables' }, { id: 2, name: 'Fruit' }];
  const items = [...existingItems];
  const React = {
    createElement: (type, props, ...children) => ({ type, props: { ...props, children } }),
    Fragment: 'Fragment',
    useState(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = typeof initial === 'function' ? initial() : initial;
      return [slots[index], value => { slots[index] = typeof value === 'function' ? value(slots[index]) : value; changed = true; }];
    },
    useRef(initial) {
      const index = cursor++;
      if (!(index in slots)) slots[index] = { current: initial };
      return slots[index];
    },
    useMemo: work => work(),
    useEffect(work, dependencies) {
      const index = cursor++, previous = slots[index];
      if (!previous || dependencies.some((value, i) => !Object.is(value, previous[i]))) effects.push(work);
      slots[index] = dependencies;
    },
  };
  const query = {
    getAllCategories: () => [...categories],
    getAllCategoryItems: id => items.filter(item => item.category_id === Number(id)),
    addCategoryItem: (categoryId, name) => items.push({ id: items.length + 10, category_id: categoryId, name }),
  };
  const ledger = {
    ...Object.fromEntries(['saveExpense', 'saveExpenseBatch', 'saveMovement', 'saveDailyNote', 'setLockerOpeningBalance'].map(name => [name, data => calls.push({ name, data })])),
    getLockerWithdrawalLimit: () => 8000,
  };
  const t = key => key;
  const localRequire = id => {
    if (id === 'react') return React;
    if (id === 'react-native') return { View: 'View', Text: 'Text', ScrollView: 'ScrollView', Image: 'Image', TouchableOpacity: 'TouchableOpacity', Alert: { alert: (...args) => alerts.push(args) } };
    if (id === 'react-i18next') return { useTranslation: () => ({ t, i18n: { language: 'en' } }) };
    if (id.includes('ThemeContext')) return { useTheme: () => ({ C: { accents: ['#315F86'] }, scale: 1 }) };
    if (id.includes('constants/theme')) return { scaleTheme: () => ({ Typography: { sizes: { xs: 11, sm: 13, base: 15, md: 17, xl: 24 }, weights: { bold: '700' } }, Spacing: { xs: 4, sm: 8, md: 12, lg: 20 }, Radius: { md: 12 } }) };
    if (id.includes('db/queries')) return query;
    if (id.includes('db/ledger')) return ledger;
    if (id.includes('utils/cash')) return cashModule.exports;
    if (id === './LedgerEntryRow') return { money: value => '₹' + value };
    if (id.includes('defaultCategories')) return { translateCategoryName: name => name };
    if (id.includes('/common/')) return { __esModule: true, default: id.split('/').pop() };
    throw new Error(`Unexpected form dependency ${id}`);
  };
  const module = { exports: {} };
  vm.runInThisContext(`(function(require,module,exports){${compiled}\n})`)(localRequire, module, module.exports);
  const props = { visible: true, mode, date: '2026-11-09', entry, onClose() {}, onSaved() {}, ...options };
  const render = () => {
    for (let pass = 0; pass < 10; pass++) {
      cursor = 0; changed = false;
      tree = module.exports.default(props);
      effects.splice(0).forEach(work => work());
      if (!changed) return;
    }
    throw new Error('Form did not settle');
  };
  const find = (predicate, node) => {
    if (!node || typeof node !== 'object') return null;
    if (Array.isArray(node)) return node.map(child => find(predicate, child)).find(Boolean);
    if (predicate(node)) return node;
    return find(predicate, node.props?.children) || find(predicate, node.props?.footer);
  };
  const control = (type, predicate) => {
    const found = find(node => node.type === type && predicate(node.props), tree);
    assert.ok(found, `Missing ${type} control`);
    return found.props;
  };
  render();
  return {
    calls, alerts,
    hasButton(label) { return !!find(node => node.type === 'Button' && node.props.label === label, tree); },
    button(label) { control('Button', props => props.label === label).onPress(); render(); },
    press(label) { control('Chip', props => props.label === label).onPress(); render(); },
    input(label, value) {
      const input = find(node => ['Input', 'AmountInput'].includes(node.type) && node.props?.label?.includes(label), tree);
      assert.ok(input, `Missing field ${label}`);
      input.props.onChangeText(value);
      render();
    },
    addItem(name) {
      this.button('ledger.add_item');
      assert.equal(this.hasButton('common.save'), false, 'Finish adding the item before saving the expense');
      this.input('ledger.new_item', name);
      this.button('ledger.add_item');
    },
    save() { control('Button', props => props.label === 'common.save').onPress(); render(); },
  };
}
const overdraw = harness(null, [], 'take_locker');
overdraw.input('ledger.amount', '૮૦૦૧');
overdraw.save();
assert.equal(overdraw.calls.length, 0, 'The form rejects a manual amount above the cap');

const shopping = harness(null, []);
assert.equal(shopping.hasButton('common.save'), false, 'Choose a category before attempting to save');
shopping.press('Vegetables');
shopping.addItem('Tomato');
shopping.input('Tomato', '30');
shopping.addItem('Brinjal');
shopping.input('Brinjal', '40');
shopping.save();
assert.equal(shopping.calls.length, 1);
assert.equal(shopping.calls[0].name, 'saveExpenseBatch');
assert.deepEqual(shopping.calls[0].data.items, [{ itemId: 10, amount: 30 }, { itemId: 11, amount: 40 }]);

const quick = harness();
quick.press('Vegetables');
quick.press('ledger.category_total');
quick.input('ledger.amount', '૧૫૦');
quick.button('ledger.change_expense_category');
assert.equal(quick.hasButton('common.save'), false);
quick.press('Vegetables');
quick.save();
assert.equal(quick.calls[0].data.amount, 150, 'Reopening the category preserves the draft and entry mode');

const forgotten = harness(null, [], 'forgotten', { walletBalance: 500 });
forgotten.input('ledger.wallet_counted', '૪૫૦');
forgotten.button('ledger.use_missing_cash');
assert.equal(forgotten.calls.length, 0, 'Counting only fills the suggested amount');
forgotten.input('ledger.wallet_counted', '૫૦૦');
assert.equal(forgotten.hasButton('ledger.use_missing_cash'), false);
forgotten.save();
assert.equal(forgotten.calls.length, 0, 'A changed count clears a stale shortage');
forgotten.input('ledger.wallet_counted', '૪૫૦');
forgotten.button('ledger.use_missing_cash');
forgotten.save();
assert.equal(forgotten.calls[0].data.amount, 50);
assert.equal(forgotten.calls[0].data.forgotten, true);

const starting = harness(null, [], 'locker_opening', { openingAmount: 1500 });
starting.save();
assert.deepEqual(starting.calls[0], { name: 'setLockerOpeningBalance', data: 1500 });

const edit = harness({ id: 80, kind: 'expense', category_id: 1, category_name: 'Vegetables', amount: 70, item_id: null });
edit.press('ledger.expense_by_items');
edit.input('Tomato', '70');
edit.save();
assert.equal(edit.calls.length, 1);
assert.equal(edit.calls[0].name, 'saveExpense', 'converting an existing common expense must not append a batch');
assert.equal(edit.calls[0].data.id, 80);
assert.equal(edit.calls[0].data.itemId, 10);

const invalid = harness();
invalid.press('Vegetables');
invalid.input('Tomato', '30');
invalid.input('Brinjal', '-2');
invalid.save();
assert.equal(invalid.calls.length, 0, 'one invalid amount prevents the entire shopping save');
for (const [mode, api, fields] of [
  ['deposit_locker', 'saveMovement', { kind: 'receipt', account: 'locker', direction: 'in' }],
  ['take_locker', 'saveMovement', { kind: 'transfer', direction: 'in' }],
  ['forgotten', 'saveExpense', { forgotten: true }],
]) {
  const form = harness(null, [], mode);
  form.input('ledger.amount', '૧,૨૩૪.૫૦');
  form.save();
  assert.equal(form.calls.length, 1);
  assert.equal(form.calls[0].name, api);
  assert.equal(form.calls[0].data.amount, 1234.5);
  for (const [key, value] of Object.entries(fields)) assert.equal(form.calls[0].data[key], value);
}
console.log('entry-form-check: passed item, edit, batch validation, locker, forgotten expense and Gujarati amount assertions');
