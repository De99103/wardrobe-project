import { router, useNavigation } from 'expo-router';
import { Pressable, StyleSheet, View } from 'react-native';
import { appFontFamily, Text } from './AppTypography';
import { BrandColors } from '../constants/brand';
import { useLanguage } from '../services/i18n';

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
  return <HeaderButton label="Back" symbol="←︎" onPress={goBack} />;
}

export function AppHeaderHome() {
  return <HeaderButton label="Home" symbol="⌂" onPress={() => router.replace('/')} />;
}

export function AppHeaderLanguage() {
  const { language, setLanguage } = useLanguage();
  return <HeaderButton label={language === 'ar' ? 'English' : 'العربية'} symbol="" onPress={() => setLanguage(language === 'ar' ? 'en' : 'ar')} />;
}

export function AppHeader({ title }: { title: string }) {
  const navigation = useNavigation();
  const goBack = () => navigation.canGoBack() ? navigation.goBack() : router.replace('/');
  return <View style={styles.header}>
    <View style={styles.headerSide}><HeaderButton label="Back" symbol="←︎" onPress={goBack} /></View>
    <Text style={styles.headerTitle}>{title}</Text>
    <View style={[styles.headerSide, styles.headerRight]}><AppHeaderLanguage /><HeaderButton label="Home" symbol="⌂" onPress={() => router.replace('/')} /></View>
  </View>;
}

const styles = StyleSheet.create({
  header: { height: 86, width: '100%', maxWidth: 880, alignSelf: 'center', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: BrandColors.ivory, borderBottomWidth: 1, borderColor: BrandColors.charcoal, paddingHorizontal: 18 },
  headerSide: { flex: 1, flexDirection: 'row', alignItems: 'center' },
  headerRight: { justifyContent: 'flex-end', gap: 10 },
  headerTitle: { flex: 1, color: BrandColors.charcoal, fontFamily: appFontFamily, fontSize: 24, lineHeight: 30, fontWeight: '700', textAlign: 'center' },
  button: {
    minHeight: 32,
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
