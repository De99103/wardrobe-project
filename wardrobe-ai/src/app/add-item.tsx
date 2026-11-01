import { useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { categories, categoryLabel, type Category } from '../services/collectionView';
import { emptyDetails, manualProduct, type ManualDetails } from '../services/manualClothing';
import { chooseClothingPhoto } from '../services/clothingPhoto';
import { saveClothing } from '../services/wardrobeStorage';
import { styles } from '../styles/homeStyles';

const questions: { key: keyof ManualDetails; label: string; placeholder: string }[] = [
  { key: 'name', label: 'What would you like to call it?', placeholder: 'My favourite sweater' },
  { key: 'brand', label: 'Which brand is it?', placeholder: 'Brand' },
  { key: 'subcategory', label: 'What type of clothing is it?', placeholder: 'Sweater, jeans, boots…' },
  { key: 'color', label: 'What color is it?', placeholder: 'Navy blue' },
  { key: 'material', label: 'What is it made from?', placeholder: 'Cotton, wool…' },
  { key: 'price', label: 'What is the price?', placeholder: '349.50' },
  { key: 'currency', label: 'Which currency?', placeholder: 'SEK' },
];

export default function AddItemScreen() {
  const { status } = useLocalSearchParams<{ status?: string }>();
  const collection = status === 'wishlist' ? 'wishlist' : 'owned';
  const [category, setCategory] = useState<Category | null>(null);
  const [details, setDetails] = useState({ ...emptyDetails });
  const [showDetails, setShowDetails] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [photo, setPhoto] = useState<string | null>(null);
  const [picking, setPicking] = useState(false);
  const id = useRef<string | null>(null);
  const busy = useRef(false);

  async function pickPhoto() {
    if (busy.current) return;
    busy.current = true; setPicking(true); setError('');
    try {
      const selected = await chooseClothingPhoto();
      if (selected) setPhoto(selected);
    } catch { setError('Could not open this photo. Please choose a supported image from your device.'); }
    finally { busy.current = false; setPicking(false); }
  }

  async function save(skip: boolean) {
    if (busy.current) return;
    if (!category) { setError('Choose a category before saving.'); return; }
    busy.current = true; setSaving(true); setError('');
    try {
      id.current ??= Crypto.randomUUID();
      const item = manualProduct(category, skip ? emptyDetails : details, id.current);
      await saveClothing({ ...item, imageUrl: photo ?? item.imageUrl }, collection);
      router.replace({ pathname: '/wardrobe', params: { status: collection } });
    } catch (err) {
      const code = err && typeof err === 'object' && 'code' in err ? err.code : '';
      setError(code === 'permission-denied'
        ? 'Could not save to your account. The updated Firebase rules for manually added items need to be published.'
        : err instanceof Error ? err.message : 'Could not save your item. Your answers are still here; please try again.');
    } finally { busy.current = false; setSaving(false); }
  }

  return <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
    <Text style={styles.title}>Add an item</Text>
    <Text style={styles.subtitle}>Choose a category. Everything else is optional.</Text>
    <Text>Saving to {collection === 'owned' ? 'My Wardrobe' : 'My Wishlist'}</Text>
    <Text style={styles.label}>Which category fits? · Required</Text>
    <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 10 }}>
      {categories.map(value => <Pressable key={value} disabled={saving || picking} accessibilityRole="radio" accessibilityState={{ checked: category === value }}
        style={[styles.input, category === value && styles.selected]} onPress={() => { setCategory(value); setError(''); }}>
        <Text>{categoryLabel(value)}</Text>
      </Pressable>)}
    </View>
    <Text>Not sure? Choose Uncategorized. “All” shows every category in your collection.</Text>
    <Text style={styles.label}>Photo · Optional</Text>
    <Pressable style={styles.input} accessibilityRole="button" disabled={saving || picking} onPress={pickPhoto}>
      <Text>{picking ? 'Preparing photo…' : photo ? 'Replace photo' : 'Choose photo from device'}</Text>
    </Pressable>
    {photo && <View style={{ gap: 12 }}>
      <Image source={{ uri: photo }} style={styles.image} resizeMode="contain" accessibilityLabel="Selected clothing photo" />
      <Pressable accessibilityRole="button" disabled={saving || picking} onPress={() => setPhoto(null)}><Text>Remove photo</Text></Pressable>
      <Text>Your photo will be saved even if you skip the details.</Text>
    </View>}
    {!showDetails ? <Pressable style={styles.input} disabled={saving || picking} accessibilityRole="button" onPress={() => setShowDetails(true)}><Text>Add optional details</Text></Pressable>
      : questions.map(({ key, label, placeholder }) => <View key={key} style={{ gap: 8 }}>
        <Text style={styles.label}>{label} · Optional</Text>
        <TextInput style={styles.input} accessibilityLabel={label} value={details[key]} placeholder={placeholder} editable={!saving}
          maxLength={key === 'currency' ? 3 : 2000} keyboardType={key === 'price' ? 'decimal-pad' : key === 'imageUrl' ? 'url' : 'default'}
          autoCapitalize={key === 'imageUrl' ? 'none' : key === 'currency' ? 'characters' : 'sentences'}
          onChangeText={value => setDetails(previous => ({ ...previous, [key]: value }))} />
        <Pressable disabled={saving || picking} accessibilityRole="button" accessibilityLabel={`Skip: ${label}`} onPress={() => setDetails(previous => ({ ...previous, [key]: '' }))}><Text>Skip this question</Text></Pressable>
      </View>)}
    {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
    {saving ? <ActivityIndicator /> : null}
    {showDetails && <Pressable style={styles.button} disabled={saving || picking} accessibilityRole="button" onPress={() => save(false)}><Text style={styles.buttonText}>Save item</Text></Pressable>}
    <Pressable style={showDetails ? styles.input : styles.button} disabled={saving || picking} accessibilityRole="button" onPress={() => save(true)}>
      <Text style={!showDetails ? styles.buttonText : undefined}>Skip details & save</Text>
    </Pressable>
  </ScrollView>;
}
