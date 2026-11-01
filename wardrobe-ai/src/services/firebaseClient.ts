import { Platform } from 'react-native';
import { getApp, getApps, initializeApp } from 'firebase/app';
import { getAuth, getRedirectResult, GoogleAuthProvider, onAuthStateChanged, signInWithPopup, signInWithRedirect, signOut } from 'firebase/auth';
import type { User } from 'firebase/auth';
import { saveUserProfile } from './userProfile';
import { getFirestore } from 'firebase/firestore';

const configuredAuthDomain = process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN;
const productionAuthDomain = Platform.OS === 'web'
  && typeof window !== 'undefined'
  && window.location.hostname === 'wardrobe-ai-six.vercel.app'
  ? window.location.hostname
  : configuredAuthDomain;

const config = {
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY,
  authDomain: productionAuthDomain,
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID,
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID,
};
export const firebaseConfigured = [config.apiKey, config.authDomain, config.projectId, config.appId].every(Boolean);
export const cloudEnabled = firebaseConfigured && Platform.OS === 'web';

function mobileWebBrowser() {
  if (Platform.OS !== 'web' || typeof window === 'undefined' || typeof navigator === 'undefined') return false;
  return /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent)
    || window.matchMedia?.('(max-width: 760px)').matches;
}

function authError(error: unknown): Error | null {
  const code = error && typeof error === 'object' && 'code' in error ? error.code : '';
  if (code === 'auth/configuration-not-found' || code === 'auth/operation-not-allowed') {
    return new Error('Google sign-in is not enabled yet. Enable the Google provider in Firebase Authentication, then try again.');
  }
  if (code === 'auth/unauthorized-domain') {
    return new Error('This website is not authorized for Google sign-in yet. Add wardrobe-ai-six.vercel.app to Firebase Authentication → Settings → Authorized domains.');
  }
  if (code === 'auth/popup-blocked') {
    return new Error('Your browser blocked the Google sign-in window. Allow popups for this app, then try again.');
  }
  if (code === 'auth/popup-closed-by-user') {
    return new Error('Google sign-in was closed before it finished. Please try again.');
  }
  return error instanceof Error ? error : new Error('Google sign-in could not be completed. Please try again.');
}

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
    if (mobileWebBrowser()) {
      await signInWithRedirect(services.auth, provider);
      return null;
    }
    return await signInWithPopup(services.auth, provider);
  } catch (error) {
    throw authError(error);
  }
}

export async function finishGoogleSignIn() {
  const services = firebaseServices();
  if (!services || !mobileWebBrowser()) return null;
  try {
    return await getRedirectResult(services.auth);
  } catch (error) {
    throw authError(error);
  }
}

export async function logOut() {
  const services = firebaseServices();
  if (services) await signOut(services.auth);
}
