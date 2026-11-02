import { doc, setDoc } from 'firebase/firestore';
import type { Firestore } from 'firebase/firestore';
import type { User } from 'firebase/auth';

export function profileData(user: Pick<User, 'uid' | 'displayName'>) {
  return {
    uid: user.uid,
    displayName: user.displayName?.trim().slice(0, 200) || 'Wearly user',
    updatedAt: new Date().toISOString(),
  };
}

export async function saveUserProfile(db: Firestore, user: Pick<User, 'uid' | 'displayName'>) {
  // Names can change or be shared by several people; the UID remains the ownership key.
  await setDoc(doc(db, 'users', user.uid), profileData(user), { merge: true });
}
