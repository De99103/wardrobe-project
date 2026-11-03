import { storageAccount } from './firebaseClient';
import { getLanguage } from './i18n';

export async function aiAuthorization() {
  const user = await storageAccount();
  if (!user) throw new Error(getLanguage() === 'ar' ? 'سجّل الدخول لاستخدام توصيات الذكاء الاصطناعي وتحليل الصور.' : 'Sign in to use AI recommendations and photo analysis.');
  return `Bearer ${await user.getIdToken()}`;
}
