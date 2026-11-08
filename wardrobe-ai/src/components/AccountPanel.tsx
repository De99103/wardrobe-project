import { useEffect, useState } from 'react';
import { Link } from 'expo-router';
import { View, Pressable } from 'react-native';
import { cloudEnabled, observeAccount } from '../services/firebaseClient';
import type { User } from 'firebase/auth';
import { styles } from '../styles/collectionStyles';
import { useActiveProfile } from './ProfileLink';
import { Text } from './AppTypography';

export function AccountPanel({ onChange }: { onChange?: () => void }) {
  const profile = useActiveProfile();
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => observeAccount(value => { setUser(value); onChange?.(); }), [onChange]);
  return (
    <View style={styles.accountRow}>
      <View style={styles.statusBadge}><Text style={styles.statusBadgeText}>{user ? 'Cloud synced' : 'Saved on device'}</Text></View>
      <Text style={styles.message}>{user ? (profile.id === 'secondary' ? profile.name : user.displayName ?? user.email ?? 'Signed in') : 'Your collection stays on this device'}</Text>
      {cloudEnabled && <Link href="/account" asChild><Pressable accessibilityRole="button"><Text style={styles.storeLink}>{user ? 'Account' : 'Sign in with Google'}</Text></Pressable></Link>}
    </View>
  );
}
