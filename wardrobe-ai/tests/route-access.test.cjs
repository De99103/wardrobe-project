/* global __dirname */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function layoutHarness() {
  let state;
  let listener;
  let unsubscribed = false;
  const effects = [];
  const stack = Object.assign(() => {}, { Screen: 'screen', Protected: 'protected' });
  const jsx = (type, props) => ({ type, props });
  const imports = {
    'react/jsx-runtime': { jsx, jsxs: jsx },
    react: {
      useState: initial => { if (state === undefined) state = initial; return [state, value => { state = value; }]; },
      useEffect: effect => effects.push(effect),
    },
    'react-native': { View: 'view', ActivityIndicator: 'spinner' },
    'expo-router': { Stack: stack },
    '../services/firebaseClient': { observeAccount: callback => { listener = callback; return () => { unsubscribed = true; }; } },
    '../services/i18n': { useLanguage: () => ({ language: 'en' }) },
    '../components/AppHeaderNavigation': { AppHeader: () => {} },
    '../components/AppTypography': { appFontFamily: 'test' },
    '../constants/brand': { BrandColors: {} },
  };
  const exports = {};
  const source = fs.readFileSync(path.join(__dirname, '../src/app/_layout.tsx'), 'utf8');
  const code = ts.transpileModule(source, { compilerOptions: {
    module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX,
  } }).outputText;
  vm.runInNewContext(code, { exports, require: key => {
    assert.ok(key in imports, `Unexpected import: ${key}`);
    return imports[key];
  } });
  const initial = exports.default();
  const cleanup = effects.map(effect => effect()).filter(Boolean);
  return {
    initial,
    account: user => { listener(user); return exports.default(); },
    dispose: () => { cleanup.forEach(fn => fn()); return unsubscribed; },
  };
}

function accessibleScreens(node) {
  if (!node || node.type === 'protected' && !node.props.guard) return [];
  if (node.type === 'screen') return [node.props.name];
  return [node.props?.children].flat().flatMap(accessibleScreens);
}

test('no app screens mount before the persisted account is restored', () => {
  const app = layoutHarness();
  assert.deepEqual(accessibleScreens(app.initial), []);
  assert.equal(app.initial.props.children.type, 'spinner');
  assert.equal(app.dispose(), true);
});

test('signed-out users can access Home, Account and Information', () => {
  const app = layoutHarness();
  assert.deepEqual(accessibleScreens(app.account(null)), ['account', 'information', 'index']);
});

test('sign-in unlocks every page and sign-out revokes access again', () => {
  const app = layoutHarness();
  const routes = fs.readdirSync(path.join(__dirname, '../src/app'))
    .filter(name => name.endsWith('.tsx') && !name.startsWith('_') && !name.startsWith('+'))
    .map(name => name.replace(/\.tsx$/, '')).sort();
  assert.deepEqual(accessibleScreens(app.account({ uid: 'alice' })).sort(), routes);
  assert.deepEqual(accessibleScreens(app.account(null)), ['account', 'information', 'index']);
});
