import { collection, deleteDoc, doc, getDocs, setDoc } from 'firebase/firestore';
import { firebaseServices } from './firebaseClient';
import { isSavedOutfit } from './outfitModel';
import type { SavedOutfit } from './outfitModel';

function servicesFor(uid: string) {
  const services = firebaseServices();
  if (!services || services.auth.currentUser?.uid !== uid) throw new Error('Your account changed. Please try again.');
  return services;
}

export async function loadCloudOutfits(uid: string): Promise<SavedOutfit[]> {
  const services = servicesFor(uid);
  const snapshot = await getDocs(collection(services.db, 'users', uid, 'outfits'));
  return snapshot.docs.map(document => {
    const value = document.data();
    if (!isSavedOutfit(value)) throw new Error('A saved outfit could not be read.');
    return value;
  }).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export async function saveCloudOutfit(uid: string, outfit: SavedOutfit): Promise<void> {
  const services = servicesFor(uid);
  if (!isSavedOutfit(outfit)) throw new Error('This outfit could not be saved.');
  await setDoc(doc(services.db, 'users', uid, 'outfits', outfit.id), outfit);
}

export async function deleteCloudOutfit(uid: string, id: string): Promise<void> {
  const services = servicesFor(uid);
  await deleteDoc(doc(services.db, 'users', uid, 'outfits', id));
}
