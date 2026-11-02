
import { useEffect, useState } from 'react';
import {
  View,
  Pressable,
  ScrollView,
} from 'react-native';
import { Link, router, useLocalSearchParams } from 'expo-router';

import { Text } from '../components/AppTypography';
import { styles } from '../styles/homeStyles';
import { observeAccount } from '../services/firebaseClient';
import type { ClothingStatus } from '../types/clothing';

export default function HomeScreen() {
  const { status: selectedStatus } = useLocalSearchParams<{ status?: string }>();
  const status: ClothingStatus = selectedStatus === 'wishlist' ? 'wishlist' : 'owned';
  const [userName, setUserName] = useState<string | null>(null);

  useEffect(() => observeAccount(user => {
    setUserName(user?.displayName?.trim() || user?.email?.split('@')[0] || null);
  }), []);

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={styles.container}>
      <View style={styles.brandRow}>
        <View style={styles.brandIdentity}>
          <Text style={styles.brandName}>WEARLY</Text>
        </View>
        <View style={styles.headerLinks}>
          <Link href="/information" asChild><Pressable accessibilityRole="button" style={styles.infoButton}><Text style={styles.infoButtonText}>Information</Text></Pressable></Link>
          <Link href="/account" asChild><Pressable accessibilityRole="button" style={styles.infoButton}><Text style={styles.infoButtonText}>{userName ? 'Account' : 'Sign in'}</Text></Pressable></Link>
        </View>
      </View>
      <View style={styles.hero}>
        <Text style={styles.heroTitle}>{userName ? `Welcome,\n${userName}` : 'Welcome to W E A R L Y'}</Text>
        {!userName && <Text style={styles.heroHint}>First time here? <Link href="/information" style={styles.heroLink}>Visit Information</Link></Text>}
      </View>

      <View style={styles.quickGrid}>
        <Pressable style={styles.quickCard} accessibilityRole="button" onPress={() => router.push({ pathname: '/wardrobe', params: { status: 'owned' } })}>
          <View style={styles.quickTop}><Text style={styles.quickCardLabel}>COLLECTION</Text><Text style={styles.quickArrow}>↗</Text></View>
          <View><Text style={styles.quickCardTitle}>My wardrobe</Text><Text style={styles.quickCardMeta}>Browse everything you own</Text></View>
        </Pressable>
        <Pressable style={[styles.quickCard, styles.quickCardAccent]} accessibilityRole="button" onPress={() => router.push({ pathname: '/wardrobe', params: { status: 'wishlist' } })}>
          <View style={styles.quickTop}><Text style={styles.quickCardLabel}>SAVED FOR LATER</Text><Text style={styles.quickArrow}>↗</Text></View>
          <View><Text style={styles.quickCardTitle}>Wishlist</Text><Text style={styles.quickCardMeta}>Keep an eye on future finds</Text></View>
        </Pressable>
      </View>

      <View style={styles.homeLinks}>
        <Pressable accessibilityRole="button" onPress={() => router.push('/outfit')}>
          <Text style={styles.homeLink}>Style an outfit  →</Text>
          <Text style={styles.homeLinkHint}>With AI recommendation</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/add-item', params: { status } })}>
          <Text style={styles.homeLink}>Add a piece  →</Text>
          <Text style={styles.homeLinkHint}>Manually or using a store link</Text>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerRule} />
        <Text style={styles.footerBrand}>WEARLY</Text>
        <Text style={styles.footerText}>Made by Deema Abo Gheda · © 2026</Text>
        <View style={styles.footerLinks}>
          <Link href="/information" style={styles.footerLink}>Information</Link>
          <Link href="/account" style={styles.footerLink}>Account</Link>
        </View>
      </View>
    </ScrollView>
  );
}
