/* global __dirname */
const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

function load(name, overrides = {}, globals = {}) {
  const file = path.join(__dirname, '../src/services', `${name}.ts`);
  const source = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, esModuleInterop: true },
  }).outputText;
  const exports = {};
  vm.runInNewContext(source, {
    exports, require: key => {
      if (key in overrides) return overrides[key];
      if (key === './cloudWardrobe') return { storageAccount: async () => null };
      if (key === './productValidation') return load('productValidation');
      throw new Error(`Unexpected import: ${key}`);
    }, process: { env: { EXPO_PUBLIC_API_URL: 'https://api.example.com/' } },
    AbortController, setTimeout, clearTimeout, URL, ...globals,
  }, { filename: file });
  return exports;
}
const product = {
  name: 'Dress', brand: null, category: 'dresses', subcategory: null,
  color: null, material: null, price: 0, currency: 'SEK', imageUrl: null,
  sourceUrl: 'https://www.zara.com/product',
};

test('store validation accepts supported subdomains and rejects deceptive or malformed links', () => {
  const { validateStoreUrl } = load('productValidation');
  assert.equal(validateStoreUrl(' https://www.zara.com/product '), product.sourceUrl);
  assert.equal(validateStoreUrl('https://independent-store.example/item'), 'https://independent-store.example/item');
  for (const value of ['https://user:pass@zara.com/a',
    'https://zara.com:444/a', 'https://zara.com:bad/a', 'http://zara.com/a', 'https://[']) {
    assert.throws(() => validateStoreUrl(value), undefined, value);
  }
});

test('saving persists, deduplicates, preserves both collections, and serializes concurrent writes', async () => {
  let raw = null;
  const storage = {
    getItem: async () => raw,
    setItem: async (_, value) => { raw = value; },
  };
  const service = load('wardrobeStorage', { '@react-native-async-storage/async-storage': storage });
  await Promise.all([
    service.saveClothing(product, 'owned'), service.saveClothing(product, 'wishlist'),
    service.saveClothing({ ...product, name: 'Updated' }, 'owned'),
  ]);
  const saved = await service.loadClothing();
  assert.equal(saved.length, 2);
  assert.equal(saved.find(item => item.status === 'owned').name, 'Updated');
  assert.ok(saved.every(item => item.savedAt));
});

test('corrupt storage is preserved and a failed save does not poison future writes', async () => {
  let raw = '{broken';
  const service = load('wardrobeStorage', {
    '@react-native-async-storage/async-storage': {
      getItem: async () => raw, setItem: async (_, value) => { raw = value; },
    },
  });
  await assert.rejects(service.saveClothing(product, 'owned'));
  assert.equal(raw, '{broken');
  raw = null;
  await service.saveClothing(product, 'owned');
  assert.equal((await service.loadClothing()).length, 1);
});

test('API handles non-JSON errors, server details, malformed products, and valid zero prices', async () => {
  for (const [response, message] of [
    [{ ok: false, json: async () => { throw new Error('HTML'); } }, /invalid response/],
    [{ ok: false, json: async () => ({ detail: 'Store blocked' }) }, /Store blocked/],
    [{ ok: true, json: async () => ({ name: 'Incomplete' }) }, /incomplete product/],
  ]) {
    const service = load('productApi', {}, { fetch: async () => response });
    await assert.rejects(service.importProduct(product.sourceUrl), message);
  }
  let requestUrl;
  const service = load('productApi', {}, { fetch: async url => {
    requestUrl = url;
    return { ok: true, json: async () => product };
  } });
  assert.equal(await service.importProduct(product.sourceUrl), product);
  assert.equal(requestUrl, 'https://api.example.com/import-product');
});

test('API timeout aborts a hung request and gives an actionable message', async () => {
  const service = load('productApi', {}, {
    setTimeout: callback => setTimeout(callback, 1),
    fetch: async (_, options) => new Promise((resolve, reject) => {
      options.signal.addEventListener('abort', () => reject(new Error('aborted')));
    }),
  });
  await assert.rejects(service.importProduct(product.sourceUrl), /timed out/);
});

