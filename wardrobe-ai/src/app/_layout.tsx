import { Stack } from 'expo-router';
import { AppHeaderBack, AppHeaderHome } from '../components/AppHeaderNavigation';

export default function RootLayout() {
  return (
    <Stack screenOptions={{
      headerStyle: { backgroundColor: '#FBF6F7' },
      headerShadowVisible: false,
      headerTintColor: '#5E2D4F',
      headerTitleStyle: { color: '#352A33', fontWeight: '700' },
      headerTitleAlign: 'center',
      headerBackVisible: false,
      headerLeft: () => <AppHeaderBack />,
      headerRight: () => <AppHeaderHome />,
      contentStyle: { backgroundColor: '#FBF6F7' },
    }}>
      <Stack.Screen name="add-item" options={{ title: 'Add item' }} />
      <Stack.Screen name="account" options={{ title: 'Account' }} />
      <Stack.Screen name="browser-import" options={{ title: 'Browser import' }} />
      <Stack.Screen name="import-result" options={{ title: 'Import' }} />
      <Stack.Screen name="outfit" options={{ title: 'Outfit stylist' }} />
      <Stack.Screen
        name="index"
        options={{ title: 'Wardrobe AI', headerShown: false, headerLeft: undefined, headerRight: undefined }}
      />
      <Stack.Screen
        name="wardrobe"
        options={{ title: 'Collection' }}
      />
    </Stack>
  );
}
