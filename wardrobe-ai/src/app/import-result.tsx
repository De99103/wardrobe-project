
import { useEffect, useState } from 'react';

import {
  View,
  Image,
  ScrollView,
  Pressable,
  ActivityIndicator,
} from 'react-native';

import {
  Link,
  router,
  useLocalSearchParams,
} from 'expo-router';

import { importProduct, importProductManual, getImportedProduct } from '../services/productApi';
import { saveClothing } from '../services/wardrobeStorage';
import { categories, categoryLabel } from '../services/collectionView';
import type { Category } from '../services/collectionView';
import { applyImportedProductEdits, editableProductDetails, emptyImportedProduct } from '../services/importedProductEditor';
import type { ImportedProductEditDraft } from '../services/importedProductEditor';

import type {
  ClothingStatus,
  ImportedProduct,
} from '../types/clothing';

import { styles } from '../styles/importResultStyles';
import { Text, TextInput } from '../components/AppTypography';
import { StylingEditor } from '../components/StylingEditor';
import { BrandColors } from '../constants/brand';
import { stylingDraft, stylingFromDraft, type StylingDraft } from '../services/stylingTags';

const editQuestions: { key: keyof ImportedProductEditDraft; label: string; placeholder: string }[] = [
  { key: 'name', label: 'Name', placeholder: 'Product name' },
  { key: 'brand', label: 'Brand', placeholder: 'Brand' },
  { key: 'subcategory', label: 'Type', placeholder: 'Sweater, jeans, boots…' },
  { key: 'color', label: 'Color', placeholder: 'Navy blue' },
  { key: 'material', label: 'Material', placeholder: 'Cotton, wool…' },
  { key: 'price', label: 'Price', placeholder: '349.50' },
  { key: 'currency', label: 'Currency', placeholder: 'SEK' },
];

