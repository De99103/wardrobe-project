import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { observeAccount } from '../services/firebaseClient';
import { AppHeader } from '../components/AppHeaderNavigation';
import { appFontFamily } from '../components/AppTypography';
import { BrandColors } from '../constants/brand';
import { useLanguage } from '../services/i18n';

export default function RootLayout() {
  const { language } = useLanguage();
  const [signedIn, setSignedIn] = useState<boolean | null>(null);
  useEffect(() => observeAccount(user => setSignedIn(!!user)), []);
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = 'ltr';
      document.body.dir = 'ltr';
      document.documentElement.style.direction = 'ltr';
      document.body.style.direction = 'ltr';
    }
  }, [language]);
  // Wait for Firebase to restore the session before mounting any route.
  if (signedIn === null) return <View style={{ flex: 1, justifyContent: 'center', backgroundColor: BrandColors.ivory }}>
    <ActivityIndicator accessibilityLabel={language === 'ar' ? 'جارٍ التحقق من تسجيل الدخول' : 'Checking sign-in'} color={BrandColors.charcoal} />
  </View>;
  return (
    <Stack screenOptions={{
      headerStyle: { backgroundColor: BrandColors.ivory } as any,
      headerShadowVisible: false,
      headerTintColor: BrandColors.charcoal,
      headerTitleStyle: { color: BrandColors.charcoal, fontFamily: appFontFamily, fontWeight: '700' },
      headerTitleAlign: 'center',
      headerBackVisible: false,
      header: ({ options }) => <AppHeader title={typeof options.title === 'string' ? options.title : 'Wearly'} />,
      contentStyle: { backgroundColor: BrandColors.ivory },
    }}>
      <Stack.Screen name="account" options={{ title: 'Account' }} />
      <Stack.Screen name="information" options={{ title: 'Information' }} />
      <Stack.Screen
        name="index"
        options={{ title: 'Wearly', headerShown: false, headerLeft: undefined, headerRight: undefined }}
      />
      <Stack.Protected guard={signedIn}>
        <Stack.Screen name="add-item" options={{ title: 'Add item' }} />
        <Stack.Screen name="explore" options={{ title: 'Explore' }} />
        <Stack.Screen name="browser-import" options={{ title: 'Browser import' }} />
        <Stack.Screen name="import-result" options={{ title: 'Import' }} />
        <Stack.Screen name="outfit" options={{ title: 'Outfit stylist' }} />
        <Stack.Screen name="saved-outfits" options={{ title: 'Saved outfits' }} />
        <Stack.Screen name="create-outfit" options={{ title: 'Create a look' }} />
        <Stack.Screen
          name="wardrobe"
          options={{ title: 'Collection' }}
        />
      </Stack.Protected>
    </Stack>
  );
}
