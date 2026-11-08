import { assertActiveProfile, profilePath, type ProfileId } from './profileSession';
import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import { firebaseServices } from './firebaseClient';
import { isSavedOutfit } from './outfitModel';
import type { SavedOutfit } from './outfitModel';

function servicesFor(uid: string, profile: ProfileId) {
  const services = firebaseServices();
  if (!services || services.auth.currentUser?.uid !== uid) throw new Error('Your account changed. Please try again.');
  assertActiveProfile(uid, profile);
  return services;
}

export async function loadCloudOutfits(uid: string, profile: ProfileId = 'main'): Promise<SavedOutfit[]> {
  const services = servicesFor(uid, profile);
  const snapshot = await getDocs(collection(services.db, profilePath(uid, profile, 'outfits')));
  return snapshot.docs.map(document => {
    const value = document.data();
    if (!isSavedOutfit(value)) throw new Error('A saved outfit could not be read.');
    return value;
  }).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export async function saveCloudOutfit(uid: string, outfit: SavedOutfit, profile: ProfileId = 'main'): Promise<void> {
  const services = servicesFor(uid, profile);
  if (!isSavedOutfit(outfit)) throw new Error('This outfit could not be saved.');
  await setDoc(doc(services.db, profilePath(uid, profile, 'outfits'), outfit.id), outfit);
}

export async function deleteCloudOutfit(uid: string, id: string, profile: ProfileId = 'main'): Promise<void> {
  const services = servicesFor(uid, profile);
  await deleteDoc(doc(services.db, profilePath(uid, profile, 'outfits'), id));
}
