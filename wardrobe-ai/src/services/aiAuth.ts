import { storageAccount } from './firebaseClient';
import { getLanguage } from './i18n';
import { AiSignInRequiredError } from './aiErrors';

export async function aiAuthorization() {
  const user = await storageAccount();
  if (!user) throw new AiSignInRequiredError(getLanguage());
  try {
    return `Bearer ${await user.getIdToken()}`;
  } catch (error) {
    const code = error && typeof error === 'object' && 'code' in error ? error.code : '';
    if (['auth/user-token-expired', 'auth/invalid-user-token', 'auth/user-disabled'].includes(String(code))) {
      throw new AiSignInRequiredError(getLanguage());
    }
    if (code === 'auth/network-request-failed') {
      throw new Error(getLanguage() === 'ar' ? 'تحقق من اتصالك بالإنترنت وحاول مجدداً.' : 'Check your internet connection and try again.');
    }
    throw error;
  }
}
