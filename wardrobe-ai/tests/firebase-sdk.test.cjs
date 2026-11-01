const test = require('node:test');
const assert = require('node:assert/strict');
const { createRequire } = require('node:module');
const { initializeApp, deleteApp } = require('firebase/app');
const { getAuth } = require('firebase/auth');
const { getFirestore, terminate } = require('firebase/firestore');

test('Firebase App, Auth and Firestore share the same core SDK', () => {
  const appRequire = createRequire(require.resolve('firebase/app'));
  for (const service of ['@firebase/auth', '@firebase/firestore']) {
    const serviceRequire = createRequire(require.resolve(service));
    assert.equal(serviceRequire.resolve('@firebase/app'), appRequire.resolve('@firebase/app'));
  }
});

test('real Firebase Auth and Firestore register against the initialized app', async () => {
  const app = initializeApp({ apiKey: 'test-key', projectId: 'demo-wardrobe', appId: 'test-app' }, 'sdk-regression');
  try {
    const auth = getAuth(app);
    const db = getFirestore(app);
    assert.equal(auth.app, app);
    assert.equal(db.app, app);
    await auth.authStateReady();
    assert.equal(auth.currentUser, null);
    await terminate(db);
  } finally { await deleteApp(app); }
});
