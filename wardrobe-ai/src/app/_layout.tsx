import { Stack } from 'expo-router';
import { AppHeaderBack, AppHeaderHome } from '../components/AppHeaderNavigation';
import { appFontFamily } from '../components/AppTypography';
import { BrandColors } from '../constants/brand';

export default function RootLayout() {
  return (
    <Stack screenOptions={{
      headerStyle: { backgroundColor: BrandColors.ivory, height: 58 } as any,
      headerShadowVisible: false,
      headerTintColor: BrandColors.charcoal,
      headerTitleStyle: { color: BrandColors.charcoal, fontFamily: appFontFamily, fontWeight: '700' },
      headerTitleAlign: 'center',
      headerBackVisible: false,
      headerLeft: () => <AppHeaderBack />,
      headerRight: () => <AppHeaderHome />,
      contentStyle: { backgroundColor: BrandColors.ivory },
    }}>
      <Stack.Screen name="add-item" options={{ title: 'Add item' }} />
      <Stack.Screen name="account" options={{ title: 'Account' }} />
      <Stack.Screen name="browser-import" options={{ title: 'Browser import' }} />
      <Stack.Screen name="import-result" options={{ title: 'Import' }} />
      <Stack.Screen name="information" options={{ title: 'Information' }} />
      <Stack.Screen name="outfit" options={{ title: 'Outfit stylist' }} />
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
