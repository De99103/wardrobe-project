import { collection, doc, getDocs, setDoc, deleteDoc, runTransaction } from 'firebase/firestore';
import * as Crypto from 'expo-crypto';
import { firebaseServices, storageAccount } from './firebaseClient';
import { isImportedProduct } from './productValidation';
import { withInferredStyling } from './stylingTags';
import type { SavedClothing } from '../types/clothing';

export { storageAccount };

export async function loadCloudClothing(uid: string): Promise<SavedClothing[]> {
  const services = firebaseServices();
  if (!services || services.auth.currentUser?.uid !== uid) throw new Error('Your account changed. Please try again.');
  const snapshot = await getDocs(collection(services.db, 'users', uid, 'clothing'));
  return snapshot.docs.map(document => {
    const value = document.data();
    if (!isImportedProduct(value) || !('status' in value) || !('savedAt' in value)
      || (value.status !== 'owned' && value.status !== 'wishlist') || typeof value.savedAt !== 'string') {
      throw new Error('A cloud item could not be read.');
    }
    return value as SavedClothing;
  }).sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export async function saveCloudClothing(uid: string, item: SavedClothing): Promise<void> {
  const services = firebaseServices();
  if (!services || services.auth.currentUser?.uid !== uid) throw new Error('Your account changed. Please try again.');
  const id = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, JSON.stringify([item.status, item.sourceUrl]));
  if (services.auth.currentUser?.uid !== uid) throw new Error('Your account changed. Please try again.');
  // Compressed device photos are kept in the owner-only Firestore document.
  // No Firebase Storage bucket or billing upgrade is required.
  if (item.imageUrl?.startsWith('data:') &&
      (item.imageUrl.length > 300023 || !/^data:image\/jpeg;base64,[A-Za-z0-9+/]+={0,2}$/.test(item.imageUrl))) {
    throw new Error('This photo cannot be saved. Please choose it again.');
  }
  const styledItem = withInferredStyling(item);
  // Save only the product fields, not temporary backend/debug properties.
  const keys: (keyof SavedClothing)[] = ['name', 'brand', 'category', 'subcategory', 'color', 'material', 'price', 'currency', 'imageUrl', 'sourceUrl', 'status', 'savedAt'];
  if (styledItem.styling !== undefined) keys.push('styling');
  const value = Object.fromEntries(keys.map(key => [key, styledItem[key]]));
  await setDoc(doc(services.db, 'users', uid, 'clothing', id), value);
}

export async function deleteCloudClothing(uid: string, item: Pick<SavedClothing, 'sourceUrl' | 'status'>): Promise<void> {
  const services = firebaseServices();
  if (!services || services.auth.currentUser?.uid !== uid) throw new Error('Your account changed. Please try again.');
  const id = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, JSON.stringify([item.status, item.sourceUrl]));
  if (services.auth.currentUser?.uid !== uid) throw new Error('Your account changed. Please try again.');
  await deleteDoc(doc(services.db, 'users', uid, 'clothing', id));
}

export async function moveCloudClothingToWardrobe(uid: string, sourceUrl: string): Promise<void> {
  const services = firebaseServices();
  if (!services || services.auth.currentUser?.uid !== uid) throw new Error('Your account changed. Please try again.');
  const [wishlistId, ownedId] = await Promise.all(['wishlist', 'owned'].map(status =>
    Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, JSON.stringify([status, sourceUrl]))));
  const wishlist = doc(services.db, 'users', uid, 'clothing', wishlistId);
  const owned = doc(services.db, 'users', uid, 'clothing', ownedId);
  await runTransaction(services.db, async transaction => {
    if (services.auth.currentUser?.uid !== uid) throw new Error('Your account changed. Please try again.');
    const source = await transaction.get(wishlist);
    const target = await transaction.get(owned);
    if (!source.exists()) throw new Error('This wishlist item is no longer available. Refresh your collection.');
    const item = source.data();
    if (!isImportedProduct(item) || !('status' in item) || item.status !== 'wishlist' || item.sourceUrl !== sourceUrl) throw new Error('Could not read this wishlist item.');
    // Preserve an existing wardrobe copy, including any details the user corrected.
    if (!target.exists()) transaction.set(owned, { ...item, status: 'owned', savedAt: new Date().toISOString() });
    transaction.delete(wishlist);
  });
}
