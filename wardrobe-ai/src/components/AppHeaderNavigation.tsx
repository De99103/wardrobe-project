import { router, useNavigation } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';

function HeaderButton({ label, symbol, onPress }: { label: string; symbol: string; onPress: () => void }) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.button, pressed && styles.pressed]}
    >
      <Text style={styles.symbol}>{symbol}</Text>
      <Text style={styles.label}>{label}</Text>
    </Pressable>
  );
}

export function AppHeaderBack() {
  const navigation = useNavigation();
  const goBack = () => {
    if (navigation.canGoBack()) navigation.goBack();
    else router.replace('/');
  };
  return <HeaderButton label="Back" symbol="←" onPress={goBack} />;
}

export function AppHeaderHome() {
  return <HeaderButton label="Home" symbol="⌂" onPress={() => router.replace('/')} />;
}

const styles = StyleSheet.create({
  button: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    paddingHorizontal: 9,
    borderRadius: 999,
    backgroundColor: '#F1E4EC',
  },
  pressed: { opacity: 0.7 },
  symbol: { color: '#5E2D4F', fontSize: 17, lineHeight: 20, fontWeight: '700' },
  label: { color: '#5E2D4F', fontSize: 13, lineHeight: 18, fontWeight: '800' },
});
