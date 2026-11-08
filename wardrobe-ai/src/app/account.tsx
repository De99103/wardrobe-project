import { useEffect, useState } from 'react';
import { ActivityIndicator, Platform, Pressable, ScrollView, View } from 'react-native';
import { router } from 'expo-router';
import { cloudEnabled, finishGoogleSignIn, firebaseConfigured, googleSignIn, logOut, observeAccount } from '../services/firebaseClient';
import { uploadDeviceClothing } from '../services/wardrobeStorage';
import { Text } from '../components/AppTypography';
import type { User } from 'firebase/auth';
import { styles } from '../styles/collectionStyles';

export default function AccountScreen() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => {
    let active = true;
    void finishGoogleSignIn()
      .then(result => { if (active && result) router.replace('/'); })
      .catch(error => {
        if (active) setMessage(error instanceof Error ? error.message : 'Google sign-in could not be completed.');
      });
    const unsubscribe = observeAccount(value => { setUser(value); setLoading(false); }, () => { setMessage('Your account name could not be saved. Publish the updated user-profile Firestore rules, then reload this page.'); });
    return () => { active = false; unsubscribe(); };
  }, []);
  const run = async (operation: () => Promise<void>) => {
    setBusy(true); setMessage('');
    try { await operation(); } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Could not complete this action. Please try again.');
    } finally { setBusy(false); }
  };
  const identity = user?.displayName ?? user?.email ?? 'Your account';
  const initials = identity.split(/\s+|@/).filter(Boolean).slice(0, 2).map(part => part[0]?.toUpperCase()).join('') || 'WA';
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.container}>
      <Text style={styles.eyebrow}>Profile & sync</Text>
      <Text style={styles.title}>Your account</Text>
      <Text style={styles.subtitle}>Keep your wardrobe private, backed up, and available across devices.</Text>
      {!firebaseConfigured ? <View style={styles.accountCard}><View style={styles.statusBadge}><Text style={styles.statusBadgeText}>Saved on device</Text></View><Text style={styles.accountBody}>Firebase is not connected yet. Your collection is safely stored on this device.</Text></View>
        : Platform.OS !== 'web' ? <View style={styles.accountCard}><Text style={styles.accountName}>Mobile sign-in is coming next</Text><Text style={styles.accountBody}>Google sign-in currently works in the web app. Native sign-in needs the iOS and Android platform configuration.</Text></View>
        : loading ? <ActivityIndicator /> : user ? <>
          <View style={styles.accountCard}>
            <View style={styles.identityRow}><View style={styles.avatar}><Text style={styles.avatarText}>{initials}</Text></View><View style={{ flex: 1 }}><Text style={styles.accountName}>{identity}</Text><Text style={styles.accountBody}>{user.email}</Text></View></View>
            <View style={styles.statusBadge}><Text style={styles.statusBadgeText}>Cloud synced</Text></View>
            <Text style={styles.accountBody}>Your wardrobe and wishlist are stored in your private cloud collection.</Text>
          </View>
          <View style={styles.accountCard}>
            <Text style={styles.accountName}>Items saved on this device</Text>
            <Text style={styles.accountBody}>Device items stay separate. Upload them only if they belong to this account.</Text>
            <Pressable style={styles.tertiaryButton} accessibilityRole="button" disabled={busy} onPress={() => run(async () => { const count = await uploadDeviceClothing(); setMessage(`${count} device items uploaded.`); })}><Text style={styles.tertiaryButtonText}>Upload device items</Text></Pressable>
          </View>
          <Pressable style={styles.dangerAction} accessibilityRole="button" disabled={busy} onPress={() => run(logOut)}><Text style={styles.dangerText}>Sign out</Text></Pressable>
        </> : cloudEnabled ? <>
          <Pressable style={styles.button} accessibilityRole="button" disabled={busy} onPress={() => run(async () => { const result = await googleSignIn(); if (result) router.replace('/'); })}><Text style={styles.buttonText}>Continue with Google</Text></Pressable>
          <Text style={styles.message}>On mobile, Google opens securely in this window and returns you here.</Text>
        </> : null}
      {busy && <ActivityIndicator />}
      {!!message && <Text accessibilityRole="alert" style={styles.message}>{message}</Text>}
    </ScrollView>
  );
}
