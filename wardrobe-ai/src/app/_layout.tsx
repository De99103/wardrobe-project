import { Stack } from 'expo-router';

export default function RootLayout() {
  return (
    <Stack screenOptions={{
      headerStyle: { backgroundColor: '#FBF6F7' },
      headerShadowVisible: false,
      headerTintColor: '#5E2D4F',
      headerTitleStyle: { color: '#352A33', fontWeight: '700' },
      contentStyle: { backgroundColor: '#FBF6F7' },
    }}>
      <Stack.Screen name="add-item" options={{ title: 'Add an item' }} />
      <Stack.Screen name="account" options={{ title: 'Your Account' }} />
      <Stack.Screen name="browser-import" options={{ title: 'Browser Import' }} />
      <Stack.Screen name="import-result" options={{ title: 'Import Clothing' }} />
      <Stack.Screen name="outfit" options={{ title: 'AI Outfit Stylist' }} />
      <Stack.Screen
        name="index"
        options={{ title: 'Wardrobe AI', headerShown: false }}
      />
      <Stack.Screen
        name="wardrobe"
        options={{ title: 'My Wardrobe' }}
      />
    </Stack>
  );
}