test('browser handoff fetches once across repeated callers and uses GET', async () => {
  let calls = 0;
  const service = load('productApi', {}, { fetch: async (url, options) => {
    calls++;
    assert.equal(url, 'https://api.example.com/imports/token');
    assert.equal(options.method, 'GET');
    return { ok: true, json: async () => product };
  } });
  await Promise.all([service.getImportedProduct('token'), service.getImportedProduct('token')]);
  assert.equal(calls, 1);
});

test('collections group by clothing type and retain store links', () => {
  const { collectionSections, storeLink } = load('collectionView');
  const items = [
    { ...product, name: 'Dress', category: 'dresses', status: 'wishlist', savedAt: '2026-10-01' },
    { ...product, name: 'Shirt', category: 'tops', sourceUrl: 'https://shop.example/shirt', status: 'wishlist', savedAt: '2026-10-02' },
    { ...product, name: 'Boots', category: 'shoes', status: 'owned', savedAt: '2026-10-03' },
  ];
  const grouped = collectionSections(items, 'wishlist', 'all', 'type');
  assert.deepEqual(Array.from(grouped, section => section.title), ['Tops', 'Dresses']);
  assert.equal(collectionSections(items, 'wishlist', 'tops', 'type')[0].data[0].name, 'Shirt');
  assert.equal(collectionSections(items, 'wishlist', 'all', 'newest')[0].data[0].name, 'Shirt');
  assert.equal(collectionSections(items, 'wishlist', 'all', 'name')[0].data[0].name, 'Dress');
  assert.equal(storeLink(product.sourceUrl), product.sourceUrl);
  assert.equal(storeLink('javascript:alert(1)'), null);
  assert.equal(storeLink('https://user:pass@shop.example/a'), null);
});

test('signed-in saving uses the account collection and preserves the source URL', async () => {
  const writes = [];
  let deviceWrites = 0;
  const service = load('wardrobeStorage', {
    '@react-native-async-storage/async-storage': { getItem: async () => null, setItem: async () => { deviceWrites++; } },
    './cloudWardrobe': {
      storageAccount: async () => ({ uid: 'owner-a' }),
      saveCloudClothing: async (uid, value) => { writes.push({ uid, value }); },
      loadCloudClothing: async () => [],
    },
  });
  await service.saveClothing(product, 'wishlist');
  assert.equal(writes[0].uid, 'owner-a');
  assert.equal(writes[0].value.sourceUrl, product.sourceUrl);
  assert.equal(writes[0].value.status, 'wishlist');
  assert.equal(deviceWrites, 0);
});

test('cloud failures are visible and never silently save to guest storage', async () => {
  let deviceWrites = 0;
  const service = load('wardrobeStorage', {
    '@react-native-async-storage/async-storage': { setItem: async () => { deviceWrites++; } },
    './cloudWardrobe': {
      storageAccount: async () => ({ uid: 'owner-a' }),
      saveCloudClothing: async () => { throw new Error('Permission denied'); },
    },
  });
  await assert.rejects(service.saveClothing(product, 'owned'), /Permission denied/);
  assert.equal(deviceWrites, 0);
});

test('device items upload only on explicit request and remain on the device', async () => {
  const local = [{ ...product, status: 'owned', savedAt: '2026-10-01' }];
  const writes = [];
  let deviceWrites = 0;
  const service = load('wardrobeStorage', {
    '@react-native-async-storage/async-storage': { getItem: async () => JSON.stringify(local), setItem: async () => { deviceWrites++; } },
    './cloudWardrobe': {
      storageAccount: async () => ({ uid: 'owner-a' }),
      saveCloudClothing: async (uid, value) => { writes.push({ uid, value }); },
      loadCloudClothing: async () => [],
    },
  });
  await service.loadClothing();
  assert.equal(writes.length, 0);
  assert.equal(await service.uploadDeviceClothing(), 1);
  assert.equal(writes[0].value.sourceUrl, product.sourceUrl);
  assert.equal(deviceWrites, 0);
});


