import AsyncStorage from '@react-native-async-storage/async-storage';
import type { ClothingStatus, ImportedProduct, SavedClothing } from '../types/clothing';
import { storageAccount, loadCloudClothing, saveCloudClothing, deleteCloudClothing, moveCloudClothingToWardrobe } from './cloudWardrobe';
import { isImportedProduct } from './productValidation';
import { withInferredStyling } from './stylingTags';

const KEY = 'wardrobe-ai:clothing:v1';
let pending: Promise<void> = Promise.resolve();

export async function loadDeviceClothing(): Promise<SavedClothing[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (raw === null) return [];
  const data: unknown = JSON.parse(raw);
  if (!Array.isArray(data) || !data.every(item => item && typeof item === 'object'
      && (item.status === 'owned' || item.status === 'wishlist') && typeof item.savedAt === 'string'
      && isImportedProduct(item))) {
    throw new Error('Saved clothing could not be read. Your stored data has been preserved.');
  }
  return data as SavedClothing[];
}

export async function loadClothing(): Promise<SavedClothing[]> {
  const user = await storageAccount();
  return user ? loadCloudClothing(user.uid) : loadDeviceClothing();
}

export async function uploadDeviceClothing(): Promise<number> {
  const user = await storageAccount();
  if (!user) throw new Error('Sign in before uploading device items.');
  const items = await loadDeviceClothing();
  for (const item of items) await saveCloudClothing(user.uid, item);
  return items.length;
}

export function saveClothing(product: ImportedProduct, status: ClothingStatus): Promise<void> {
  const session = storageAccount();
  const operation = pending.then(async () => {
    const styledProduct = withInferredStyling(product);
    const user = await session;
    if (user) {
      await saveCloudClothing(user.uid, { ...styledProduct, status, savedAt: new Date().toISOString() });
      return;
    }
    const items = await loadDeviceClothing();
    // A product can belong to each collection once; re-saving updates its details.
    const remaining = items.filter(item => item.sourceUrl !== styledProduct.sourceUrl || item.status !== status);
    await AsyncStorage.setItem(KEY, JSON.stringify([
      { ...styledProduct, status, savedAt: new Date().toISOString() }, ...remaining,
    ]));
  });
  pending = operation.catch(() => undefined);
  return operation;
}

export function deleteClothing(item: Pick<SavedClothing, 'sourceUrl' | 'status'>): Promise<void> {
  const session = storageAccount();
  const operation = pending.then(async () => {
    const user = await session;
    if (user) {
      await deleteCloudClothing(user.uid, item);
      return;
    }
    const items = await loadDeviceClothing();
    await AsyncStorage.setItem(KEY, JSON.stringify(items.filter(saved =>
      saved.sourceUrl !== item.sourceUrl || saved.status !== item.status)));
  });
  pending = operation.catch(() => undefined);
  return operation;
}

export function moveToWardrobe(sourceUrl: string): Promise<void> {
  const session = storageAccount();
  const operation = pending.then(async () => {
    const user = await session;
    if (user) {
      await moveCloudClothingToWardrobe(user.uid, sourceUrl);
      return;
    }
    const items = await loadDeviceClothing();
    const source = items.find(item => item.sourceUrl === sourceUrl && item.status === 'wishlist');
    if (!source) throw new Error('This wishlist item is no longer available. Refresh your collection.');
    const remaining = items.filter(item => item.sourceUrl !== sourceUrl || item.status !== 'wishlist');
    if (!remaining.some(item => item.sourceUrl === sourceUrl && item.status === 'owned')) {
      remaining.unshift({ ...source, status: 'owned', savedAt: new Date().toISOString() });
    }
    // One local write: never remove the wishlist entry before the wardrobe copy is persisted.
    await AsyncStorage.setItem(KEY, JSON.stringify(remaining));
  });
  pending = operation.catch(() => undefined);
  return operation;
}
