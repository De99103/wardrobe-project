import { Platform } from 'react-native';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { saveUserProfile } from './userProfile';
import { getFirestore } from 'firebase/firestore';

const config = {
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};
export const firebaseConfigured = [config.apiKey, config.authDomain, config.projectId, config.appId].every(Boolean);
export const cloudEnabled = firebaseConfigured && Platform.OS === 'web';

export function firebaseServices() {
  if (!cloudEnabled) return null;
  const app = getApps().length ? getApp() : initializeApp(config);
  return { auth: getAuth(app), db: getFirestore(app) };
}

export async function storageAccount(): Promise<User | null> {
  const services = firebaseServices();
  if (!services) return null;
  await services.auth.authStateReady();
  return services.auth.currentUser;
}

const profileSyncs = new Map<string, Promise<void>>();
export function observeAccount(listener: (user: User | null) => void, onProfileError?: (error: unknown) => void) {
  const services = firebaseServices();
  if (!services) { listener(null); return () => {}; }
  let active = true;
  const unsubscribe = onAuthStateChanged(services.auth, user => {
    listener(user);
    if (!user) return;
    const key = JSON.stringify([user.uid, user.displayName]);
    let pending = profileSyncs.get(key);
    if (!pending) {
      pending = saveUserProfile(services.db, user).catch(error => {
        profileSyncs.delete(key);
        throw error;
      });
      profileSyncs.set(key, pending);
    }
    void pending.catch(error => {
      if (active) {
        if (onProfileError) onProfileError(error);
        else console.warn('Account name could not be synced. Check the user-profile Firestore rules.');
      }
    });
  });
  return () => { active = false; unsubscribe(); };
}

export async function googleSignIn() {
  const services = firebaseServices();
  if (!services) throw new Error('Google sign-in needs Firebase setup in the web app.');
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  try {
    await signInWithPopup(services.auth, provider);
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? error.code : '';
    if (code === 'auth/configuration-not-found' || code === 'auth/operation-not-allowed') {
      throw new Error('Google sign-in is not enabled yet. In Firebase Console, open Authentication, choose Get started, then enable the Google provider.');
    }
    if (code === 'auth/unauthorized-domain') {
      throw new Error('Add this app’s hostname to Firebase Authentication → Settings → Authorized domains, then try again.');
    }
    if (code === 'auth/popup-blocked') {
      throw new Error('Allow sign-in popups for this app and try again.');
    }
    if (code === 'auth/popup-closed-by-user') return;
    throw error;
  }
}

export async function logOut() {
  const services = firebaseServices();
  if (services) await signOut(services.auth);
}
