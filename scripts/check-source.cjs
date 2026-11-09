// Static integration checks only; this is not a native/device UI test.
const fs = require('node:fs');
const path = require('node:path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(item => item.isDirectory()
  ? walk(path.join(dir, item.name)) : /\.(js|jsx)$/.test(item.name) ? [path.join(dir, item.name)] : []);
const files = ['App.js', ...walk('src')];
const globals = new Set([...Object.getOwnPropertyNames(globalThis), 'require', 'module', 'exports', 'window', 'document', 'navigator', 'localStorage', 'FileReader', 'alert', '__DEV__']);
let failures = 0;
const fail = message => { console.error(message); failures++; };
const en = JSON.parse(fs.readFileSync('src/locales/en.json', 'utf8'));
const gu = JSON.parse(fs.readFileSync('src/locales/gu.json', 'utf8'));
const themeAst = parser.parse(fs.readFileSync('src/constants/theme.js', 'utf8'), { sourceType: 'module' });
const paletteKeys = {};
for (const node of themeAst.program.body) for (const declaration of node.declaration?.declarations || []) {
  if (['LightColors', 'DarkColors'].includes(declaration.id.name)) {
    paletteKeys[declaration.id.name] = new Set(declaration.init.properties.map(property => property.key.name || property.key.value));
  }
}
for (const key of new Set([...paletteKeys.LightColors, ...paletteKeys.DarkColors])) {
  if (!paletteKeys.LightColors.has(key) || !paletteKeys.DarkColors.has(key)) fail(`Theme token ${key} must exist in both palettes`);
}
const getKey = (obj, key) => key.split('.').reduce((node, part) => node?.[part], obj);
const flatten = (object, prefix = '') => Object.entries(object || {}).flatMap(([key, value]) => typeof value === 'string'
  ? [`${prefix}${key}`] : flatten(value, `${prefix}${key}.`));
for (const prefix of ['ledger', 'book', 'purchases']) {
  const keys = new Set([...flatten(en[prefix]), ...flatten(gu[prefix])]);
  for (const key of keys) for (const [language, dictionary] of [['en', en], ['gu', gu]]) {
    if (typeof getKey(dictionary, `${prefix}.${key}`) !== 'string') fail(`Missing ${language} translation ${prefix}.${key}`);
  }
}
for (const file of files) {
  const source = fs.readFileSync(file, 'utf8');
  if (source.includes('\uFFFD')) fail(`${file}: invalid UTF-8 replacement character`);
  if (/ðŸ|àª|â”/.test(source)) fail(`${file}: probable text encoding corruption`);
  let ast;
  try { ast = parser.parse(source, { sourceType: 'module', plugins: ['jsx'] }); }
  catch (error) { fail(`${file}: ${error.message}`); continue; }
  traverse(ast, {
    JSXOpeningElement(p) {
      const attributes = new Set();
      for (const attribute of p.node.attributes) {
        if (attribute.type !== 'JSXAttribute') continue;
        const name = attribute.name.name;
        if (attributes.has(name)) fail(`${file}:${attribute.loc.start.line}: duplicate JSX attribute ${name}`);
        attributes.add(name);
      }
    },
    MemberExpression(p) {
      if (p.node.object.type === 'Identifier' && p.node.object.name === 'C' && !p.node.computed) {
        const key = p.node.property.name;
        if (!paletteKeys.LightColors.has(key) || !paletteKeys.DarkColors.has(key)) fail(`${file}:${p.node.loc.start.line}: unknown theme token C.${key}`);
      }
    },
    StringLiteral(p) {
      const uiFile = file === 'App.js' || /^src[\\/](screens|components)[\\/]/.test(file);
      if (uiFile && /^(#[\da-f]{3,8}|rgba?\([^)]*\))$/i.test(p.node.value)) {
        fail(`${file}:${p.node.loc.start.line}: literal UI color; use the central theme token`);
      }
    },
    ReferencedIdentifier(p) {
      if (!p.scope.hasBinding(p.node.name) && !globals.has(p.node.name)) fail(`${file}:${p.node.loc.start.line}: unbound ${p.node.name}`);
    },
    ImportDeclaration(p) {
      const target = p.node.source.value;
      if (!target.startsWith('.')) return;
      const resolved = path.resolve(path.dirname(file), target);
      if (![resolved, `${resolved}.js`, `${resolved}.jsx`, `${resolved}.json`, path.join(resolved, 'index.js')].some(candidate => fs.existsSync(candidate) && fs.statSync(candidate).isFile())) fail(`${file}: missing import ${target}`);
    },
    CallExpression(p) {
      if (p.node.callee.type !== 'Identifier' || p.node.callee.name !== 't') return;
      const key = p.node.arguments[0]?.value;
      if (typeof key !== 'string' || !/^(ledger|book|purchases)\./.test(key)) return;
      for (const [language, dictionary] of [['en', en], ['gu', gu]]) if (typeof getKey(dictionary, key) !== 'string') fail(`${file}: missing ${language} translation ${key}`);
    },
  });
}
console.log(`check-source: ${files.length} source files; ${failures} errors`);
process.exitCode = failures ? 1 : 0;
