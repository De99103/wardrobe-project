
import { useEffect, useState } from 'react';
import {
  View,
  Pressable,
  ScrollView,
} from 'react-native';
import { Link, router, useLocalSearchParams } from 'expo-router';

import { Text } from '../components/AppTypography';
import { RouteSeo } from '../components/RouteSeo';
import { styles } from '../styles/homeStyles';
import { observeAccount } from '../services/firebaseClient';
import type { ClothingStatus } from '../types/clothing';
import { useLanguage } from '../services/i18n';

export default function HomeScreen() {
  const { status: selectedStatus } = useLocalSearchParams<{ status?: string }>();
  const status: ClothingStatus = selectedStatus === 'wishlist' ? 'wishlist' : 'owned';
  const [userName, setUserName] = useState<string | null>(null);
  const { language, setLanguage } = useLanguage();

  useEffect(() => observeAccount(user => {
    setUserName(user?.displayName?.trim() || user?.email?.split('@')[0] || null);
  }), []);

  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" keyboardShouldPersistTaps="handled" contentContainerStyle={styles.container}>
      <RouteSeo
        title="Wearly | Digital Wardrobe & AI Outfit Planner"
        description="Organize the clothes you own, manage a wishlist, and get personalized AI outfit recommendations with Wearly."
      />
      <View style={styles.brandRow}>
        <View style={styles.brandIdentity}>
          <Link href="/" asChild><Pressable accessibilityRole="button" accessibilityLabel="Go to home"><Text style={styles.brandName}>WEARLY</Text></Pressable></Link>
        </View>
        <View style={styles.headerLinks}>
          <Pressable accessibilityRole="button" style={styles.infoButton} onPress={() => setLanguage(language === 'ar' ? 'en' : 'ar')}><Text style={styles.infoButtonText}>{language === 'ar' ? 'English' : 'العربية'}</Text></Pressable>
          <Link href="/information" asChild><Pressable accessibilityRole="button" style={styles.infoButton}><Text style={styles.infoButtonText}>Information</Text></Pressable></Link>
          <Link href="/account" asChild><Pressable accessibilityRole="button" style={styles.infoButton}><Text style={styles.infoButtonText}>{userName ? 'Account' : 'Sign in'}</Text></Pressable></Link>
        </View>
      </View>
      <View style={styles.hero}>
        <Text accessibilityRole="header" style={styles.heroTitle}>{userName ? `${language === 'ar' ? 'أهلاً،' : 'Welcome,'}\n${userName}` : language === 'ar' ? 'خزانتكِ بأسلوب جديد.' : 'Your wardrobe, reimagined.'}</Text>
        {!userName && <Text style={styles.heroDescription}>Wearly is your digital wardrobe for organizing clothes, saving future finds, and creating AI outfit ideas around your style, plans, and weather.</Text>}
        {!userName && <Text style={styles.heroHint}>
          {language === 'ar' ? 'أول مرة هنا؟ ' : 'First time here? '}
          <Link href="/information" style={styles.heroLink}>{language === 'ar' ? 'اطّلع على المعلومات' : 'Visit Information'}</Link>
        </Text>}
      </View>

      <View style={styles.quickGrid}>
        <Pressable style={styles.quickCard} accessibilityRole="button" onPress={() => router.push({ pathname: '/wardrobe', params: { status: 'owned' } })}>
          <Text style={styles.quickCardLabel}>COLLECTION</Text>
          <View style={[styles.cardTitleRow, language === 'ar' && styles.cardTitleRowArabic]}><Text style={styles.quickCardTitle}>My wardrobe</Text><Text style={styles.quickArrow}>{language === 'ar' ? '↖︎' : '↗︎'}</Text></View>
          <Text style={styles.quickCardMeta}>Browse everything you own</Text>
        </Pressable>
        <Pressable style={[styles.quickCard, styles.quickCardAccent]} accessibilityRole="button" onPress={() => router.push({ pathname: '/wardrobe', params: { status: 'wishlist' } })}>
          <Text style={styles.quickCardLabel}>SAVED FOR LATER</Text>
          <View style={[styles.cardTitleRow, language === 'ar' && styles.cardTitleRowArabic]}><Text style={styles.quickCardTitle}>Wishlist</Text><Text style={styles.quickArrow}>{language === 'ar' ? '↖︎' : '↗︎'}</Text></View>
          <Text style={styles.quickCardMeta}>Keep an eye on future finds</Text>
        </Pressable>
      </View>

      {!userName && <View style={styles.featureSummary}>
        <View style={styles.featureItem}>
          <Text style={styles.featureTitle}>Build your wardrobe</Text>
          <Text style={styles.featureBody}>Add pieces yourself, with a photo, or from a public store link.</Text>
        </View>
        <View style={styles.featureItem}>
          <Text style={styles.featureTitle}>Style with context</Text>
          <Text style={styles.featureBody}>Create weather-aware looks for everyday plans, work, dinners, and more.</Text>
        </View>
        <View style={styles.featureItem}>
          <Text style={styles.featureTitle}>Save what works</Text>
          <Text style={styles.featureBody}>Keep favorite outfit combinations and build a more personal wardrobe over time.</Text>
        </View>
      </View>}

      <View style={styles.homeLinks}>
        <Pressable accessibilityRole="button" onPress={() => router.push('/saved-outfits')}>
          <Text style={styles.homeLink}>Saved outfits →︎</Text>
          <Text style={styles.homeLinkHint}>Your favorite looks, ready to wear again</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.push('/outfit')}>
          <Text style={styles.homeLink}>Style an outfit  →︎</Text>
          <Text style={styles.homeLinkHint}>With AI recommendation</Text>
        </Pressable>
        <Pressable accessibilityRole="button" onPress={() => router.push({ pathname: '/add-item', params: { status } })}>
          <Text style={styles.homeLink}>Add an item  →︎</Text>
          <Text style={styles.homeLinkHint}>Manually or using a store link</Text>
        </Pressable>
      </View>

      <View style={styles.footer}>
        <View style={styles.footerRule} />
        <Link href="/" style={styles.footerBrand}>WEARLY</Link>
        <Text style={styles.footerText}>Made by Deema Abo Gheda · © 2026</Text>
      </View>
    </ScrollView>
  );
}
