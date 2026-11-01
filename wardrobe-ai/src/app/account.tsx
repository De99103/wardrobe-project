import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, Text } from 'react-native';
import { cloudEnabled, firebaseConfigured, googleSignIn, logOut, observeAccount } from '../services/firebaseClient';
import { uploadDeviceClothing } from '../services/wardrobeStorage';
import type { User } from 'firebase/auth';
import { styles } from '../styles/collectionStyles';

export default function AccountScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => observeAccount(value => { setUser(value); setLoading(false); }, () => { setMessage('Your account name could not be saved. Publish the updated user-profile Firestore rules, then reload this page.'); }), []);
  const run = async (operation: () => Promise<void>) => {
    setBusy(true); setMessage('');
    try { await operation(); } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not complete this action. Please try again.');
    } finally { setBusy(false); }
  };
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Your account</Text>
      {!firebaseConfigured ? <Text>Firebase is not connected yet. Collections are currently saved on this device.</Text>
        : Platform.OS !== 'web' ? <Text>Google sign-in is currently available in the web app. Native mobile sign-in needs its platform configuration.</Text>
        : loading ? <ActivityIndicator /> : user ? <>
          <Text>{user.displayName ?? user.email}</Text>
          <Text>Your signed-in wardrobe and wishlist are stored in your private cloud collection.</Text>
          <Text>Device items stay separate. Upload them only if they belong to this account.</Text>
          <Pressable style={styles.button} accessibilityRole="button" disabled={busy} onPress={() => run(async () => { const count = await uploadDeviceClothing(); setMessage(`${count} device items uploaded.`); })}><Text style={styles.buttonText}>Upload my device items</Text></Pressable>
          <Pressable style={styles.option} accessibilityRole="button" disabled={busy} onPress={() => run(logOut)}><Text>Sign out</Text></Pressable>
        </> : cloudEnabled ? <Pressable style={styles.button} accessibilityRole="button" disabled={busy} onPress={() => run(googleSignIn)}><Text style={styles.buttonText}>Continue with Google</Text></Pressable> : null}
      {busy && <ActivityIndicator />}
      {!!message && <Text accessibilityRole="alert">{message}</Text>}
    </ScrollView>
  );
}
