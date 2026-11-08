import { useEffect, useState } from 'react';
import { ActivityIndicator, Pressable, View } from 'react-native';
import { router } from 'expo-router';
import { Text, TextInput } from './AppTypography';
import { useActiveProfile } from './ProfileLink';
import { createExtraProfile, loadExtraProfile, switchProfile, type ExtraProfile } from '../services/accountProfiles';
import { useLanguage } from '../services/i18n';
import { styles } from '../styles/collectionStyles';
import { styles as formStyles } from '../styles/homeStyles';

export function AccountProfiles({ uid, mainName }: { uid: string; mainName: string }) {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const active = useActiveProfile();
  const [extra, setExtra] = useState<ExtraProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [retry, setRetry] = useState(0);
  useEffect(() => {
    let mounted = true;
    setLoading(true); setError('');
    loadExtraProfile(uid).then(value => { if (mounted) setExtra(value); })
      .catch(() => { if (mounted) setError(ar ? 'تعذّر تحميل الملفات. حاول مرة أخرى.' : 'Could not load profiles. Please try again.'); })
      .finally(() => { if (mounted) setLoading(false); });
    return () => { mounted = false; };
  }, [uid, ar, retry]);
  async function open(id: 'main' | 'secondary') {
    setBusy(true); setError('');
    try { await switchProfile(uid, id); router.replace('/'); }
    catch { setError(ar ? 'تعذّر تبديل الملف. حاول مرة أخرى.' : 'Could not switch profiles. Please try again.'); }
    finally { setBusy(false); }
  }
  async function create() {
    setBusy(true); setError('');
    try { const created = await createExtraProfile(uid, name); setExtra(created); setName(''); }
    catch { setError(ar ? 'تعذّر إنشاء الملف. حاول مجدداً. يُسمح بملفين فقط لكل حساب.' : 'Could not create the profile. Please try again. Each account can have two profiles.'); }
    finally { setBusy(false); }
  }
  return <View style={styles.accountCard}>
    <Text style={styles.accountName}>{ar ? 'ملفات الحساب' : 'Account profiles'}</Text>
    <Text style={styles.accountBody}>{ar ? 'يفتح الملف الرئيسي تلقائياً عند تسجيل الدخول أو إعادة فتح التطبيق. يمكنك إضافة ملف واحد لطفلك أو لأحد أفراد عائلتك.' : 'Your main profile opens automatically when you sign in or reopen the app. Add one other profile for a child or family member.'}</Text>
    <Text style={styles.message}>{ar ? 'لكل ملف خزانته وقائمة رغباته وإطلالاته وتفضيلاته. يمكن لصاحب الحساب الوصول إلى كليهما.' : 'Each profile has its own wardrobe, wishlist, outfits, and preferences. The account owner can access both.'}</Text>
    <Pressable accessibilityRole="button" accessibilityState={{ selected: active.id === 'main' }} disabled={busy} style={[styles.tertiaryButton, active.id === 'main' && styles.selected]} onPress={() => open('main')}>
      <Text style={styles.tertiaryButtonText}>{mainName}</Text>
      <Text style={styles.message}>{ar ? (active.id === 'main' ? 'الملف الرئيسي · نشط' : 'فتح الملف الرئيسي') : (active.id === 'main' ? 'Main profile · Active' : 'Open main profile')}</Text>
    </Pressable>
    {loading ? <ActivityIndicator /> : extra ? <Pressable accessibilityRole="button" accessibilityState={{ selected: active.id === 'secondary' }} disabled={busy} style={[styles.tertiaryButton, active.id === 'secondary' && styles.selected]} onPress={() => open('secondary')}>
      <Text style={styles.tertiaryButtonText}>{extra.displayName}</Text>
      <Text style={styles.message}>{ar ? (active.id === 'secondary' ? 'نشط' : 'فتح هذا الملف') : (active.id === 'secondary' ? 'Active' : 'Open this profile')}</Text>
    </Pressable> : !error && <View style={{ gap: 12 }}>
      <Text style={styles.accountBody}>{ar ? 'إضافة ملف آخر' : 'Add another profile'}</Text>
      <TextInput value={name} onChangeText={setName} maxLength={80} editable={!busy} accessibilityLabel={ar ? 'اسم الملف' : 'Profile name'} placeholder={ar ? 'الاسم' : 'Name'} style={formStyles.input} />
      <Pressable accessibilityRole="button" disabled={busy || !name.trim()} style={[styles.button, (busy || !name.trim()) && { opacity: 0.5 }]} onPress={create}><Text style={styles.buttonText}>{ar ? 'إنشاء الملف' : 'Create profile'}</Text></Pressable>
    </View>}
    {extra && <Text style={styles.message}>{ar ? 'تم استخدام الملفين المتاحين لهذا الحساب.' : 'Both profile slots are now in use.'}</Text>}
    {!!error && <><Text accessibilityRole="alert" style={[styles.message, styles.error]}>{error}</Text><Pressable accessibilityRole="button" disabled={busy} style={styles.tertiaryButton} onPress={() => setRetry(value => value + 1)}><Text>{ar ? 'حاول مجدداً' : 'Try again'}</Text></Pressable></>}
    {busy && <ActivityIndicator />}
  </View>;
}