test('profiles store readable names without using names as ownership keys', async () => {
  const writes = [];
  const service = load('userProfile', {
    'firebase/firestore': {
      doc: (_, ...parts) => parts.join('/'),
      setDoc: async (path, data, options) => { writes.push({ path, data, options }); },
    },
  });
  await service.saveUserProfile({}, { uid: 'owner-a', displayName: '  Deema  ' });
  await service.saveUserProfile({}, { uid: 'owner-b', displayName: 'Deema' });
  assert.equal(writes[0].path, 'users/owner-a');
  assert.equal(writes[1].path, 'users/owner-b');
  assert.equal(writes[0].data.displayName, 'Deema');
  assert.equal(writes[0].data.uid, 'owner-a');
  assert.equal(writes[0].options.merge, true);
  assert.equal(writes.length, 2);
});

test('profile updates preserve stable ownership when a display name changes', () => {
  const service = load('userProfile', { 'firebase/firestore': {} });
  const first = service.profileData({ uid: 'owner-a', displayName: 'Old name' });
  const next = service.profileData({ uid: 'owner-a', displayName: 'New name' });
  assert.equal(first.uid, next.uid);
  assert.equal(next.displayName, 'New name');
  assert.equal(service.profileData({ uid: 'owner-a', displayName: null }).displayName, 'Wearly user');
});

test('repeat collection imports share price but variants and missing prices are refetched', async () => {
  let calls = 0;
  let price = 499;
  let now = 0;
  const service = load('productApi', {}, { Date: { now: () => now }, fetch: async () => {
    calls++;
    return { ok: true, json: async () => ({ ...product, price }) };
  } });
  const [owned, wishlist] = await Promise.all([service.importProduct(product.sourceUrl), service.importProduct(product.sourceUrl)]);
  assert.equal(calls, 1);
  assert.equal(owned.price, wishlist.price);
  await service.importProduct(product.sourceUrl);
  assert.equal(calls, 1);
  await service.importProduct(product.sourceUrl + '?variant=other');
  assert.equal(calls, 2);
  now = 120001;
  price = null;
  await service.importProduct(product.sourceUrl);
  price = 399;
  assert.equal((await service.importProduct(product.sourceUrl)).price, 399);
  assert.equal(calls, 4);
});

test('manual questionnaire requires a real category and permits every other answer to be skipped', () => {
  const categories = load('collectionView');
  const { manualProduct, emptyDetails } = load('manualClothing', { './collectionView': categories });
  for (const invalid of ['', 'all', 'unknown']) assert.throws(() => manualProduct(invalid, emptyDetails, 'one'), /category/);
  for (const category of categories.categories) {
    const item = manualProduct(category, emptyDetails, 'one');
    assert.equal(item.category, category);
    assert.equal(item.name, null);
    assert.equal(item.price, null);
    assert.equal(categories.storeLink(item.sourceUrl), null);
    assert.ok(load('productValidation').isImportedProduct(item));
  }
  const priced = manualProduct('tops', { ...emptyDetails, price: '349,50', currency: 'sek' }, 'one');
  assert.equal(priced.price, 349.5);
  assert.equal(priced.currency, 'SEK');
  assert.equal(manualProduct('tops', { ...emptyDetails, price: '0' }, 'one').price, 0);
  assert.throws(() => manualProduct('tops', { ...emptyDetails, price: '-1' }, 'one'), /price/);
  assert.throws(() => manualProduct('tops', { ...emptyDetails, imageUrl: 'file:///photo' }, 'one'));
});

test('unnamed manual items stay distinct and appear in the selected collection and category', async () => {
  const view = load('collectionView');
  const { manualProduct, emptyDetails } = load('manualClothing', { './collectionView': view });
  let raw = null;
  const storage = load('wardrobeStorage', { '@react-native-async-storage/async-storage': {
    getItem: async () => raw, setItem: async (_, value) => { raw = value; },
  } });
  await storage.saveClothing(manualProduct('bottoms', emptyDetails, 'first'), 'wishlist');
  await storage.saveClothing(manualProduct('bottoms', emptyDetails, 'second'), 'wishlist');
  await storage.saveClothing(manualProduct('uncategorized', emptyDetails, 'third'), 'owned');
  const items = await storage.loadClothing();
  assert.equal(items.length, 3);
  assert.equal(view.collectionSections(items, 'wishlist', 'bottoms', 'type')[0].data.length, 2);
  assert.equal(view.collectionSections(items, 'owned', 'uncategorized', 'type')[0].data.length, 1);
});

