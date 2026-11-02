
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
    paddingTop: 28,
    paddingBottom: 48,
    backgroundColor: BrandColors.ivory,
    gap: 18,
  },

  brandRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 11, paddingHorizontal: 2 },
  brandIdentity: { flexDirection: 'row', alignItems: 'center', flexShrink: 1, gap: 11 },
  brandName: { color: BrandColors.charcoal, fontFamily: appFontFamily, fontSize: 18, lineHeight: 22, fontWeight: '500', letterSpacing: 5.5 },
  brandTagline: { color: BrandColors.mutedText, fontSize: 12, lineHeight: 17 },
  infoButton: { minHeight: 40, justifyContent: 'center', borderRadius: 999, borderWidth: 1, borderColor: BrandColors.stone, backgroundColor: BrandColors.ivory, paddingHorizontal: 13 },
  infoButtonText: { color: BrandColors.charcoal, fontSize: 13, fontWeight: '800' },

  hero: {
    position: 'relative',
    backgroundColor: BrandColors.charcoal,
    borderRadius: 30,
    padding: 26,
    minHeight: 156,
    justifyContent: 'center',
    overflow: 'hidden',
  },

  heroOrb: { position: 'absolute', width: 210, height: 210, borderRadius: 105, backgroundColor: BrandColors.warmBeige, opacity: 0.2, right: -82, top: -70 },
  heroOrbSmall: { position: 'absolute', width: 82, height: 82, borderRadius: 41, backgroundColor: BrandColors.stone, opacity: 0.18, right: 56, bottom: -32 },

  heroTitle: {
    color: BrandColors.ivory,
    fontFamily: appFontFamily,
    fontSize: 41,
    lineHeight: 47,
    letterSpacing: -0.8,
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
    borderRadius: 16,
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
    borderRadius: 16,
    backgroundColor: BrandColors.white,
  },

  input: {
    borderWidth: 1,
    borderColor: BrandColors.stone,
    borderRadius: 15,
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: BrandColors.white,
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
    borderWidth: 1,
    borderColor: BrandColors.stone,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: BrandColors.white,
  },

  navOption: {
    flex: 0,
    minHeight: 54,
  },

  selected: {
    backgroundColor: BrandColors.warmBeige,
    borderColor: BrandColors.charcoal,
  },

  quickGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },

  quickCard: {
    flex: 1,
    flexBasis: 160,
    minHeight: 126,
    padding: 16,
    borderRadius: 20,
    backgroundColor: BrandColors.white,
    borderWidth: 1,
    borderColor: BrandColors.stone,
    justifyContent: 'space-between',
  },

  quickCardAccent: {
    backgroundColor: BrandColors.warmBeige,
    borderColor: BrandColors.stone,
  },

  quickTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  quickArrow: { color: BrandColors.charcoal, fontFamily: appFontFamily, fontSize: 19 },

  quickCardLabel: {
    color: BrandColors.charcoal,
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },

  quickCardTitle: {
    color: BrandColors.charcoal,
    fontFamily: appFontFamily,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '800',
  },

  quickCardMeta: {
    color: BrandColors.mutedText,
    fontSize: 13,
    lineHeight: 18,
  },

  panel: {
    backgroundColor: BrandColors.white,
    borderRadius: 24,
    borderWidth: 1,
    borderColor: BrandColors.stone,
    padding: 18,
    gap: 14,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  iconBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: BrandColors.warmBeige,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconBadgeText: {
    color: BrandColors.charcoal,
    fontSize: 22,
    fontWeight: '500',
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
