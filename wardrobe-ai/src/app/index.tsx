
import { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Pressable,
  ScrollView,
} from 'react-native';
import { Link, router, useLocalSearchParams } from 'expo-router';

import { AccountPanel } from '../components/AccountPanel';
import { styles } from '../styles/homeStyles';
import { validateStoreUrl } from '../services/productValidation';
import type { ClothingStatus } from '../types/clothing';

export default function HomeScreen() {
  const [productUrl, setProductUrl] = useState('');
  const { status: selectedStatus } = useLocalSearchParams<{ status?: string }>();
  const status: ClothingStatus = selectedStatus === 'wishlist' ? 'wishlist' : 'owned';
  const [urlError, setUrlError] = useState('');

  // Navigate to the results page
  const handleImport = () => {
    let url: string;
    try {
      url = validateStoreUrl(productUrl);
    } catch {
      setUrlError('Use a public HTTPS product link from a store.');
      return;
    }

    setUrlError('');

    router.push({
      pathname: '/import-result',
      params: {
        url,
        status,
      },
    });
  };

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={styles.container}>
      <Text style={styles.title}>Wardrobe AI</Text>
      <Text style={styles.subtitle}>Add a clothing item</Text>

      <Pressable style={[styles.option, styles.navOption]} onPress={() => router.push({ pathname: '/wardrobe', params: { status } })}>
        <Text>View My Wardrobe & Wishlist</Text>
      </Pressable>

      <AccountPanel />

      <Pressable style={styles.button} accessibilityRole="button" onPress={() => router.push({ pathname: '/add-item', params: { status } })}>
        <Text style={styles.buttonText}>Add item manually</Text>
      </Pressable>

      <Link href="/browser-import" style={styles.summary}>Import directly from your browser</Link>

      {/* Import clothing through URL */}
      <Text style={styles.label}>Or paste a store link</Text>

      <TextInput
        style={styles.input}
        placeholder="https://www.example.com/product"
        value={productUrl}
        onChangeText={setProductUrl}
        autoCapitalize="none"
        autoCorrect={false}
        keyboardType="url"
      />

      {urlError ? (
        <Text style={styles.error}>{urlError}</Text>
      ) : null}

      {/* Choose clothing collection */}
      <Text style={styles.label}>Where should we save it?</Text>

      <View style={styles.row}>
        <Pressable
          style={[
            styles.option,
            status === 'owned' && styles.selected,
          ]}
          accessibilityRole="button" onPress={() => router.setParams({ status: 'owned' })}
        >
          <Text>My Wardrobe</Text>
        </Pressable>

        <Pressable
          style={[
            styles.option,
            status === 'wishlist' && styles.selected,
          ]}
          accessibilityRole="button" onPress={() => router.setParams({ status: 'wishlist' })}
        >
          <Text>Wishlist</Text>
        </Pressable>
      </View>

      <Text style={styles.summary}>
        Selected: {status === 'owned' ? 'My Wardrobe' : 'Wishlist'}
      </Text>

      {/* Open AI import results */}
      <Pressable style={styles.button} onPress={handleImport}>
        <Text style={styles.buttonText}>Import from Store</Text>
      </Pressable>
    </ScrollView>
  );
}
