
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
        <ActivityIndicator size="large" color="#54745D" />
        <Text style={styles.message}>
          Analyzing clothing with AI...
        </Text>
      </View>
    );
  }

  // Error screen with AI-assisted import
  if (error || !product) {
    return (
      <ScrollView contentContainerStyle={styles.container}>
        <Text style={styles.title}>Import Clothing</Text>

        <Text style={styles.message}>
          Import the open product page with the browser extension, or use product text below.
        </Text>

        {error && (
          <Text style={styles.errorText}>
            {error}
          </Text>
        )}

        <Link href="/browser-import" style={styles.backText}>Set up browser importing — no typing needed</Link>

        <Text style={styles.label}>
          Copy the product name, price, color and description from the store page, then paste them here.
        </Text>

        <TextInput
          style={styles.descriptionInput}
          placeholder="Example: Black knitted dress with belt, Zara, 559 SEK..."
          value={manualDescription}
          onChangeText={setManualDescription}
          maxLength={5000}
          editable={!manualLoading}
          multiline
          textAlignVertical="top"
        />

        {manualError && (
          <Text style={styles.errorText}>
            {manualError}
          </Text>
        )}

        <Pressable
          accessibilityRole="button"
          style={styles.button}
          onPress={handleManualImport}
          disabled={manualLoading}
        >
          {manualLoading ? (
            <ActivityIndicator color="#FFFFFF" />
          ) : (
            <Text style={styles.buttonText}>
              Analyze with AI
            </Text>
          )}
        </Pressable>

        <Pressable
          accessibilityRole="button"
          style={styles.secondaryButton}
          onPress={() => setRetryCount(count => count + 1)}
          disabled={manualLoading}
        >
          <Text style={styles.secondaryButtonText}>
            Retry Automatic Import
          </Text>
        </Pressable>

        <Pressable accessibilityRole="button" onPress={() => router.back()}>
          <Text style={styles.backText}>
            Back to Import
          </Text>
        </Pressable>
      </ScrollView>
    );
  }


  // Successful product import
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Product Details</Text>
      <Text style={styles.subtitle}>
        Information extracted by Wardrobe AI
      </Text>

      {/* Product image */}
      <View style={styles.imageContainer}>
        {product.imageUrl ? (
          <Image
            source={{ uri: product.imageUrl }}
            style={styles.image}
            resizeMode="contain"
          />
        ) : (
          <Text style={styles.message}>
            No product image available
          </Text>
        )}
      </View>

      {/* Product information */}
      <View style={styles.card}>
        <Text style={styles.productName}>
          {product.name ?? 'Unknown product'}
        </Text>

        <Text style={styles.price}>
          {product.price != null
            ? `${product.price} ${product.currency ?? ''}`
            : 'Price unavailable'}
        </Text>

        <Text style={styles.label}>Brand</Text>
        <Text style={styles.value}>
          {product.brand ?? 'Not available'}
        </Text>

        <Text style={styles.label}>Category</Text>
        <Text style={styles.value}>
          {product.category ?? 'Not available'}
        </Text>

        <Text style={styles.label}>Clothing Type</Text>
        <Text style={styles.value}>
          {product.subcategory ?? 'Not available'}
        </Text>

        <Text style={styles.label}>Color</Text>
        <Text style={styles.value}>
          {product.color ?? 'Not available'}
        </Text>

        <Text style={styles.label}>Material</Text>
        <Text style={styles.value}>
          {product.material ?? 'Not available'}
        </Text>

        <Text style={styles.label}>Store Link</Text>
        <Text style={styles.value}>
          {product.sourceUrl}
        </Text>
      </View>

      {/* Selected destination */}
      <View style={styles.statusBox}>
        <Text style={styles.label}>Selected collection</Text>
        <Text style={styles.value}>
          {status === 'wishlist' ? 'My Wishlist' : 'My Wardrobe'}
        </Text>
      </View>

      {saveError && <Text style={styles.errorText}>{saveError}</Text>}
      <Pressable accessibilityRole="button" style={styles.button} onPress={handleSave} disabled={saving}>
        {saving ? <ActivityIndicator color="#FFFFFF" /> : (
          <Text style={styles.buttonText}>
            {collection === 'wishlist' ? 'Save to Wishlist' : 'Save to Wardrobe'}
          </Text>
        )}
      </Pressable>

      <Pressable
          accessibilityRole="button"
        style={styles.button}
        onPress={() => router.back()}
      >
        <Text style={styles.buttonText}>Back to Import</Text>
      </Pressable>
    </ScrollView>
  );
}
