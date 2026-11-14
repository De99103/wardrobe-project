import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { Text, TextInput } from '../components/AppTypography';
import { BrandColors } from '../constants/brand';
import { categories, categoryLabel, clothingCategory } from '../services/collectionView';
import type { Category } from '../services/collectionView';
import { useLanguage } from '../services/i18n';
import { MAX_LOOK_PIECES, MIN_LOOK_PIECES } from '../services/outfitModel';
import { saveUserOutfit } from '../services/outfitStorage';
import { loadClothing } from '../services/wardrobeStorage';
import type { SavedClothing } from '../types/clothing';
import { styles } from '../styles/outfitStyles';

const occasionOptions = ['Everyday', 'Work', 'Dinner', 'Going out'] as const;
// Like the stylist, a look has one piece per category. Accessories (and anything
// uncategorized) can be combined freely.
const stackable = new Set<Category>(['accessories', 'uncategorized']);

export default function CreateOutfitScreen() {
  const { language } = useLanguage();
  const ar = language === 'ar';
  const [items, setItems] = useState<SavedClothing[]>([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<string[]>([]);
  const [occasion, setOccasion] = useState('Everyday');
  const [title, setTitle] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    loadClothing()
      .then(value => { if (active) setItems(value.filter(item => item.status === 'owned')); })
      .catch(() => { if (active) setError(ar ? 'تعذّر تحميل خزانتك.' : 'Could not load your wardrobe.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  // The wardrobe is loaded once; the language only affects the error text.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const sections = useMemo(() => categories
    .map(category => ({ category, data: items.filter(item => clothingCategory(item) === category) }))
    .filter(section => section.data.length), [items]);

  function toggle(item: SavedClothing) {
    setError('');
    setSelected(previous => {
      if (previous.includes(item.sourceUrl)) return previous.filter(url => url !== item.sourceUrl);
      const category = clothingCategory(item);
      const kept = stackable.has(category) ? previous
        : previous.filter(url => {
          const other = items.find(piece => piece.sourceUrl === url);
          return !other || clothingCategory(other) !== category;
        });
      if (kept.length >= MAX_LOOK_PIECES) {
        setError(ar ? `يمكنك اختيار ${MAX_LOOK_PIECES} قطع كحد أقصى.` : `A look can have at most ${MAX_LOOK_PIECES} pieces.`);
        return previous;
      }
      return [...kept, item.sourceUrl];
    });
  }

  async function save() {
    if (saving) return;
    if (selected.length < MIN_LOOK_PIECES) {
      setError(ar ? `اختر ${MIN_LOOK_PIECES} قطع على الأقل.` : `Choose at least ${MIN_LOOK_PIECES} pieces.`);
      return;
    }
    setSaving(true); setError('');
    try {
      await saveUserOutfit(selected, occasion, title);
      router.replace('/saved-outfits');
    } catch (reason) {
      const code = reason && typeof reason === 'object' && 'code' in reason ? reason.code : '';
      setError(code === 'permission-denied'
        ? 'Saving your own looks needs the updated Firestore rules (the optional "source" field). Publish firestore.rules, then try again.'
        : reason instanceof Error ? reason.message : 'Could not save this look.');
    } finally { setSaving(false); }
  }

  const counter = ar
    ? `${selected.length} مختارة · اختر من ${MIN_LOOK_PIECES} إلى ${MAX_LOOK_PIECES} قطع`
    : `${selected.length} selected · choose ${MIN_LOOK_PIECES}–${MAX_LOOK_PIECES} pieces`;

  return <View style={styles.container}>
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Teach your stylist</Text>
        <Text style={styles.heroTitle}>Create your own look</Text>
        <Text style={styles.heroSubtitle}>Pick the pieces of an outfit you love. Wearly learns your colors, formality and style from it to make better recommendations.</Text>
      </View>

      {loading ? <ActivityIndicator color={BrandColors.charcoal} /> : !items.length ? <View style={styles.setupCard}>
        <Text style={styles.sectionTitle}>Add a few pieces first</Text>
        <Text style={styles.sectionSubtitle}>Your looks are built from clothes in your wardrobe.</Text>
        <Pressable accessibilityRole="button" style={styles.button} onPress={() => router.push({ pathname: '/add-item', params: { status: 'owned' } })}>
          <Text style={styles.buttonText}>Add your first item</Text>
        </Pressable>
      </View> : <>
        <View style={styles.setupCard}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>1. Choose the pieces</Text>
            <Text style={styles.sectionSubtitle}>{counter}</Text>
          </View>
          {sections.map(section => <View key={section.category} style={styles.field}>
            <Text style={styles.label}>{categoryLabel(section.category)}</Text>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
              {section.data.map(item => {
                const on = selected.includes(item.sourceUrl);
                return <Pressable key={item.sourceUrl} accessibilityRole="checkbox" accessibilityState={{ checked: on }}
                  accessibilityLabel={item.name ?? item.subcategory ?? categoryLabel(section.category)} disabled={saving} onPress={() => toggle(item)}
                  style={{ width: 104, padding: 6, gap: 4, borderWidth: on ? 2 : 1, borderColor: on ? BrandColors.charcoal : BrandColors.stone, backgroundColor: on ? BrandColors.charcoalSoft : 'transparent' }}>
                  {item.imageUrl
                    ? <Image source={{ uri: item.imageUrl }} style={{ width: '100%', height: 96 }} resizeMode="contain" />
                    : <View style={{ height: 96, alignItems: 'center', justifyContent: 'center' }}><Text style={styles.imagePlaceholderText}>◇</Text></View>}
                  <Text style={styles.itemMeta} numberOfLines={2}>{on ? '✓ ' : ''}{item.name ?? item.subcategory ?? categoryLabel(section.category)}</Text>
                </Pressable>;
              })}
            </View>
          </View>)}
        </View>

        <View style={styles.setupCard}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>2. What is it for?</Text>
          </View>
          <View style={[styles.occasionRow, ar && styles.occasionRowArabic]}>
            {occasionOptions.map(option => {
              const on = occasion.trim().toLowerCase() === option.toLowerCase();
              return <Pressable key={option} accessibilityRole="radio" accessibilityState={{ checked: on }} disabled={saving}
                style={[styles.occasionPill, on && styles.occasionPillSelected]} onPress={() => setOccasion(option)}>
                <Text style={[styles.occasionText, on && styles.occasionTextSelected]}>{option}</Text>
              </Pressable>;
            })}
          </View>
          <TextInput style={styles.input} value={occasion} onChangeText={setOccasion} maxLength={200}
            placeholder="Or describe the occasion…" placeholderTextColor={BrandColors.softGrey} editable={!saving} />
          <View style={styles.field}>
            <Text style={styles.label}>Name this look (optional)</Text>
            <TextInput style={styles.input} value={title} onChangeText={setTitle} maxLength={120}
              placeholder="My Friday favourite" placeholderTextColor={BrandColors.softGrey} editable={!saving} />
          </View>
          {!!error && <View style={styles.errorBox}><Text accessibilityRole="alert" style={styles.error}>{error}</Text></View>}
          <Pressable accessibilityRole="button" accessibilityState={{ disabled: saving || selected.length < MIN_LOOK_PIECES }}
            disabled={saving || selected.length < MIN_LOOK_PIECES}
            style={[styles.button, (saving || selected.length < MIN_LOOK_PIECES) && styles.buttonDisabled]} onPress={save}>
            {saving ? <ActivityIndicator color={BrandColors.ivory} /> : null}
            <Text style={styles.buttonText}>{saving ? 'Saving…' : 'Save this look  →︎'}</Text>
          </Pressable>
        </View>
      </>}
      {!!error && !items.length && !loading && <View style={styles.errorBox}><Text accessibilityRole="alert" style={styles.error}>{error}</Text></View>}
    </ScrollView>
  </View>;
}
