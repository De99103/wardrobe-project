
import { StyleSheet } from 'react-native';
import { appFontFamily } from '../components/AppTypography';
import { BrandColors } from '../constants/brand';

export const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 880,
    alignSelf: 'center',
    padding: 18,
    paddingTop: 28,
    paddingBottom: 48,
    backgroundColor: BrandColors.ivory,
    gap: 24,
  },

  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16, paddingBottom: 18, borderBottomWidth: 1, borderBottomColor: BrandColors.charcoal },
  brandIdentity: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, gap: 11 },
  headerLinks: { flexDirection: 'row', alignItems: 'center', gap: 18 },
  brandName: { color: BrandColors.charcoal, fontFamily: appFontFamily, fontSize: 19, lineHeight: 24, fontWeight: '500', letterSpacing: 6.5 },
  infoButton: { minHeight: 40, justifyContent: 'center', borderRadius: 0, borderBottomWidth: 1, borderColor: BrandColors.charcoal, paddingHorizontal: 0 },
  infoButtonText: { color: BrandColors.charcoal, fontSize: 12, fontWeight: '700', letterSpacing: 1.2, textTransform: 'uppercase' },

  hero: {
    backgroundColor: BrandColors.ivory,
    borderRadius: 0,
    borderBottomWidth: 1,
    borderBottomColor: BrandColors.charcoal,
    paddingHorizontal: 0,
    paddingVertical: 34,
    minHeight: 176,
    justifyContent: 'center',
  },

  heroTitle: {
    color: BrandColors.charcoal,
    fontFamily: appFontFamily,
    fontSize: 50,
    lineHeight: 54,
    fontWeight: '400',
    letterSpacing: -1.4,
  },

  heroHint: {
    color: BrandColors.mutedText,
    fontFamily: appFontFamily,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 16,
  },

  heroLink: {
    color: BrandColors.mutedText,
    fontFamily: appFontFamily,
    fontSize: 14,
    fontWeight: '600',
    textDecorationLine: 'underline',
  },

  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    color: BrandColors.charcoal,
    fontFamily: appFontFamily,
    letterSpacing: -0.6,
  },

  subtitle: {
    fontSize: 17,
    lineHeight: 24,
    color: BrandColors.mutedText,
  },

  label: {
    fontSize: 14,
    lineHeight: 20,
    color: BrandColors.charcoal,
    fontWeight: '700',
  },

  button: {
    backgroundColor: BrandColors.charcoal,
    minHeight: 52,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonText: {
    color: BrandColors.ivory,
    fontWeight: '800',
    letterSpacing: 0.1,
  },

  image: {
    width: '100%',
    height: 260,
    borderRadius: 2,
    backgroundColor: BrandColors.white,
  },

  input: {
    borderWidth: 0,
    borderBottomWidth: 1,
    borderColor: BrandColors.charcoal,
    borderRadius: 0,
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: BrandColors.ivory,
    color: BrandColors.charcoal,
    fontSize: 16,
  },

  row: {
    flexDirection: 'row',
    gap: 12,
  },

  option: {
    flex: 1,
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderWidth: 0,
    borderBottomWidth: 1,
    borderColor: BrandColors.stone,
    borderRadius: 0,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrandColors.ivory,
  },

  navOption: {
    flex: 0,
    minHeight: 54,
  },

  selected: {
    backgroundColor: BrandColors.ivory,
    borderBottomWidth: 2,
    borderColor: BrandColors.charcoal,
  },

  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 0,
  },

  quickCard: {
    flex: 1,
    flexBasis: 260,
    minHeight: 126,
    paddingLeft: 0,
    paddingRight: 18,
    paddingVertical: 18,
    borderRadius: 0,
    backgroundColor: BrandColors.ivory,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: BrandColors.stone,
    justifyContent: 'space-between',
  },

  quickCardAccent: {
    backgroundColor: BrandColors.ivory,
    borderColor: BrandColors.stone,
  },

  quickTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },

  quickCardLabel: {
    color: BrandColors.charcoal,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },

  quickArrow: { color: BrandColors.charcoal, fontSize: 22 },

  quickCardTitle: {
    color: BrandColors.charcoal,
    fontFamily: appFontFamily,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '800',
  },

  homeLinks: { gap: 14, marginTop: 20, paddingVertical: 4 },
  homeLink: { color: BrandColors.charcoal, fontFamily: appFontFamily, fontSize: 16, fontWeight: '700', paddingVertical: 8 },
  homeLinkHint: { color: BrandColors.mutedText, fontFamily: appFontFamily, fontSize: 13, marginTop: -4 },

  footer: { gap: 8, marginTop: 48, paddingTop: 18, paddingBottom: 8 },
  footerRule: { height: 1, backgroundColor: BrandColors.charcoal, marginBottom: 12 },
  footerBrand: { color: BrandColors.charcoal, fontFamily: appFontFamily, fontSize: 12, letterSpacing: 3, fontWeight: '600' },
  footerText: { color: BrandColors.mutedText, fontFamily: appFontFamily, fontSize: 12 },

  quickCardMeta: {
    color: BrandColors.mutedText,
    fontSize: 13,
    lineHeight: 18,
  },

  panel: {
    backgroundColor: BrandColors.ivory,
    borderRadius: 0,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: BrandColors.charcoal,
    paddingHorizontal: 0,
    paddingVertical: 24,
    gap: 18,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  iconBadge: {
    width: 28,
    height: 40,
    backgroundColor: 'transparent',
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconBadgeText: {
    color: BrandColors.charcoal,
    fontSize: 26,
    fontWeight: '300',
  },

  sectionTitle: {
    color: BrandColors.charcoal,
    fontFamily: appFontFamily,
    fontSize: 20,
    fontWeight: '800',
  },

  divider: {
    height: 1,
    backgroundColor: BrandColors.stone,
  },

  subtleLink: {
    color: BrandColors.charcoal,
    fontFamily: appFontFamily,
    fontWeight: '700',
    paddingVertical: 4,
  },

  error: {
    color: BrandColors.error,
    fontSize: 14,
  },

  summary: {
    fontSize: 15,
    lineHeight: 22,
    color: BrandColors.mutedText,
  },
});