test('device photo picker persists JPEG bytes and cancellation leaves selection unchanged', async () => {
  let cancelled = false;
  const released = [];
  const picker = load('clothingPhoto', {
    'expo-image-picker': { launchImageLibraryAsync: async () => cancelled ? { canceled: true } : { canceled: false, assets: [{ uri: 'blob:temporary', width: 2000, height: 3000 }] } },
    'expo-image-manipulator': { SaveFormat: { JPEG: 'jpeg' }, ImageManipulator: { manipulate: () => ({
      resize: size => assert.equal(size.height, 1000),
      renderAsync: async () => ({ saveAsync: async () => ({ base64: 'YWJj' }), release: () => released.push('image') }),
      release: () => released.push('context'),
    }) } },
  });
  assert.equal(await picker.chooseClothingPhoto(), 'data:image/jpeg;base64,YWJj');
  assert.equal(released.length, 2);
  cancelled = true;
  assert.equal(await picker.chooseClothingPhoto(), null);
});

test('guest photo survives storage reload alongside category-only details', async () => {
  let raw = null;
  const overrides = { '@react-native-async-storage/async-storage': {
    getItem: async () => raw, setItem: async (_, value) => { raw = value; },
  } };
  await load('wardrobeStorage', overrides).saveClothing({ ...product, sourceUrl: 'manual:one', imageUrl: 'data:image/jpeg;base64,YWJj' }, 'wishlist');
  const reloaded = await load('wardrobeStorage', overrides).loadClothing();
  assert.equal(reloaded[0].imageUrl, 'data:image/jpeg;base64,YWJj');
  assert.equal(reloaded[0].status, 'wishlist');
});

test('cloud photos persist in Firestore without a Storage dependency', async () => {
  let saved;
  let fail = false;
  const service = load('cloudWardrobe', {
    './firebaseClient': { firebaseServices: () => ({ db: {}, auth: { currentUser: { uid: 'owner' } } }) },
    'expo-crypto': { CryptoDigestAlgorithm: { SHA256: 'SHA256' }, digestStringAsync: async () => 'item-id' },
    'firebase/firestore': {
      doc: (_, ...parts) => parts.join('/'),
      setDoc: async (path, value) => {
        assert.equal(path, 'users/owner/clothing/item-id');
        if (fail) throw new Error('Permission denied');
        saved = value;
      },
      collection: () => ({}),
      getDocs: async () => ({ docs: [{ data: () => saved }] }),
    },
  });
  for (const status of ['owned', 'wishlist']) {
    const item = { ...product, status, savedAt: '2026-11-01', imageUrl: 'data:image/jpeg;base64,YWJj' };
    await service.saveCloudClothing('owner', item);
    assert.equal(saved.imageUrl, item.imageUrl);
    assert.equal((await service.loadCloudClothing('owner'))[0].imageUrl, item.imageUrl);
    assert.equal(saved.status, status);
    await assert.rejects(service.saveCloudClothing('other', item), /account changed/);
    await assert.rejects(service.saveCloudClothing('owner', { ...item, imageUrl: 'data:image/jpeg;base64,' + 'A'.repeat(300004) }), /photo cannot/);
    await assert.rejects(service.saveCloudClothing('owner', { ...item, imageUrl: 'data:text/html;base64,YWJj' }), /photo cannot/);
  }
  fail = true;
  await assert.rejects(service.saveCloudClothing('owner', { ...saved }), /Permission denied/);
});

test('local deletion removes only the selected collection item and serializes with saves', async () => {
  let raw = null;
  const service = load('wardrobeStorage', { '@react-native-async-storage/async-storage': {
    getItem: async () => raw, setItem: async (_, value) => { raw = value; },
  } });
  await service.saveClothing(product, 'owned');
  await service.saveClothing(product, 'wishlist');
  await Promise.all([
    service.deleteClothing({ ...product, status: 'owned' }),
    service.saveClothing({ ...product, sourceUrl: 'manual:second' }, 'owned'),
  ]);
  const items = await service.loadClothing();
  assert.equal(items.length, 2);
  assert.equal(items.find(item => item.sourceUrl === product.sourceUrl).status, 'wishlist');
  await service.deleteClothing({ ...product, status: 'owned' });
  assert.equal((await service.loadClothing()).length, 2);
});

