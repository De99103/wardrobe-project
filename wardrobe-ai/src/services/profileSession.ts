// Only one extra slot is allowed. The main slot keeps the original data paths.
export type ProfileId = 'main' | 'secondary';
export type ProfileSession = { uid: string | null; id: ProfileId; name: string; revision: number };
const initial: ProfileSession = { uid: null, id: 'main', name: '', revision: 0 };
let current = initial;
const listeners = new Set<() => void>();
export const getProfileSession = () => current;
export const getServerProfileSession = () => initial;
export function subscribeProfiles(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
function publish(value: Omit<ProfileSession, 'revision'>) {
  current = { ...value, revision: current.revision + 1 };
  listeners.forEach(listener => listener());
}
export function resetAccountProfile(uid: string | null) {
  if (current.uid !== uid) publish({ uid, id: 'main', name: '' });
}
export function activateProfile(uid: string, id: ProfileId, name = '') {
  if (current.uid !== uid) throw new Error('Your account changed. Please try again.');
  if (id !== 'main' && id !== 'secondary') throw new Error('Invalid profile.');
  if (current.id !== id || current.name !== name) publish({ uid, id, name });
}
export function profileIdFor(uid: string, session = current): ProfileId {
  return session.uid === uid ? session.id : 'main';
}
export function assertActiveProfile(uid: string, id: ProfileId) {
  if (profileIdFor(uid) !== id) throw new Error('Your profile changed. Please try again.');
}
export function profilePath(uid: string, id: ProfileId, collection: 'clothing' | 'outfits'): string {
  if (id !== 'main' && id !== 'secondary') throw new Error('Invalid profile.');
  return id === 'main' ? `users/${uid}/${collection}` : `users/${uid}/profiles/secondary/${collection}`;
}
