// Static integration checks only; this is not a native/device UI test.
const fs = require('node:fs');
const path = require('node:path');
const parser = require('@babel/parser');
const traverse = require('@babel/traverse').default;
const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(item => item.isDirectory()
  ? walk(path.join(dir, item.name)) : /\.(js|jsx)$/.test(item.name) ? [path.join(dir, item.name)] : []);
const files = ['App.js', ...walk('src')];
const isUIFile = file => file === 'App.js' || /^src[\\/](screens|components)[\\/]/.test(file);
const registeredRoutes = new Set();
const registeredScreens = new Set();
const navigationLinks = [];
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
const checkLabel = (file, key) => {
  for (const [language, dictionary] of [['en', en], ['gu', gu]]) {
    if (typeof getKey(dictionary, key) !== 'string') fail(`${file}: missing ${language} translation ${key}`);
  }
};
const checkLink = (file, route, label, accent) => {
  navigationLinks.push([file, route]);
  checkLabel(file, label);
  if (!paletteKeys.LightColors.has(accent) || !paletteKeys.DarkColors.has(accent)) fail(`${file}: unknown navigation accent ${accent}`);
};
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
      const component = p.node.name;
      if (file === 'App.js' && component.type === 'JSXMemberExpression' && component.object.name === 'Tab' && component.property.name === 'Screen') {
        const name = p.node.attributes.find(attribute => attribute.name?.name === 'name')?.value?.value;
        if (registeredRoutes.has(name)) fail(`Duplicate tab route ${name}`);
        registeredRoutes.add(name);
        const screen = p.node.attributes.find(attribute => attribute.name?.name === 'component')?.value?.expression?.name;
        const imported = p.scope.getBinding(screen)?.path.parent.source?.value;
        if (imported?.startsWith('./src/screens/')) registeredScreens.add(path.basename(imported));
      }
    },
    MemberExpression(p) {
      if (p.node.object.type === 'Identifier' && p.node.object.name === 'C' && !p.node.computed) {
        const key = p.node.property.name;
        if (!paletteKeys.LightColors.has(key) || !paletteKeys.DarkColors.has(key)) fail(`${file}:${p.node.loc.start.line}: unknown theme token C.${key}`);
      }
    },
    StringLiteral(p) {
      const styled = p.findParent(parent => parent.isObjectProperty() || parent.isJSXAttribute());
      const colorProperty = /(?:color|gradient|fill|stroke)$/i.test(styled?.node.key?.name || styled?.node.name?.name || '');
      const namedColor = /^(transparent|white|black|gray|grey|red|blue|green|yellow|orange|purple|pink)$/i.test(p.node.value);
      if (isUIFile(file) && (/^(#[\da-f]{3,8}|(?:rgba?|hsla?|oklch)\([^)]*\))$/i.test(p.node.value) || (colorProperty && namedColor))) {
        fail(`${file}:${p.node.loc.start.line}: literal UI color; use the central theme token`);
      }
    },
    ObjectProperty(p) {
      const { key, value } = p.node;
      if (isUIFile(file) && ((key.name === 'fontSize' && value.type === 'NumericLiteral') ||
          (key.name === 'fontWeight' && value.type === 'StringLiteral' && /^\d+$/.test(value.value)))) {
        fail(`${file}:${p.node.loc.start.line}: literal typography; use a central typography token`);
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
      const callee = p.node.callee;
      if (callee.type === 'MemberExpression' && callee.object.name === 'navigation' && callee.property.name === 'navigate' && p.node.arguments[0]?.type === 'StringLiteral') {
        navigationLinks.push([file, p.node.arguments[0].value]);
      }
      if (p.node.callee.type !== 'Identifier' || p.node.callee.name !== 't') return;
      const key = p.node.arguments[0]?.value;
      if (typeof key !== 'string' || !/^(ledger|book|purchases)\./.test(key)) return;
      checkLabel(file, key);
    },
    VariableDeclarator(p) {
      if (path.basename(file) === 'AppTabBar.jsx' && p.node.id.name === 'tabs') {
        for (const tab of p.node.init.elements) {
          const fields = Object.fromEntries(tab.properties.map(prop => [prop.key.name, prop.value.value]));
          checkLink(file, fields.name, fields.label, fields.accent);
        }
      }
      if (path.basename(file) === 'FamilyTools.jsx' && p.node.id.name === 'groups') {
        for (const { elements: [group, links] } of p.node.init.elements) {
          checkLabel(file, 'ledger.tools_' + group.value);
          for (const { elements: [route, label, , accent] } of links.elements) {
            checkLink(file, route.value, 'ledger.tool_' + label.value, accent.value);
          }
        }
      }
    },
  });
}
for (const [file, route] of navigationLinks) {
  if (!registeredRoutes.has(route)) fail(`${file}: unknown navigation route ${route}`);
}
for (const file of fs.readdirSync('src/screens')) {
  if (/\.jsx$/.test(file) && !registeredScreens.has(path.basename(file, '.jsx'))) fail(`${file}: screen is not registered`);
}
const reachableRoutes = new Set(navigationLinks.map(([, route]) => route));
for (const route of registeredRoutes) if (!reachableRoutes.has(route)) fail(`${route}: missing navigation link`);
console.log(`check-source: ${files.length} source files; ${failures} errors`);
process.exitCode = failures ? 1 : 0;
