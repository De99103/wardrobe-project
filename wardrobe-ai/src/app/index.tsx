
import { useEffect, useState } from 'react';
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
import { observeAccount } from '../services/firebaseClient';
import type { ClothingStatus } from '../types/clothing';

export default function HomeScreen() {
  const [productUrl, setProductUrl] = useState('');
  const { status: selectedStatus } = useLocalSearchParams<{ status?: string }>();
  const status: ClothingStatus = selectedStatus === 'wishlist' ? 'wishlist' : 'owned';
  const [urlError, setUrlError] = useState('');
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => observeAccount(user => {
    setUserName(user?.displayName?.trim() || user?.email?.split('@')[0] || null);
  }), []);

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
      <View style={styles.brandRow}>
        <View style={styles.brandMark}><Text style={styles.brandMarkText}>W</Text></View>
        <View><Text style={styles.brandName}>WARDROBE AI</Text><Text style={styles.brandTagline}>Your personal styling studio</Text></View>
      </View>
      <View style={styles.hero}>
        <View pointerEvents="none" style={styles.heroOrb} />
        <View pointerEvents="none" style={styles.heroOrbSmall} />
        <Text style={styles.heroTitle}>{userName ? `Welcome,\n${userName}` : 'Welcome'}</Text>
      </View>

      <View style={styles.quickGrid}>
        <Pressable style={styles.quickCard} accessibilityRole="button" onPress={() => router.push({ pathname: '/wardrobe', params: { status: 'owned' } })}>
          <View style={styles.quickTop}><Text style={styles.quickCardLabel}>Collection</Text><Text style={styles.quickArrow}>↗</Text></View>
          <View><Text style={styles.quickCardTitle}>My Wardrobe</Text><Text style={styles.quickCardMeta}>Browse everything you own →</Text></View>
        </Pressable>
        <Pressable style={[styles.quickCard, styles.quickCardAccent]} accessibilityRole="button" onPress={() => router.push({ pathname: '/wardrobe', params: { status: 'wishlist' } })}>
          <View style={styles.quickTop}><Text style={styles.quickCardLabel}>Saved for later</Text><Text style={styles.quickArrow}>♡</Text></View>
          <View><Text style={styles.quickCardTitle}>Wishlist</Text><Text style={styles.quickCardMeta}>Keep an eye on future finds →</Text></View>
        </Pressable>
      </View>

      <AccountPanel />

      <View style={styles.panel}>
        <View style={styles.sectionHeader}>
          <View style={styles.iconBadge}><Text style={styles.iconBadgeText}>+</Text></View>
          <View style={{ flex: 1 }}><Text style={styles.sectionTitle}>Add a new piece</Text><Text style={styles.subtitle}>Save it manually or import it from any store.</Text></View>
        </View>
        <Pressable style={styles.button} accessibilityRole="button" onPress={() => router.push({ pathname: '/add-item', params: { status } })}>
          <Text style={styles.buttonText}>Add an item manually</Text>
        </Pressable>
        <View style={styles.divider} />
        <Text style={styles.label}>Store product link</Text>
        <TextInput style={styles.input} placeholder="https://store.com/product" value={productUrl} onChangeText={setProductUrl}
          autoCapitalize="none" autoCorrect={false} keyboardType="url" />
        {urlError ? <Text style={styles.error}>{urlError}</Text> : null}
        <Text style={styles.label}>Save to</Text>
        <View style={styles.row}>
          <Pressable style={[styles.option, status === 'owned' && styles.selected]} accessibilityRole="button" onPress={() => router.setParams({ status: 'owned' })}><Text>Wardrobe</Text></Pressable>
          <Pressable style={[styles.option, status === 'wishlist' && styles.selected]} accessibilityRole="button" onPress={() => router.setParams({ status: 'wishlist' })}><Text>Wishlist</Text></Pressable>
        </View>
        <Pressable style={styles.button} accessibilityRole="button" onPress={handleImport}><Text style={styles.buttonText}>Import from store  →</Text></Pressable>
        <Link href="/browser-import" style={styles.subtleLink}>Use the Chrome extension instead</Link>
      </View>
    </ScrollView>
  );
}
