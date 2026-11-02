import { router, useNavigation } from 'expo-router';
import { Pressable, StyleSheet } from 'react-native';
import { Text } from './AppTypography';
import { BrandColors } from '../constants/brand';

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
    paddingHorizontal: 2,
    borderRadius: 0,
    backgroundColor: 'transparent',
    borderBottomWidth: 1,
    borderColor: BrandColors.charcoal,
  },
  pressed: { opacity: 0.7 },
  symbol: { color: BrandColors.charcoal, fontSize: 17, lineHeight: 20, fontWeight: '700' },
  label: { color: BrandColors.charcoal, fontSize: 13, lineHeight: 18, fontWeight: '800' },
});
