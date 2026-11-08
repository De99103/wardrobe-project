export class AiSignInRequiredError extends Error {
  constructor(language: 'en' | 'ar') {
    super(language === 'ar'
      ? 'سجّل الدخول لمتابعة اقتراحات الإطلالات وتحليل الصور.'
      : 'Sign in to continue with outfit recommendations and photo analysis.');
    this.name = 'AiSignInRequiredError';
  }
}

export function aiServiceError(status: number, detail: unknown, language: 'en' | 'ar', fallback: string): Error {
  if (status === 401) return new AiSignInRequiredError(language);
  if (status === 503 && (detail === 'AI sign-in verification is not configured.'
    || detail === 'Sign-in verification is temporarily unavailable.')) {
    return new Error(language === 'ar'
      ? 'تعذّر على Wearly التحقق من تسجيل الدخول بسبب مشكلة في الخدمة. حاول لاحقاً، وإذا استمرت المشكلة فتواصل معنا عبر صفحة المعلومات.'
      : 'Wearly could not verify your sign-in because of a service problem. Try again later. If it continues, contact us through the Information page.');
  }
  return new Error(typeof detail === 'string' ? detail : fallback);
}
