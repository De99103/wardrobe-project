import { StyleSheet } from 'react-native';
import { appFontFamily } from '../components/AppTypography';
import { BrandColors } from '../constants/brand';

export const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    padding: 18,
    paddingTop: 26,
    paddingBottom: 48,
    backgroundColor: BrandColors.ivory,
    gap: 16,
  },
  eyebrow: { color: BrandColors.charcoal, fontSize: 12, lineHeight: 16, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },
  title: { color: BrandColors.charcoal, fontFamily: appFontFamily, fontSize: 36, lineHeight: 42, fontWeight: '800' },
  subtitle: { color: BrandColors.mutedText, fontSize: 16, lineHeight: 23 },
  steps: { gap: 0, borderTopWidth: 1, borderTopColor: BrandColors.charcoal },
  card: { flexDirection: 'row', alignItems: 'flex-start', gap: 13, borderBottomWidth: 1, borderColor: BrandColors.stone, borderRadius: 0, backgroundColor: BrandColors.ivory, paddingVertical: 20 },
  number: { width: 34, height: 34, borderRadius: 0, backgroundColor: 'transparent', alignItems: 'center', justifyContent: 'center' },
  numberText: { color: BrandColors.charcoal, fontWeight: '700' },
  copy: { flex: 1, gap: 5 },
  cardTitle: { color: BrandColors.charcoal, fontFamily: appFontFamily, fontSize: 19, lineHeight: 25, fontWeight: '800' },
  body: { color: BrandColors.mutedText, fontSize: 15, lineHeight: 22 },
  noteCard: { borderTopWidth: 1, borderBottomWidth: 1, borderColor: BrandColors.charcoal, borderRadius: 0, backgroundColor: BrandColors.ivory, paddingVertical: 20, gap: 7 },
});