test('failed cloud deletion never deletes device data and can be retried', async () => {
  let fail = true;
  let calls = 0;
  const service = load('wardrobeStorage', {
    '@react-native-async-storage/async-storage': { setItem: () => assert.fail('Must not delete device data') },
    './cloudWardrobe': {
      storageAccount: async () => ({ uid: 'owner' }),
      deleteCloudClothing: async (uid, item) => {
        assert.equal(uid, 'owner'); assert.equal(item.status, 'wishlist'); calls++;
        if (fail) throw new Error('offline');
      },
    },
  });
  await assert.rejects(service.deleteClothing({ ...product, status: 'wishlist' }), /offline/);
  fail = false;
  await service.deleteClothing({ ...product, status: 'wishlist' });
  assert.equal(calls, 2);
});

test('cloud deletion uses the saved document identity and guards account changes', async () => {
  let uid = 'owner';
  const paths = [];
  let switchDuringHash = false;
  const service = load('cloudWardrobe', {
    './firebaseClient': { firebaseServices: () => ({ db: {}, auth: { get currentUser() { return { uid }; } } }) },
    'expo-crypto': { CryptoDigestAlgorithm: { SHA256: 'SHA256' }, digestStringAsync: async (_, value) => {
      if (switchDuringHash) uid = 'other';
      return JSON.parse(value)[0] + '-hash';
    } },
    'firebase/firestore': { doc: (_, ...parts) => parts.join('/'), deleteDoc: async path => paths.push(path) },
  });
  await service.deleteCloudClothing('owner', { ...product, status: 'wishlist' });
  assert.equal(paths[0], 'users/owner/clothing/wishlist-hash');
  switchDuringHash = true;
  await assert.rejects(service.deleteCloudClothing('owner', { ...product, status: 'owned' }), /account changed/);
  assert.equal(paths.length, 1);
});

test('Bought it moves local photo and details, preserves existing owned copy and survives failure', async () => {
  let raw = null;
  let fail = false;
  const service = load('wardrobeStorage', { '@react-native-async-storage/async-storage': {
    getItem: async () => raw, setItem: async (_, value) => { if (fail) throw new Error('full'); raw = value; },
  } });
  const withPhoto = { ...product, imageUrl: 'data:image/jpeg;base64,YWJj' };
  await service.saveClothing(withPhoto, 'wishlist');
  fail = true;
  await assert.rejects(service.moveToWardrobe(product.sourceUrl), /full/);
  assert.equal((await service.loadClothing())[0].status, 'wishlist');
  fail = false;
  await service.moveToWardrobe(product.sourceUrl);
  let items = await service.loadClothing();
  assert.equal(items.length, 1);
  assert.equal(items[0].status, 'owned');
  assert.equal(items[0].imageUrl, withPhoto.imageUrl);
  assert.equal(items[0].price, 0);
  await service.saveClothing({ ...product, name: 'Wishlist version' }, 'wishlist');
  await service.moveToWardrobe(product.sourceUrl);
  items = await service.loadClothing();
  assert.equal(items.length, 1);
  assert.equal(items[0].name, product.name);
});

