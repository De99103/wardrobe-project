
import { useEffect, useState } from 'react';

import {
  View,
  Text,
  Image,
  ScrollView,
  Pressable,
  ActivityIndicator,
  TextInput,
} from 'react-native';

import {
  Link,
  router,
  useLocalSearchParams,
} from 'expo-router';

import { importProduct, importProductManual, getImportedProduct } from '../services/productApi';
import { saveClothing } from '../services/wardrobeStorage';

import type {
  ClothingStatus,
  ImportedProduct,
} from '../types/clothing';

import { styles } from '../styles/importResultStyles';


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

  // Fetch product information from FastAPI
  useEffect(() => {
    let active = true;

    const loadProduct = async () => {
      setLoading(true);
      setError(null);
      setProduct(null);
      setManualError(null);
      setSaveError(null);

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
        <ActivityIndicator size="large" color="#5E2D4F" />
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
          <Link href="/browser-import" style={styles.storeLink}>Use the Chrome extension instead</Link>
          <View style={styles.divider} />
          <Text style={styles.label}>Paste product details</Text>
          <Text style={styles.mutedNote}>Copy the product name, price, color, and description from the store page.</Text>
          <TextInput
            style={styles.descriptionInput}
            placeholder="Example: Black knitted dress with belt, Zara, 559 SEK…"
            placeholderTextColor="#9A8B95"
            value={manualDescription}
            onChangeText={setManualDescription}
            maxLength={5000}
            editable={!manualLoading}
            multiline
            textAlignVertical="top"
          />
          {manualError && <Text style={styles.errorText}>{manualError}</Text>}
          <Pressable accessibilityRole="button" style={styles.secondaryButton} onPress={handleManualImport} disabled={manualLoading}>
            {manualLoading ? <ActivityIndicator color="#5E2D4F" /> : <Text style={styles.secondaryButtonText}>Analyze pasted details with AI</Text>}
          </Pressable>
        </View>
        <Pressable accessibilityRole="button" onPress={() => router.back()}><Text style={styles.backText}>← Back to import</Text></Pressable>
      </ScrollView>
    );
  }


  // Successful product import
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.container}>
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
      <View style={styles.card}>
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
        </View>
        <Link href={product.sourceUrl as `https://${string}`} target="_blank" rel="noopener noreferrer" style={styles.storeLink}>Open original product ↗</Link>
      </View>

      {/* Selected destination */}
      <View style={styles.statusBox}>
        <View style={styles.statusCopy}><Text style={styles.label}>Selected collection</Text><Text style={styles.value}>{status === 'wishlist' ? 'My Wishlist' : 'My Wardrobe'}</Text></View>
        <Text style={styles.statusMark}>{status === 'wishlist' ? '♡' : '✓'}</Text>
      </View>

      {saveError && <Text style={styles.errorText}>{saveError}</Text>}
      <Pressable accessibilityRole="button" style={styles.button} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color="#FFF9FB" /> : (
          <Text style={styles.buttonText}>
            {collection === 'wishlist' ? 'Save to Wishlist  →' : 'Save to Wardrobe  →'}
          </Text>
        )}
      </Pressable>

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
