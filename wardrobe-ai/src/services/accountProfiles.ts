import { doc, getDoc, runTransaction } from 'firebase/firestore';
import { firebaseServices, storageAccount } from './firebaseClient';
import { activateProfile, resetAccountProfile } from './profileSession';
import type { ProfileId } from './profileSession';

export type ExtraProfile = { displayName: string; createdAt: string };
export function profileName(value: string): string {
  const name = value.trim();
  if (!name || name.length > 80) throw new Error('Enter a profile name between 1 and 80 characters.');
  return name;
}
function servicesFor(uid: string) {
  const services = firebaseServices();
  if (!services || services.auth.currentUser?.uid !== uid) throw new Error('Your account changed. Please try again.');
  return services;
}
export async function loadExtraProfile(uid: string): Promise<ExtraProfile | null> {
  const services = servicesFor(uid);
  const snapshot = await getDoc(doc(services.db, 'users', uid, 'profiles', 'secondary'));
  servicesFor(uid);
  if (!snapshot.exists()) return null;
  const data = snapshot.data();
  if (typeof data.displayName !== 'string' || typeof data.createdAt !== 'string') throw new Error('Could not read this profile.');
  return { displayName: profileName(data.displayName), createdAt: data.createdAt };
}
export async function createExtraProfile(uid: string, name: string): Promise<ExtraProfile> {
  const services = servicesFor(uid);
  const profile = { displayName: profileName(name), createdAt: new Date().toISOString() };
  const ref = doc(services.db, 'users', uid, 'profiles', 'secondary');
  await runTransaction(services.db, async transaction => {
    const existing = await transaction.get(ref);
    servicesFor(uid);
    if (existing.exists()) throw new Error('This account already has two profiles.');
    transaction.set(ref, profile);
  });
  return profile;
}
export async function switchProfile(uid: string, id: ProfileId) {
  const user = await storageAccount();
  if (!user || user.uid !== uid) throw new Error('Your account changed. Please try again.');
  const profile = id === 'secondary' ? await loadExtraProfile(uid) : null;
  if (id === 'secondary' && !profile) throw new Error('Create the additional profile first.');
  servicesFor(uid);
  resetAccountProfile(uid);
  activateProfile(uid, id, profile?.displayName ?? '');
}