test('cloud Bought it atomically moves the latest source without overwriting a wardrobe copy', async () => {
  const source = { ...product, status: 'wishlist', savedAt: '2026-10-01', imageUrl: 'data:image/jpeg;base64,YWJj' };
  let documents = { 'users/owner/clothing/wishlist': source };
  let failCommit = false;
  const service = load('cloudWardrobe', {
    './firebaseClient': { firebaseServices: () => ({ db: {}, auth: { currentUser: { uid: 'owner' } } }) },
    'expo-crypto': { CryptoDigestAlgorithm: { SHA256: 'SHA256' }, digestStringAsync: async (_, value) => JSON.parse(value)[0] },
    'firebase/firestore': {
      doc: (_, ...parts) => parts.join('/'),
      runTransaction: async (_, action) => {
        const draft = { ...documents };
        await action({
          get: async path => ({ exists: () => !!documents[path], data: () => documents[path] }),
          set: (path, value) => { draft[path] = value; },
          delete: path => { delete draft[path]; },
        });
        if (failCommit) throw new Error('offline');
        documents = draft;
      },
    },
  });
  failCommit = true;
  await assert.rejects(service.moveCloudClothingToWardrobe('owner', product.sourceUrl), /offline/);
  assert.equal(Object.keys(documents).length, 1);
  assert.equal(documents['users/owner/clothing/wishlist'], source);
  failCommit = false;
  await service.moveCloudClothingToWardrobe('owner', product.sourceUrl);
  assert.equal(documents['users/owner/clothing/wishlist'], undefined);
  assert.equal(documents['users/owner/clothing/owned'].imageUrl, source.imageUrl);
  assert.equal(documents['users/owner/clothing/owned'].status, 'owned');
  documents['users/owner/clothing/owned'].name = 'Corrected name';
  documents['users/owner/clothing/wishlist'] = source;
  await service.moveCloudClothingToWardrobe('owner', product.sourceUrl);
  assert.equal(documents['users/owner/clothing/owned'].name, 'Corrected name');
  await assert.rejects(service.moveCloudClothingToWardrobe('owner', product.sourceUrl), /no longer available/);
  await assert.rejects(service.moveCloudClothingToWardrobe('other', product.sourceUrl), /account changed/);
});

test('imported product edits preserve the store identity and normalize manual corrections', () => {
  const view = load('collectionView');
  const editor = load('importedProductEditor', {
    './collectionView': view,
    './productValidation': load('productValidation'),
  });
  const original = { ...product, name: null, category: 'unknown', imageUrl: 'https://shop.example/image.jpg' };
  const editable = editor.editableProductDetails(original);
  assert.equal(editable.category, 'uncategorized');
  const updated = editor.applyImportedProductEdits(original, 'bottoms', {
    ...editable.details,
    name: '  Wide trousers  ',
    brand: '  Bik Bok ',
    color: ' ',
    price: '349,50',
    currency: 'sek',
  });
  assert.equal(updated.name, 'Wide trousers');
  assert.equal(updated.brand, 'Bik Bok');
  assert.equal(updated.color, null);
  assert.equal(updated.category, 'bottoms');
  assert.equal(updated.price, 349.5);
  assert.equal(updated.currency, 'SEK');
  assert.equal(updated.sourceUrl, original.sourceUrl);
  assert.equal(updated.imageUrl, original.imageUrl);
  assert.equal(original.name, null);
  assert.throws(() => editor.applyImportedProductEdits(original, 'all', editable.details), /category/);
  assert.throws(() => editor.applyImportedProductEdits(original, 'tops', { ...editable.details, price: '-1' }), /price/);
  assert.throws(() => editor.applyImportedProductEdits(original, 'tops', { ...editable.details, currency: 'kr' }), /currency/);
  assert.throws(() => editor.applyImportedProductEdits(original, 'tops', { ...editable.details, name: 'a'.repeat(2001) }), /2,000/);
  const empty = editor.emptyImportedProduct('https://shop.example/item');
  assert.equal(empty.category, 'uncategorized');
  assert.equal(empty.name, null);
  assert.equal(empty.sourceUrl, 'https://shop.example/item');
});

test('saved outfits persist locally, reload safely and can be removed', async () => {
  let raw = null;
  const model = load('outfitModel');
  const storage = load('outfitStorage', {
    '@react-native-async-storage/async-storage': {
      getItem: async () => raw,
      setItem: async (_, value) => { raw = value; },
    },
    'expo-crypto': { randomUUID: () => '11111111-1111-4111-8111-111111111111' },
    './firebaseClient': { storageAccount: async () => null },
    './cloudOutfits': {},
    './outfitModel': model,
  });
  const recommendation = {
    weather: {
      location: 'Stockholm', localTime: '2026-11-02 10:00', condition: 'Cloudy',
      temperatureC: 8, feelsLikeC: 6, precipitationMm: 0, chanceOfRain: 20,
      windKph: 12, humidity: 70, isDay: true,
    },
    outfit: {
      sourceUrls: [product.sourceUrl], title: 'Soft layers',
      explanation: 'A comfortable layered outfit.', weatherTip: 'Bring a light coat.',
    },
  };
  const saved = await storage.saveOutfit(recommendation, ' Work ');
  assert.equal(saved.occasion, 'Work');
  assert.equal((await storage.loadSavedOutfits()).length, 1);
  assert.equal((await storage.loadSavedOutfits())[0].outfit.title, 'Soft layers');
  await storage.deleteSavedOutfit(saved.id);
  assert.equal((await storage.loadSavedOutfits()).length, 0);
  raw = JSON.stringify([{ broken: true }]);
  await assert.rejects(storage.loadSavedOutfits(), /preserved/);
});

