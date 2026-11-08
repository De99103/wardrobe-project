import { useSyncExternalStore } from 'react';
import { Link } from 'expo-router';
import { Pressable } from 'react-native';
import { Text } from './AppTypography';
import { getProfileSession, getServerProfileSession, subscribeProfiles } from '../services/profileSession';
import { useLanguage } from '../services/i18n';
import { styles } from '../styles/collectionStyles';

export function useActiveProfile() {
  return useSyncExternalStore(subscribeProfiles, getProfileSession, getServerProfileSession);
}
export function ProfileLink() {
  const profile = useActiveProfile();
  const { language } = useLanguage();
  if (!profile.uid) return null;
  const name = profile.id === 'main' ? (language === 'ar' ? 'الملف الرئيسي' : 'Main profile') : profile.name;
  return <Link href="/account" asChild><Pressable accessibilityRole="button" style={{ minHeight: 44, justifyContent: 'center' }}>
    <Text style={styles.storeLink}>{language === 'ar' ? `الملف: ${name} · تبديل` : `Profile: ${name} · Switch`}</Text>
  </Pressable></Link>;
}
