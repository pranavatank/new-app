// Runs the actual entry form's callbacks with mocked hooks/controls and API spies.
// This verifies financial routing, not React Native layout or device behavior.
const assert = require('node:assert/strict');
const babel = require('@babel/core');
const vm = require('node:vm');
const path = require('node:path');

const compiled = babel.transformFileSync(path.resolve('src/components/ledger/LedgerEntryForm.jsx'), {
  plugins: ['@babel/plugin-transform-react-jsx', '@babel/plugin-transform-modules-commonjs'],
}).code;

function harness(entry = null) {
  let cursor = 0, changed = false, tree;
  const slots = [], effects = [], calls = [], alerts = [];
  const categories = [{ id: 1, name: 'Vegetables' }, { id: 2, name: 'Fruit' }];
  const items = [{ id: 10, category_id: 1, name: 'Tomato' }, { id: 11, category_id: 1, name: 'Brinjal' }];
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
  const ledger = Object.fromEntries(['saveExpense', 'saveExpenseBatch', 'saveMovement', 'saveDailyNote'].map(name => [name, data => calls.push({ name, data })]));
  const t = key => key;
  const localRequire = id => {
    if (id === 'react') return React;
    if (id === 'react-native') return { View: 'View', Text: 'Text', ScrollView: 'ScrollView', Image: 'Image', TouchableOpacity: 'TouchableOpacity', Alert: { alert: (...args) => alerts.push(args) } };
    if (id === 'react-i18next') return { useTranslation: () => ({ t, i18n: { language: 'en' } }) };
    if (id.includes('ThemeContext')) return { useTheme: () => ({ C: {}, scale: 1 }) };
    if (id.includes('constants/theme')) return { scaleTheme: () => ({ Typography: { sizes: { xs: 11, sm: 13, base: 15, md: 17, xl: 24 }, weights: { bold: '700' } }, Spacing: { xs: 4, sm: 8, md: 12, lg: 20 }, Radius: { md: 12 } }) };
    if (id.includes('db/queries')) return query;
    if (id.includes('db/ledger')) return ledger;
    if (id.includes('defaultCategories')) return { translateCategoryName: name => name };
    if (id.includes('/common/')) return { __esModule: true, default: id.split('/').pop() };
    throw new Error(`Unexpected form dependency ${id}`);
  };
  const module = { exports: {} };
  vm.runInThisContext(`(function(require,module,exports){${compiled}\n})`)(localRequire, module, module.exports);
  const props = { visible: true, mode: 'expense', date: '2026-11-09', entry, onClose() {}, onSaved() {} };
  const render = () => {
    for (let pass = 0; pass < 10; pass++) {
      cursor = 0; changed = false;
      tree = module.exports.default(props);
      effects.splice(0).forEach(work => work());
      if (!changed) return;
    }
    throw new Error('Form did not settle');
  };
  const find = (predicate, node = tree) => {
    if (!node || typeof node !== 'object') return null;
    if (Array.isArray(node)) return node.map(child => find(predicate, child)).find(Boolean);
    if (predicate(node)) return node;
    return find(predicate, node.props?.children);
  };
  const control = (type, predicate) => {
    const found = find(node => node.type === type && predicate(node.props));
    assert.ok(found, `Missing ${type} control`);
    return found.props;
  };
  render();
  return {
    calls, alerts,
    press(label) { control('Chip', props => props.label === label).onPress(); render(); },
    input(label, value) { control('Input', props => props.label?.includes(label)).onChangeText(value); render(); },
    save() { control('Button', props => props.label === 'common.save').onPress(); render(); },
  };
}

const shopping = harness();
shopping.press('Vegetables');
shopping.input('Tomato', '30');
shopping.input('Brinjal', '40');
shopping.save();
assert.equal(shopping.calls.length, 1);
assert.equal(shopping.calls[0].name, 'saveExpenseBatch');
assert.deepEqual(shopping.calls[0].data.items, [{ itemId: 10, amount: 30 }, { itemId: 11, amount: 40 }]);

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
console.log('entry-form-check: actual form callbacks passed new-item, edit-conversion and invalid-batch assertions');
