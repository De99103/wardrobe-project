import AsyncStorage from '@react-native-async-storage/async-storage';
import { useEffect, useSyncExternalStore } from 'react';

export type AppLanguage = 'en' | 'ar';
const KEY = 'wearly:language:v1';
function browserLanguage(): AppLanguage {
  try {
    const value = typeof window !== 'undefined' ? window.localStorage.getItem(KEY) : null;
    return value === 'ar' ? 'ar' : 'en';
  } catch {
    return 'en';
  }
}
let language: AppLanguage = browserLanguage();
const listeners = new Set<() => void>();
let revision = 0;
let hydration: Promise<void> | undefined;
let persistence = Promise.resolve();
function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => { listeners.delete(listener); };
}
function hydrateLanguage() {
  if (hydration) return hydration;
  const startedAt = revision;
  hydration = AsyncStorage.getItem(KEY).then(saved => {
    if (revision !== startedAt) return;
    if (saved === 'ar' || saved === 'en') {
      language = saved;
      listeners.forEach(listener => listener());
    }
  }).catch(() => { /* Keep the in-memory preference if storage is unavailable. */ });
  return hydration;
}

const arabic: Record<string, string> = {
  'Information': 'معلومات', 'Sign in': 'تسجيل الدخول', 'Account': 'الحساب', 'Welcome to WEARLY': 'مرحباً بك في ويرلي',
  'First time here?': 'أول مرة هنا؟', 'Visit Information': 'اطّلع على المعلومات', 'My wardrobe': 'خزانتي', 'Wishlist': 'قائمة الرغبات',
  'COLLECTION': 'المجموعة', 'SAVED FOR LATER': 'محفوظة لاحقاً', 'Browse everything you own': 'تصفّح كل ما تملكه',
  'Keep an eye on future finds': 'احتفظ بالقطع التي تعجبك', 'Style an outfit  →': 'نسّق إطلالة  ←', 'With AI recommendation': 'بتوصية من الذكاء الاصطناعي',
  'Add a piece  →': 'أضف قطعة  ←', 'Manually or using a store link': 'يدوياً أو عبر رابط متجر',
  'Made by Deema Abo Gheda · © 2026': 'صنع بواسطة ديما ابو غيدا · © 2026', 'Collection': 'المجموعة', 'Home': 'الرئيسية', 'Back': 'رجوع',
  'Outfit stylist': 'منسّق الإطلالات', 'What should I wear?': 'ماذا أرتدي؟', 'Weather-aware styling': 'تنسيق حسب الطقس',
  'A considered outfit made from pieces you already own, styled for today’s weather and your plans.': 'إطلالة متناسقة من القطع التي تملكها، ومنسّقة حسب طقس اليوم وخططك.',
  'Set the scene': 'حدّد المناسبة', 'City': 'المدينة', 'Today': 'اليوم', 'Tomorrow': 'غداً',
  'Wishlist pieces stay out of your recommendation.': 'قطع قائمة الرغبات لا تدخل في اقتراحك.',
  'When will you wear it?': 'متى سترتديها؟', 'Choose Today or Tomorrow, add a time, or use either one on its own.': 'اختر اليوم أو غداً، أضف الوقت، أو استخدم أحدهما فقط.',
  'What are you dressing for?': 'لأي مناسبة ترتدي؟', 'Everyday': 'يومي', 'Work': 'العمل', 'Dinner': 'العشاء', 'Going out': 'خروج',
  'Where will you spend most of the time?': 'أين ستقضي معظم الوقت؟', 'Mostly indoors': 'غالباً في الداخل', 'Mostly outdoors': 'غالباً في الخارج', 'A mix of both': 'مزيج من الاثنين',
  'Do you wear a hijab?': 'هل ترتدين الحجاب؟', 'Yes': 'نعم', 'No': 'لا', 'Recommend an outfit  →': 'اقترح إطلالة  →', 'Show another look  →': 'اعرض إطلالة أخرى  ←', 'Style another outfit  →': 'نسّق إطلالة أخرى  ←',
  'Current weather': 'الطقس الحالي', 'The pieces': 'القطع', 'Complete the look': 'أكمل الإطلالة', 'Hijab color suggestion': 'اقتراح لون الحجاب',
  'Save this outfit': 'احفظ هذه الإطلالة', 'Saved outfits': 'الإطلالات المحفوظة', 'Keep looks you want to wear again.': 'احتفظ بالإطلالات التي تريد ارتداءها مجدداً.',
  'Add manually': 'إضافة يدوية', 'Import a link': 'اضافة عبر رابط', 'My Wardrobe': 'خزانتي', 'My Wishlist': 'قائمة رغباتي',
  'How Wearly works': 'كيف تعمل Wearly', 'About the creator': 'عن المنشئة', 'Your account and privacy': 'حسابك وخصوصيتك', 'What comes next': 'ما القادم',
  'Your collection': 'مجموعتك', 'YOUR COLLECTION': 'مجموعتك', 'Everything you own, ready to style.': 'كل ما تملكه، جاهز للتنسيق.',
  'Pieces you are considering for your collection.': 'قطع تفكر في إضافتها إلى مجموعتك.', 'Wardrobe': 'الخزانة',
  'All': 'الكل', 'Tops': 'القطع العلوية', 'Bottoms': 'القطع السفلية', 'Dresses': 'فساتين', 'Outerwear': 'ملابس خارجية',
  'Shoes': 'أحذية', 'Accessories': 'إكسسوارات', 'Uncategorized': 'غير مصنّف', 'Sort': 'ترتيب', 'Type': 'النوع', 'Newest': 'الأحدث', 'Name':'الاسم',
  'Recently added': 'أضيفت مؤخراً', 'Clothing': 'ملابس',
  'A quick guide to adding clothes, organizing them, and creating outfits.': 'دليل سريع لإضافة الملابس وتنظيمها وإنشاء الإطلالات.',
  'Add your clothes': 'أضف ملابسك',
  'Add a piece manually with an optional photo, or paste a public store link. If a store page is incomplete, edit the imported details yourself before saving.': 'أضف قطعة يدوياً مع صورة اختيارية، أو الصق رابطاً عاماً من متجر. إذا كانت صفحة المتجر ناقصة، عدّل التفاصيل المستوردة بنفسك قبل الحفظ.',
  'Organize your collection': 'نظّم مجموعتك',
  'Wardrobe is for pieces you own. Wishlist is for pieces you may buy. Wishlist items can be moved to Wardrobe after you buy them.': 'خزانة الملابس للقطع التي تملكها. قائمة الرغبات للقطع التي قد تشتريها. يمكنك نقل القطع إلى الخزانة بعد شرائها.',
  'Create an outfit': 'أنشئ إطلالة',
  'Choose your city, occasion, planned time, and whether you will be indoors or outdoors. Compare up to three ranked looks from clothes you own, using weather for that time. Small wardrobes may have fewer distinct combinations.': 'اختر مدينتك ومناسبتك والوقت المحدد وما إذا كنت في الداخل أو الخارج. قارن حتى ثلاث إطلالات مرتبة من ملابسك، باستخدام الطقس لذلك الوقت. قد تحتوي الخزائن الصغيرة على خيارات أقل تنوعاً.',
  'Save a look': 'احفظ إطلالة',
  'Save recommendations you want to wear again. Each saved look keeps its occasion, weather, selected pieces, and styling note.': 'احفظ التوصيات التي تريد ارتداءها مجدداً. تحتفظ كل إطلالة محفوظة بمناسبتها وطقسها وقطعها وملاحظة التنسيق.',
  'Without sign-in, clothes and outfits stay on this device. With Google sign-in, they are stored in your private Firebase account so you can use them across devices.': 'بدون تسجيل الدخول، تبقى الملابس والإطلالات على هذا الجهاز. مع تسجيل الدخول عبر Google، تُحفظ في حسابك الخاص على Firebase لتتمكن من استخدامها على أجهزة متعددة.',
  'Wishlist price-drop alerts and native App Store and Google Play builds are planned next. Price alerts are not active yet.': 'من المخطط إضافة تنبيهات انخفاض أسعار قائمة الرغبات وإصدارات أصلية لمتجر App Store وGoogle Play. تنبيهات الأسعار غير مفعّلة بعد.',
  'The person behind Wearly': 'الشخص وراء Wearly',
  'Wearly is independently created and owned by Deema. It was made to make getting dressed feel simpler, more personal, and easier to enjoy every day.': 'تم إنشاء Wearly وامتلاكها بشكل مستقل من قِبل Deema. صُممت لتجعل اختيار الملابس أبسط وأكثر خصوصية ومتعة كل يوم.',
  'Profile & sync': 'الملف الشخصي والمزامنة', 'Your account': 'حسابك',
  'Keep your wardrobe private, backed up, and available across devices.': 'حافظ على خصوصية خزانة ملابسك ونسخها الاحتياطي وإتاحتها على جميع أجهزتك.',
  'Saved on device': 'محفوظ على الجهاز', 'Firebase is not connected yet. Your collection is safely stored on this device.': 'لم يتم ربط Firebase بعد. مجموعتك محفوظة بأمان على هذا الجهاز.',
  'Mobile sign-in is coming next': 'تسجيل الدخول عبر الهاتف قادم قريباً', 'Google sign-in currently works in the web app. Native sign-in needs the iOS and Android platform configuration.': 'يعمل تسجيل الدخول عبر Google حالياً في تطبيق الويب. يحتاج تسجيل الدخول الأصلي إلى إعداد منصتي iOS وAndroid.',
  'Cloud synced': 'تمت المزامنة مع السحابة', 'Your wardrobe and wishlist are stored in your private cloud collection.': 'خزانة ملابسك وقائمة رغباتك محفوظتان في مجموعتك السحابية الخاصة.',
  'Items saved on this device': 'العناصر المحفوظة على هذا الجهاز', 'Device items stay separate. Upload them only if they belong to this account.': 'تبقى عناصر الجهاز منفصلة. ارفعها فقط إذا كانت تخص هذا الحساب.',
  'Upload device items': 'رفع عناصر الجهاز', 'Sign out': 'تسجيل الخروج', 'Continue with Google': 'المتابعة باستخدام Google',
  'On mobile, Google opens securely in this window and returns you here.': 'على الهاتف، يفتح Google بأمان في هذه النافذة ثم يعيدك إلى هنا.',
};

export function translate(value: string, locale: AppLanguage = language): string { return locale === 'ar' ? arabic[value] ?? value : value; }
export function getLanguage(): AppLanguage { return language; }
export async function setLanguage(value: AppLanguage) {
  language = value;
  revision += 1;
  // Update the UI immediately. Persistence happens in the background and
  // must never delay or overwrite the user's explicit selection.
  listeners.forEach(listener => listener());
  try { if (typeof window !== 'undefined') window.localStorage.setItem(KEY, value); } catch { /* storage may be unavailable */ }
  persistence = persistence.then(() => AsyncStorage.setItem(KEY, value)).catch(() => { /* storage may be unavailable */ });
  await persistence;
}
export function useLanguage() {
  const value = useSyncExternalStore(subscribe, getLanguage, () => 'en' as AppLanguage);
  useEffect(() => {
    void hydrateLanguage();
  }, []);
  return { language: value, setLanguage };
}