test('signed-in outfits use the private cloud collection', async () => {
  const writes = [];
  const deletes = [];
  const model = load('outfitModel');
  const recommendation = {
    weather: {
      location: 'Stockholm', localTime: '2026-11-02 10:00', condition: 'Cloudy',
      temperatureC: 8, feelsLikeC: 6, precipitationMm: 0, chanceOfRain: null,
      windKph: 12, humidity: 70, isDay: true,
    },
    outfit: {
      sourceUrls: [product.sourceUrl], title: 'Soft layers',
      explanation: 'A comfortable layered outfit.', weatherTip: 'Bring a light coat.',
    },
  };
  const storage = load('outfitStorage', {
    '@react-native-async-storage/async-storage': { setItem: () => assert.fail('Must not write device data') },
    'expo-crypto': { randomUUID: () => '22222222-2222-4222-8222-222222222222' },
    './firebaseClient': { storageAccount: async () => ({ uid: 'owner' }) },
    './cloudOutfits': {
      saveCloudOutfit: async (uid, value) => writes.push({ uid, value }),
      loadCloudOutfits: async uid => { assert.equal(uid, 'owner'); return writes.map(entry => entry.value); },
      deleteCloudOutfit: async (uid, id) => deletes.push({ uid, id }),
    },
    './outfitModel': model,
  });
  const saved = await storage.saveOutfit(recommendation, 'Dinner');
  assert.equal(writes[0].uid, 'owner');
  assert.equal((await storage.loadSavedOutfits())[0].id, saved.id);
  await storage.deleteSavedOutfit(saved.id);
  assert.deepEqual(deletes[0], { uid: 'owner', id: saved.id });
});

test('cloud outfits use owner-scoped Firestore documents and validate reads', async () => {
  const model = load('outfitModel');
  const saved = model.makeSavedOutfit({
    weather: {
      location: 'Stockholm', localTime: '2026-11-02 10:00', condition: 'Cloudy',
      temperatureC: 8, feelsLikeC: 6, precipitationMm: 0, chanceOfRain: null,
      windKph: 12, humidity: 70, isDay: true,
    },
    outfit: {
      sourceUrls: [product.sourceUrl], title: 'Soft layers',
      explanation: 'A comfortable layered outfit.', weatherTip: 'Bring a light coat.',
    },
  }, 'Dinner', 'outfit-id', '2026-11-02T10:00:00.000Z');
  const writes = [];
  const deletes = [];
  let readValue = saved;
  const service = load('cloudOutfits', {
    './firebaseClient': { firebaseServices: () => ({ db: {}, auth: { currentUser: { uid: 'owner' } } }) },
    './outfitModel': model,
    'firebase/firestore': {
      collection: (_, ...parts) => parts.join('/'),
      doc: (_, ...parts) => parts.join('/'),
      getDocs: async path => {
        assert.equal(path, 'users/owner/outfits');
        return { docs: [{ data: () => readValue }] };
      },
      setDoc: async (path, value) => writes.push({ path, value }),
      deleteDoc: async path => deletes.push(path),
    },
  });
  await service.saveCloudOutfit('owner', saved);
  assert.equal(writes[0].path, 'users/owner/outfits/outfit-id');
  assert.equal((await service.loadCloudOutfits('owner'))[0].id, 'outfit-id');
  await service.deleteCloudOutfit('owner', 'outfit-id');
  assert.equal(deletes[0], 'users/owner/outfits/outfit-id');
  await assert.rejects(service.loadCloudOutfits('other'), /account changed/);
  readValue = { broken: true };
  await assert.rejects(service.loadCloudOutfits('owner'), /could not be read/);
});
