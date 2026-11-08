import { getProfileSession, profileIdFor } from './profileSession';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as Crypto from 'expo-crypto';
import { storageAccount } from './firebaseClient';
import { deleteCloudOutfit, loadCloudOutfits, saveCloudOutfit } from './cloudOutfits';
import { loadClothing } from './wardrobeStorage';
import { assertActiveProfile } from './profileSession';
import { isSavedOutfit, makeSavedOutfit, makeManualOutfit, type ManualOutfitInput } from './outfitModel';
import type { SavedOutfit } from './outfitModel';
import type { OutfitRecommendation } from './outfitApi';

const KEY = 'wardrobe-ai:outfits:v1';
let pending: Promise<void> = Promise.resolve();

export async function loadDeviceOutfits(): Promise<SavedOutfit[]> {
  const raw = await AsyncStorage.getItem(KEY);
  if (raw === null) return [];
  const data: unknown = JSON.parse(raw);
  if (!Array.isArray(data) || !data.every(isSavedOutfit)) {
    throw new Error('Saved outfits could not be read. Your stored data has been preserved.');
  }
  return data.sort((a, b) => b.savedAt.localeCompare(a.savedAt));
}

export async function loadSavedOutfits(): Promise<SavedOutfit[]> {
  const profile = getProfileSession();
  const user = await storageAccount();
  return user ? loadCloudOutfits(user.uid, profileIdFor(user.uid, profile)) : loadDeviceOutfits();
}

export function saveOutfit(recommendation: OutfitRecommendation, occasion: string): Promise<SavedOutfit> {
  const profile = getProfileSession();
  const session = storageAccount();
  const saved = makeSavedOutfit(recommendation, occasion, Crypto.randomUUID(), new Date().toISOString());
  return persistOutfit(saved, session, profile);
}

function persistOutfit(saved: SavedOutfit, session: ReturnType<typeof storageAccount>, profile: ReturnType<typeof getProfileSession>): Promise<SavedOutfit> {
  const operation = pending.then(async () => {
    const user = await session;
    if (user) await saveCloudOutfit(user.uid, saved, profileIdFor(user.uid, profile));
    else {
      const outfits = await loadDeviceOutfits();
      await AsyncStorage.setItem(KEY, JSON.stringify([saved, ...outfits]));
    }
  });
  pending = operation.catch(() => undefined);
  return operation.then(() => saved);
}

export function deleteSavedOutfit(id: string): Promise<void> {
  const profile = getProfileSession();
  const session = storageAccount();
  const operation = pending.then(async () => {
    const user = await session;
    if (user) await deleteCloudOutfit(user.uid, id, profileIdFor(user.uid, profile));
    else {
      const outfits = await loadDeviceOutfits();
      await AsyncStorage.setItem(KEY, JSON.stringify(outfits.filter(outfit => outfit.id !== id)));
    }
  });
  pending = operation.catch(() => undefined);
  return operation;
}

export type { SavedOutfit } from './outfitModel';

export async function saveManualOutfit(input: ManualOutfitInput): Promise<SavedOutfit> {
  const profile = getProfileSession();
  const session = storageAccount();
  const wardrobe = await loadClothing();
  const user = await session;
  if (user) assertActiveProfile(user.uid, profileIdFor(user.uid, profile));
  const saved = makeManualOutfit(input, wardrobe, Crypto.randomUUID(), new Date().toISOString());
  return persistOutfit(saved, session, profile);
}
