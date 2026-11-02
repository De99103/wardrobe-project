import { useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import * as Crypto from 'expo-crypto';
import { categories, categoryLabel, type Category } from '../services/collectionView';
import { emptyDetails, manualProduct, type ManualDetails } from '../services/manualClothing';
import { chooseClothingPhoto } from '../services/clothingPhoto';
import { saveClothing } from '../services/wardrobeStorage';
import { styles } from '../styles/addItemStyles';
import { Text, TextInput } from '../components/AppTypography';
import { BrandColors } from '../constants/brand';

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

  const disabled = saving || picking;
  return <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
    <Text style={styles.eyebrow}>Add to your collection</Text>
    <Text style={styles.title}>Tell us about this piece.</Text>
    <Text style={styles.subtitle}>Start with a category. A photo and the details are completely optional.</Text>
    <View style={styles.collectionPill}><Text style={styles.collectionPillText}>Saving to {collection === 'owned' ? 'My Wardrobe' : 'My Wishlist'}</Text></View>

    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>1</Text></View>
        <View><Text style={styles.sectionTitle}>Category</Text><Text style={styles.optional}>Required</Text></View>
      </View>
      <Text style={styles.helper}>Choose the best match so we can organize and style it correctly.</Text>
      <View style={styles.categoryGrid}>
        {categories.map(value => <Pressable key={value} disabled={disabled} accessibilityRole="radio" accessibilityState={{ checked: category === value }}
          style={[styles.categoryPill, category === value && styles.categoryPillSelected, disabled && styles.disabled]} onPress={() => { setCategory(value); setError(''); }}>
          <Text style={styles.categoryText}>{categoryLabel(value)}</Text>
        </Pressable>)}
      </View>
      <Text style={styles.helper}>Not sure? Uncategorized is always a safe choice.</Text>
    </View>

    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>2</Text></View>
        <View><Text style={styles.sectionTitle}>Photo</Text><Text style={styles.optional}>Optional</Text></View>
      </View>
      {photo ? <>
        <Image source={{ uri: photo }} style={styles.photo} resizeMode="contain" accessibilityLabel="Selected clothing photo" />
        <View style={styles.photoActions}>
          <Pressable accessibilityRole="button" disabled={disabled} onPress={pickPhoto}><Text style={styles.textLink}>Replace photo</Text></Pressable>
          <Pressable accessibilityRole="button" disabled={disabled} onPress={() => setPhoto(null)}><Text style={styles.dangerLink}>Remove</Text></Pressable>
        </View>
        <Text style={styles.helper}>This photo will be saved even if you skip the details.</Text>
      </> : <Pressable style={[styles.uploadArea, disabled && styles.disabled]} accessibilityRole="button" disabled={disabled} onPress={pickPhoto}>
        <Text style={styles.uploadIcon}>＋</Text>
        <Text style={styles.uploadTitle}>{picking ? 'Preparing photo…' : 'Choose from your device'}</Text>
        <Text style={styles.uploadHint}>Add a clear photo to make your wardrobe easier to browse.</Text>
      </Pressable>}
    </View>

    <View style={styles.card}>
      <View style={styles.sectionHeader}>
        <View style={styles.stepBadge}><Text style={styles.stepBadgeText}>3</Text></View>
        <View><Text style={styles.sectionTitle}>Details</Text><Text style={styles.optional}>Optional</Text></View>
      </View>
      {!showDetails ? <>
        <Text style={styles.helper}>A name, color, and material help the stylist create stronger outfit matches.</Text>
        <Pressable style={[styles.secondaryButton, disabled && styles.disabled]} disabled={disabled} accessibilityRole="button" onPress={() => setShowDetails(true)}><Text style={styles.secondaryButtonText}>Add optional details</Text></Pressable>
      </> : questions.map(({ key, label, placeholder }) => <View key={key} style={styles.question}>
        <Text style={styles.label}>{label}</Text>
        <TextInput style={styles.input} accessibilityLabel={label} value={details[key]} placeholder={placeholder} editable={!saving}
          maxLength={key === 'currency' ? 3 : 2000} keyboardType={key === 'price' ? 'decimal-pad' : key === 'imageUrl' ? 'url' : 'default'}
          autoCapitalize={key === 'imageUrl' ? 'none' : key === 'currency' ? 'characters' : 'sentences'}
          onChangeText={value => setDetails(previous => ({ ...previous, [key]: value }))} />
        <Pressable disabled={disabled} accessibilityRole="button" accessibilityLabel={`Skip: ${label}`} onPress={() => setDetails(previous => ({ ...previous, [key]: '' }))}><Text style={styles.textLink}>Skip this question</Text></Pressable>
      </View>)}
    </View>

    {error ? <Text style={styles.error} accessibilityRole="alert">{error}</Text> : null}
    {saving ? <ActivityIndicator color={BrandColors.charcoal} /> : null}
    {showDetails && <Pressable style={[styles.primaryButton, disabled && styles.disabled]} disabled={disabled} accessibilityRole="button" onPress={() => save(false)}><Text style={styles.primaryButtonText}>Save item  →</Text></Pressable>}
    <Pressable style={[showDetails ? styles.secondaryButton : styles.primaryButton, disabled && styles.disabled]} disabled={disabled} accessibilityRole="button" onPress={() => save(true)}>
      <Text style={showDetails ? styles.secondaryButtonText : styles.primaryButtonText}>Skip details & save</Text>
    </Pressable>
  </ScrollView>;
}
