import { useState } from 'react';
import { ActivityIndicator, Image, Pressable, View } from 'react-native';
import { Link } from 'expo-router';
import { Text, TextInput } from './AppTypography';
import { saveManualOutfit, type SavedOutfit } from '../services/outfitStorage';
import type { SavedClothing } from '../types/clothing';
import type { OutfitEnvironment } from '../services/outfitApi';
import { useLanguage } from '../services/i18n';
import { styles } from '../styles/collectionStyles';
import { styles as formStyles } from '../styles/homeStyles';
import { BrandColors } from '../constants/brand';

const occasions = ['Everyday', 'Work', 'School', 'Dinner', 'Going out', 'Other'] as const;
const arOccasions = ['يومي', 'العمل', 'المدرسة', 'العشاء', 'الخروج', 'أخرى'];
export function OutfitBuilder({ items, onSaved }: { items: SavedClothing[]; onSaved: (saved: SavedOutfit) => void }) {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [occasion, setOccasion] = useState<string>('Everyday');
  const [customOccasion, setCustomOccasion] = useState('');
  const [environment, setEnvironment] = useState<OutfitEnvironment>('mixed');
  const [selected, setSelected] = useState<string[]>([]);
  const [search, setSearch] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const owned = items.filter(item => item.status === 'owned');
  const visible = owned.filter(item => [item.name, item.category, item.color].join(' ').toLowerCase().includes(search.toLowerCase().trim()));
  const canSave = selected.length > 0 && !!title.trim() && (occasion !== 'Other' || !!customOccasion.trim());
  async function save() {
    setBusy(true); setMessage('');
    try {
      const saved = await saveManualOutfit({ title, sourceUrls: selected, occasion: occasion === 'Other' ? customOccasion : occasion, environment });
      onSaved(saved); setSelected([]); setTitle(''); setOpen(false); setSearch('');
      setMessage(ar ? 'تم حفظ إطلالتك. ستساعدنا في فهم ذوقك.' : 'Outfit saved. It will help us understand your style.');
    } catch { setMessage(ar ? 'تعذّر حفظ الإطلالة. تحقق من اتصالك ومن أن القطع ما زالت في خزانتك، ثم حاول مجدداً.' : 'Could not save this outfit. Check your connection and that the pieces are still in your wardrobe, then try again.'); }
    finally { setBusy(false); }
  }
  return <View style={styles.accountCard}>
    <Pressable accessibilityRole="button" accessibilityState={{ expanded: open }} disabled={busy} onPress={() => { setOpen(!open); setMessage(''); }} style={styles.tertiaryButton}>
      <Text style={styles.tertiaryButtonText}>{ar ? (open ? 'إغلاق منشئ الإطلالات' : 'أنشئ إطلالتك الخاصة') : (open ? 'Close outfit builder' : 'Create your own outfit')}</Text>
    </Pressable>
    {!!message && <Text accessibilityRole="alert" style={styles.message}>{message}</Text>}
    {open && <>
      <Text style={styles.accountBody}>{ar ? 'اختر قطعاً من خزانتك وحدّد المناسبة ومكان ارتدائها. نستخدم إطلالاتك المحفوظة لتحسين اقتراحات هذا الملف.' : 'Choose wardrobe pieces, an occasion, and a setting. Your saved looks help personalize suggestions for this profile.'}</Text>
      {!owned.length ? <Link href="/add-item" style={styles.storeLink}>{ar ? 'أضف قطعاً إلى خزانتك أولاً' : 'Add wardrobe items first'}</Link> : <>
        <Text>{ar ? 'اسم الإطلالة' : 'Outfit name'}</Text>
        <TextInput value={title} onChangeText={setTitle} maxLength={120} editable={!busy} accessibilityLabel={ar ? 'اسم الإطلالة' : 'Outfit name'} placeholder={ar ? 'مثلاً: إطلالة العمل المفضلة' : 'e.g. My favorite work look'} style={formStyles.input} />
        <Text>{ar ? 'المناسبة' : 'Occasion'}</Text>
        <View style={{ flexDirection: ar ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 8 }}>
          {occasions.map((value, i) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: occasion === value }} disabled={busy} onPress={() => setOccasion(value)} style={[styles.chip, occasion === value && styles.selected]}><Text>{ar ? arOccasions[i] : value}</Text></Pressable>)}
        </View>
        {occasion === 'Other' && <TextInput value={customOccasion} onChangeText={setCustomOccasion} maxLength={200} editable={!busy} accessibilityLabel={ar ? 'مناسبة أخرى' : 'Custom occasion'} placeholder={ar ? 'اكتب المناسبة' : 'Enter an occasion'} style={formStyles.input} />}
        <Text>{ar ? 'أين سترتديها؟' : 'Where will you wear it?'}</Text>
        <View style={{ flexDirection: ar ? 'row-reverse' : 'row', flexWrap: 'wrap', gap: 8 }}>
          {(['indoors', 'outdoors', 'mixed'] as const).map((value, i) => <Pressable key={value} accessibilityRole="button" accessibilityState={{ selected: environment === value }} disabled={busy} onPress={() => setEnvironment(value)} style={[styles.chip, environment === value && styles.selected]}><Text>{(ar ? ['في الداخل', 'في الخارج', 'كلاهما'] : ['Indoors', 'Outdoors', 'Both'])[i]}</Text></Pressable>)}
        </View>
        <Text>{ar ? `القطع المختارة: ${selected.length} من ٨` : `${selected.length} of 8 pieces selected`}</Text>
        <TextInput value={search} onChangeText={setSearch} accessibilityLabel={ar ? 'ابحث في خزانتك' : 'Search wardrobe'} placeholder={ar ? 'ابحث في خزانتك' : 'Search wardrobe'} style={formStyles.input} />
        {!visible.length && <Text>{ar ? 'لا توجد قطع مطابقة.' : 'No matching pieces.'}</Text>}
        <View style={{ flexDirection: ar ? 'row-reverse' : 'row', flexWrap: 'wrap' }}>
          {visible.map(item => {
            const checked = selected.includes(item.sourceUrl);
            const disabled = busy || (!checked && selected.length >= 8);
            return <Pressable key={item.sourceUrl} accessibilityRole="checkbox" accessibilityState={{ checked, disabled }} accessibilityLabel={item.name ?? item.category ?? (ar ? 'قطعة' : 'Item')} disabled={disabled}
              onPress={() => setSelected(values => checked ? values.filter(url => url !== item.sourceUrl) : [...values, item.sourceUrl])}
              style={{ width: '50%', padding: 8, gap: 8, opacity: disabled ? 0.5 : 1, borderBottomWidth: checked ? 3 : 1, borderColor: checked ? BrandColors.charcoal : BrandColors.stone }}>
              {item.imageUrl ? <Image source={{ uri: item.imageUrl }} resizeMode="contain" style={{ height: 120, width: '100%', backgroundColor: BrandColors.stone }} /> : <View style={{ height: 120, backgroundColor: BrandColors.stone, justifyContent: 'center' }}><Text style={{ textAlign: 'center' }}>{item.category ?? (ar ? 'قطعة' : 'Item')}</Text></View>}
              <Text numberOfLines={2}>{item.name ?? item.category ?? (ar ? 'قطعة' : 'Item')}</Text>
              <Text style={styles.message}>{checked ? (ar ? 'مختارة' : 'Selected') : (ar ? 'اختيار' : 'Select')}</Text>
            </Pressable>;
          })}
        </View>
        <Pressable accessibilityRole="button" disabled={busy || !canSave} style={[styles.button, (busy || !canSave) && { opacity: 0.5 }]} onPress={save}><Text style={styles.buttonText}>{ar ? 'احفظ إطلالتي' : 'Save my outfit'}</Text></Pressable>
        {busy && <ActivityIndicator />}
      </>}
    </>}
  </View>;
}