export default function ImportResultScreen() {
  const { url, status, importId } = useLocalSearchParams<{
    url?: string;
    importId?: string;
    status?: ClothingStatus;
  }>();

  const [product, setProduct] = useState<ImportedProduct | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const collection: ClothingStatus = status === 'wishlist' ? 'wishlist' : 'owned';

  const [manualDescription, setManualDescription] = useState('');
  const [manualLoading, setManualLoading] = useState(false);
  const [manualError, setManualError] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editCategory, setEditCategory] = useState<Category>('uncategorized');
  const [editDetails, setEditDetails] = useState<ImportedProductEditDraft | null>(null);
  const [editStyling, setEditStyling] = useState<StylingDraft | null>(null);
  const [editError, setEditError] = useState<string | null>(null);

  // Fetch product information from FastAPI
  useEffect(() => {
    let active = true;

    const loadProduct = async () => {
      setLoading(true);
      setError(null);
      setProduct(null);
      setManualError(null);
      setSaveError(null);
      setEditing(false);
      setEditDetails(null);
      setEditStyling(null);
      setEditError(null);

      if (!url && !importId) {
        setError('No product link was provided.');
        setLoading(false);
        return;
      }

      try {
        const result = importId ? await getImportedProduct(importId) : await importProduct(url!);

        if (active) {
          setProduct(result);
        }
      } catch (err) {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : 'Unable to import product.'
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    };

    loadProduct();

    return () => {
      active = false;
    };
  }, [url, importId, retryCount]);


  const handleManualImport = async () => {
    if (!url) {
      setManualError('Product URL is missing.');
      return;
    }

    if (manualDescription.trim().length < 5 || manualDescription.trim().length > 5000) {
      setManualError('Enter a product description between 5 and 5,000 characters.');
      return;
    }

    setManualLoading(true);
    setManualError(null);

    try {
      const result = await importProductManual(
        url,
        manualDescription.trim()
      );

      setProduct(result);
      setError(null);

    } catch (err) {
      setManualError(
        err instanceof Error
          ? err.message
          : 'Could not analyze the product.'
      );
    } finally {
      setManualLoading(false);
    }
  };

  const beginEditing = (value: ImportedProduct) => {
    const editable = editableProductDetails(value);
    setEditCategory(editable.category);
    setEditDetails(editable.details);
    setEditStyling(value.styling ? stylingDraft(value) : null);
    setEditError(null);
    setSaveError(null);
    setEditing(true);
  };

  const handleManualEntry = () => {
    if (!url) return;
    try {
      const empty = emptyImportedProduct(url);
      setProduct(empty);
      setError(null);
      beginEditing(empty);
    } catch (reason) {
      setManualError(reason instanceof Error ? reason.message : 'Could not open manual editing.');
    }
  };

  const handleApplyEdits = () => {
    if (!product || !editDetails) return;
    try {
      const edited = applyImportedProductEdits(product, editCategory, editDetails);
      setProduct(editStyling ? { ...edited, styling: stylingFromDraft(editStyling) } : edited);
      setEditError(null);
      setEditing(false);
    } catch (reason) {
      setEditError(reason instanceof Error ? reason.message : 'Could not apply these changes.');
    }
  };


  const handleSave = async () => {
    if (!product || saving) return;
    setSaving(true);
    setSaveError(null);
    try {
      await saveClothing(product, collection);
      router.replace({ pathname: '/wardrobe', params: { status: collection } });
    } catch {
      setSaveError('Could not save this item. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  // Loading screen
  if (loading) {
    return (
      <View style={styles.centered}>
        <Text style={styles.placeholderMark}>W</Text>
        <ActivityIndicator size="large" color={BrandColors.charcoal} />
        <Text style={styles.message}>Reading the product page and preparing the details…</Text>
      </View>
    );
  }

  // Error screen with AI-assisted import
  if (error || !product) {
    return (
      <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={styles.container}>
        <View style={styles.header}>
          <Text style={styles.eyebrow}>IMPORT ASSISTANT</Text>
          <Text style={styles.title}>Let’s try that again.</Text>
          <Text style={styles.subtitle}>Some stores protect their pages. You can retry, use the browser helper, or paste the product details below.</Text>
        </View>

        <View style={styles.recoveryCard}>
          <Text style={styles.cardTitle}>Automatic import paused</Text>
          {error && <Text style={styles.errorText}>{error}</Text>}
          <Pressable accessibilityRole="button" style={styles.button} onPress={() => setRetryCount(count => count + 1)} disabled={manualLoading}>
            <Text style={styles.buttonText}>Retry automatic import  →</Text>
          </Pressable>
          {url && <Pressable accessibilityRole="button" style={styles.secondaryButton} onPress={handleManualEntry} disabled={manualLoading}>
            <Text style={styles.secondaryButtonText}>Enter product details manually</Text>
          </Pressable>}
          <Link href="/browser-import" style={styles.storeLink}>Use the Chrome extension instead</Link>
          <View style={styles.divider} />
          <Text style={styles.label}>Paste product details</Text>
          <Text style={styles.mutedNote}>Copy the product name, price, color, and description from the store page.</Text>
          <TextInput
            style={styles.descriptionInput}
            placeholder="Example: Black knitted dress with belt, Zara, 559 SEK…"
            placeholderTextColor={BrandColors.softGrey}
            value={manualDescription}
            onChangeText={setManualDescription}
            maxLength={5000}
            editable={!manualLoading}
            multiline
            textAlignVertical="top"
          />
          {manualError && <Text style={styles.errorText}>{manualError}</Text>}
          <Pressable accessibilityRole="button" style={styles.secondaryButton} onPress={handleManualImport} disabled={manualLoading}>
            {manualLoading ? <ActivityIndicator color={BrandColors.charcoal} /> : <Text style={styles.secondaryButtonText}>Analyze pasted details with AI</Text>}
          </Pressable>
        </View>
        <Pressable accessibilityRole="button" onPress={() => router.back()}><Text style={styles.backText}>← Back to import</Text></Pressable>
      </ScrollView>
    );
  }

  const missingDetails = [product.name, product.brand, product.category, product.subcategory, product.color, product.material, product.price, product.currency]
    .some(value => value === null || value === '');

  // Successful product import
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.container} keyboardShouldPersistTaps="handled">
      <View style={styles.header}>
        <Text style={styles.eyebrow}>READY TO SAVE</Text>
        <Text style={styles.title}>We found your piece.</Text>
        <Text style={styles.subtitle}>Review the details before adding it to your collection.</Text>
      </View>

      {/* Product image */}
      <View style={styles.imageContainer}>
        {product.imageUrl ? (
          <Image
            source={{ uri: product.imageUrl }}
            style={styles.image}
            resizeMode="contain"
          />
        ) : (
          <View style={styles.imagePlaceholder}><Text style={styles.placeholderMark}>◇</Text><Text style={styles.message}>No product image available</Text></View>
        )}
      </View>

      {/* Product information */}
      {editing && editDetails ? <View style={styles.editCard}>
        <Text style={styles.cardTitle}>Edit product details</Text>
        <Text style={styles.mutedNote}>Add what you know. Any field except category can be left blank.</Text>
        <View style={styles.editField}>
          <Text style={styles.label}>Category</Text>
          <View style={styles.categoryGrid}>
            {categories.map(value => <Pressable key={value} accessibilityRole="radio" accessibilityState={{ checked: editCategory === value }}
              style={[styles.categoryPill, editCategory === value && styles.categoryPillSelected]} onPress={() => setEditCategory(value)}>
              <Text style={styles.categoryText}>{categoryLabel(value)}</Text>
            </Pressable>)}
          </View>
        </View>
        {editQuestions.map(({ key, label, placeholder }) => <View key={key} style={styles.editField}>
          <Text style={styles.label}>{label}</Text>
          <TextInput
            style={styles.input}
            accessibilityLabel={label}
            value={editDetails[key]}
            placeholder={placeholder}
            placeholderTextColor={BrandColors.softGrey}
            maxLength={key === 'currency' ? 3 : 2000}
            keyboardType={key === 'price' ? 'decimal-pad' : 'default'}
            autoCapitalize={key === 'currency' ? 'characters' : 'sentences'}
            onChangeText={value => setEditDetails(previous => previous ? { ...previous, [key]: value } : previous)}
          />
        </View>)}
        {editStyling ? <StylingEditor value={editStyling} onChange={setEditStyling} />
          : <Pressable accessibilityRole="button" style={styles.secondaryButton}
            onPress={() => setEditStyling(stylingDraft(applyImportedProductEdits(product, editCategory, editDetails)))}>
            <Text style={styles.secondaryButtonText}>Review estimated styling details</Text>
          </Pressable>}
        {editError && <Text style={styles.errorText}>{editError}</Text>}
        <View style={styles.editActions}>
          <Pressable accessibilityRole="button" style={styles.button} onPress={handleApplyEdits}><Text style={styles.buttonText}>Save changes</Text></Pressable>
          <Pressable accessibilityRole="button" style={styles.secondaryButton} onPress={() => { setEditing(false); setEditError(null); }}><Text style={styles.secondaryButtonText}>Cancel</Text></Pressable>
        </View>
      </View> : <View style={styles.card}>
        <View style={styles.productHeader}>
          <Text style={styles.productName}>{product.name ?? 'Unknown product'}</Text>
          <Text style={styles.price}>{product.price != null ? `${product.price} ${product.currency ?? ''}` : 'Price unavailable'}</Text>
        </View>
        <View style={styles.detailGrid}>
          <View style={styles.detail}><Text style={styles.label}>Brand</Text><Text style={styles.value}>{product.brand ?? 'Not available'}</Text></View>
          <View style={styles.detail}><Text style={styles.label}>Category</Text><Text style={styles.value}>{product.category ?? 'Not available'}</Text></View>
          <View style={styles.detail}><Text style={styles.label}>Type</Text><Text style={styles.value}>{product.subcategory ?? 'Not available'}</Text></View>
          <View style={styles.detail}><Text style={styles.label}>Color</Text><Text style={styles.value}>{product.color ?? 'Not available'}</Text></View>
          <View style={styles.detail}><Text style={styles.label}>Material</Text><Text style={styles.value}>{product.material ?? 'Not available'}</Text></View>
          {product.styling && <>
            <View style={styles.detail}><Text style={styles.label}>Styling colors</Text><Text style={styles.value}>{product.styling.colors.join(', ') || 'Unknown'}</Text></View>
            <View style={styles.detail}><Text style={styles.label}>Pattern</Text><Text style={styles.value}>{product.styling.pattern ?? 'Unknown'}</Text></View>
            <View style={styles.detail}><Text style={styles.label}>Warmth</Text><Text style={styles.value}>{product.styling.warmth ?? 'Unknown'}{product.styling.warmth ? '/5' : ''}</Text></View>
            <View style={styles.detail}><Text style={styles.label}>Formality</Text><Text style={styles.value}>{product.styling.formality ?? 'Unknown'}{product.styling.formality ? '/5' : ''}</Text></View>
            <View style={styles.detail}><Text style={styles.label}>Layer</Text><Text style={styles.value}>{product.styling.layerRole ?? 'Unknown'}</Text></View>
            <View style={styles.detail}><Text style={styles.label}>Style</Text><Text style={styles.value}>{product.styling.styleTags.join(', ') || 'Unknown'}</Text></View>
          </>}
        </View>
        {missingDetails && <View style={styles.incompleteNotice}><Text style={styles.mutedNote}>Some details are missing. Add what you know before saving.</Text></View>}
        <Pressable accessibilityRole="button" style={styles.secondaryButton} onPress={() => beginEditing(product)}><Text style={styles.secondaryButtonText}>Edit product details</Text></Pressable>
        <Link href={product.sourceUrl as `https://${string}`} target="_blank" rel="noopener noreferrer" style={styles.storeLink}>Open original product ↗</Link>
      </View>}

      {/* Selected destination */}
      <View style={styles.statusBox}>
        <View style={styles.statusCopy}><Text style={styles.label}>Selected collection</Text><Text style={styles.value}>{status === 'wishlist' ? 'My Wishlist' : 'My Wardrobe'}</Text></View>
        <Text style={styles.statusMark}>{status === 'wishlist' ? '♡' : '✓'}</Text>
      </View>

      {!editing && <>
        {saveError && <Text style={styles.errorText}>{saveError}</Text>}
        <Pressable accessibilityRole="button" style={styles.button} onPress={handleSave} disabled={saving}>
          {saving ? <ActivityIndicator color={BrandColors.ivory} /> : (
            <Text style={styles.buttonText}>
              {collection === 'wishlist' ? 'Save to Wishlist  →' : 'Save to Wardrobe  →'}
            </Text>
          )}
        </Pressable>
      </>}

      <Pressable
          accessibilityRole="button"
        style={styles.secondaryButton}
        onPress={() => router.back()}
      >
        <Text style={styles.secondaryButtonText}>Back to import</Text>
      </Pressable>
    </ScrollView>
  );
}
