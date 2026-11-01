/* global __dirname */
const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

function popup(response) {
  const state = { button: { disabled: false, addEventListener: (_, fn) => { state.click = fn; } }, message: { textContent: '' }, opened: [] };
  vm.runInNewContext(fs.readFileSync(path.join(__dirname, 'popup.js'), 'utf8'), {
    document: { getElementById: id => ({ import: state.button, message: state.message, collection: { value: 'wishlist' } })[id] },
    chrome: {
      tabs: { query: async () => [{ id: 42 }], create: async value => { state.opened.push(value.url); } },
      scripting: { executeScript: async options => {
        assert.equal(options.target.tabId, 42);
        assert.equal(typeof options.func, 'function');
        return [{ result: { url: 'https://new-store.example/item', html: '<main>Product</main>' } }];
      } },
    },
    fetch: async (url, options) => {
      assert.equal(url, 'http://127.0.0.1:8000/import-page');
      assert.equal(options.method, 'POST');
      assert.equal(JSON.parse(options.body).url, 'https://new-store.example/item');
      return response;
    },
    AbortController, URL, setTimeout, clearTimeout,
  });
  return state;
}

test('extension opens an opaque handoff URL without copying page content into it', async () => {
  const state = popup({ ok: true, json: async () => ({ importId: 'one-use-token' }) });
  await state.click();
  const url = new URL(state.opened[0]);
  assert.equal(url.origin, 'http://localhost:8081');
  assert.equal(url.searchParams.get('importId'), 'one-use-token');
  assert.equal(url.searchParams.get('status'), 'wishlist');
  assert.equal(url.searchParams.has('html'), false);
  assert.equal(state.button.disabled, false);
});

test('extension preserves server errors and re-enables retry', async () => {
  const state = popup({ ok: false, json: async () => ({ detail: 'AI unavailable' }) });
  await state.click();
  assert.match(state.message.textContent, /AI unavailable/);
  assert.equal(state.opened.length, 0);
  assert.equal(state.button.disabled, false);
});

test('manifest requests on-click page access and only local backend hosts', () => {
  const manifest = JSON.parse(fs.readFileSync(path.join(__dirname, 'manifest.json'), 'utf8'));
  assert.deepEqual(manifest.permissions, ['activeTab', 'scripting']);
  assert.ok(manifest.host_permissions.every(host => /^http:\/\/(127\.0\.0\.1|localhost):8000\/\*$/.test(host)));
});
