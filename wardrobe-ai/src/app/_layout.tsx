import { Stack } from 'expo-router';
import { observeAccount } from '../services/firebaseClient';
import { useActiveProfile } from '../components/ProfileLink';
import { useEffect } from 'react';
import { AppHeader } from '../components/AppHeaderNavigation';
import { appFontFamily } from '../components/AppTypography';
import { BrandColors } from '../constants/brand';
import { useLanguage } from '../services/i18n';

export default function RootLayout() {
  const { language } = useLanguage();
  const profile = useActiveProfile();
  useEffect(() => observeAccount(() => {}), []);
  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.documentElement.dir = 'ltr';
      document.body.dir = 'ltr';
      document.documentElement.style.direction = 'ltr';
      document.body.style.direction = 'ltr';
    }
  }, [language]);
  return (
    <Stack key={profile.revision} screenOptions={{
      headerStyle: { backgroundColor: BrandColors.ivory } as any,
      headerShadowVisible: false,
      headerTintColor: BrandColors.charcoal,
      headerTitleStyle: { color: BrandColors.charcoal, fontFamily: appFontFamily, fontWeight: '700' },
      headerTitleAlign: 'center',
      headerBackVisible: false,
      header: ({ options }) => <AppHeader title={typeof options.title === 'string' ? options.title : 'Wearly'} />,
      contentStyle: { backgroundColor: BrandColors.ivory },
    }}>
      <Stack.Screen name="add-item" options={{ title: 'Add item' }} />
      <Stack.Screen name="account" options={{ title: 'Account' }} />
      <Stack.Screen name="browser-import" options={{ title: 'Browser import' }} />
      <Stack.Screen name="import-result" options={{ title: 'Import' }} />
      <Stack.Screen name="information" options={{ title: 'Information' }} />
      <Stack.Screen name="outfit" options={{ title: 'Outfit stylist' }} />
      <Stack.Screen name="saved-outfits" options={{ title: 'Saved outfits' }} />
      <Stack.Screen
        name="index"
        options={{ title: 'Wearly', headerShown: false, headerLeft: undefined, headerRight: undefined }}
      />
      <Stack.Screen
        name="wardrobe"
        options={{ title: 'Collection' }}
      />
    </Stack>
  );
}
