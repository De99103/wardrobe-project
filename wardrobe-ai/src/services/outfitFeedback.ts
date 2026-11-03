import AsyncStorage from '@react-native-async-storage/async-storage';
import { storageAccount } from './firebaseClient';

export const feedbackReasons = ['too_warm', 'too_cold', 'too_formal', 'too_casual', 'colors', 'comfort', 'not_my_style', 'more_elegant', 'more_interesting', 'minimal'] as const;
export type FeedbackReason = typeof feedbackReasons[number];
export type OutfitFeedback = { sourceUrls: string[]; rating: 'like' | 'dislike'; occasion: string; reason?: FeedbackReason };
let pending = Promise.resolve();
async function key() {
  const user = await storageAccount();
  return `wearly:feedback:v1:${user?.uid ?? 'guest'}`;
}
async function read(key: string): Promise<OutfitFeedback[]> {
  const raw = await AsyncStorage.getItem(key);
  if (!raw) return [];
  const rows = JSON.parse(raw);
  if (!Array.isArray(rows) || !rows.every(row => row && ['like', 'dislike'].includes(row.rating)
    && typeof row.occasion === 'string' && (row.reason === undefined || feedbackReasons.includes(row.reason)) && Array.isArray(row.sourceUrls)
    && row.sourceUrls.every((url: unknown) => typeof url === 'string'))) {
    throw new Error('Could not read outfit feedback.');
  }
  return rows.slice(0, 20);
}
export async function loadOutfitFeedback() {
  await pending;
  return read(await key());
}
export function saveOutfitFeedback(value: OutfitFeedback) {
  const owner = key();
  const operation = pending.then(async () => {
    const target = await owner;
    const rows = await read(target);
    const signature = (row: OutfitFeedback) => JSON.stringify([...row.sourceUrls].sort());
    await AsyncStorage.setItem(target, JSON.stringify([value, ...rows.filter(row => signature(row) !== signature(value))].slice(0, 20)));
  });
  pending = operation.catch(() => undefined);
  return operation;
}
