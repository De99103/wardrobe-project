import { useEffect, useState } from 'react';
import { Link } from 'expo-router';
import { Text, View, Pressable } from 'react-native';
import { cloudEnabled, observeAccount } from '../services/firebaseClient';
import type { User } from 'firebase/auth';
import { styles } from '../styles/collectionStyles';

export function AccountPanel({ onChange }: { onChange?: () => void }) {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => observeAccount(value => { setUser(value); onChange?.(); }), [onChange]);
  return (
    <View style={styles.accountRow}>
      <Text style={styles.message}>{user ? `Cloud collection · ${user.displayName ?? user.email ?? 'Signed in'}` : 'Saved on this device'}</Text>
      {cloudEnabled && <Link href="/account" asChild><Pressable accessibilityRole="button"><Text style={styles.storeLink}>{user ? 'Account' : 'Sign in with Google'}</Text></Pressable></Link>}
    </View>
  );
}
