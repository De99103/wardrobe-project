import { useState } from 'react';
import { Pressable, ScrollView, View } from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { styles } from '../styles/importResultStyles';
import { Text, TextInput } from '../components/AppTypography';

export default function BrowserImportScreen() {
  const { status: requestedStatus } = useLocalSearchParams<{ status?: string }>();
  const [status, setStatus] = useState<'owned' | 'wishlist'>(
    requestedStatus === 'wishlist' ? 'wishlist' : 'owned',
  );
  const [url, setUrl] = useState('');
  const [error, setError] = useState('');

  function continueToReview() {
    const productUrl = url.trim();
    if (!/^https:\/\/.+/i.test(productUrl)) {
      setError('Paste a public product link that starts with https://');
      return;
    }

    setError('');
    router.push({
      pathname: '/import-result',
      params: { url: productUrl, status },
    });
  }

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>STORE IMPORT</Text>
        <Text style={styles.title}>Add from a product link.</Text>
        <Text style={styles.subtitle}>Paste a public clothing-product page. Wearly will read the details, then let you review and edit them before saving.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>Paste a link</Text>
        <TextInput
          style={styles.input}
          value={url}
          onChangeText={value => { setUrl(value); setError(''); }}
          placeholder="https://store.com/product"
          accessibilityLabel="Store product link"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="url"
        />
        <View style={styles.categoryGrid}>
          {(['owned', 'wishlist'] as const).map(value => (
            <Pressable
              key={value}
              style={[styles.categoryPill, status === value && styles.categoryPillSelected]}
              accessibilityRole="radio"
              accessibilityState={{ checked: status === value }}
              onPress={() => setStatus(value)}
            >
              <Text style={styles.categoryText}>{value === 'owned' ? 'My Wardrobe' : 'Wishlist'}</Text>
            </Pressable>
          ))}
        </View>
        {error ? <Text accessibilityRole="alert" style={styles.errorText}>{error}</Text> : null}
        <Pressable style={styles.button} accessibilityRole="button" onPress={continueToReview}>
          <Text style={styles.buttonText}>Read product details  →︎</Text>
        </Pressable>
      </View>
    </ScrollView>
  );
}
