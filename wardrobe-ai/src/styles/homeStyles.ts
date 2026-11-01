
import { Platform, StyleSheet } from 'react-native';

const editorialFont = Platform.select({ ios: 'Georgia', android: 'serif', web: 'Georgia' });

export const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    padding: 18,
    paddingTop: 28,
    paddingBottom: 48,
    backgroundColor: '#FBF6F7',
    gap: 18,
  },

  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 11, paddingHorizontal: 2 },
  brandMark: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#5E2D4F', alignItems: 'center', justifyContent: 'center' },
  brandMarkText: { color: '#FFF9FB', fontFamily: editorialFont, fontSize: 22, lineHeight: 27 },
  brandName: { color: '#5E2D4F', fontSize: 13, lineHeight: 17, fontWeight: '800', letterSpacing: 2.2 },
  brandTagline: { color: '#8A7B85', fontSize: 12, lineHeight: 17 },

  hero: {
    position: 'relative',
    backgroundColor: '#5E2D4F',
    borderRadius: 30,
    padding: 26,
    gap: 13,
    overflow: 'hidden',
  },

  heroOrb: { position: 'absolute', width: 210, height: 210, borderRadius: 105, backgroundColor: '#B96C88', opacity: 0.24, right: -82, top: -70 },
  heroOrbSmall: { position: 'absolute', width: 82, height: 82, borderRadius: 41, backgroundColor: '#F1BACB', opacity: 0.18, right: 56, bottom: -32 },

  eyebrow: {
    color: '#F3C7D5',
    fontSize: 12,
    lineHeight: 16,
    fontWeight: '800',
    letterSpacing: 1.6,
    textTransform: 'uppercase',
  },

  heroTitle: {
    color: '#FFF9FB',
    fontFamily: editorialFont,
    fontSize: 41,
    lineHeight: 47,
    letterSpacing: -0.8,
  },

  heroSubtitle: {
    color: '#F3E8ED',
    fontSize: 16,
    lineHeight: 24,
  },

  title: {
    fontSize: 32,
    lineHeight: 38,
    fontWeight: '800',
    color: '#352A33',
    fontFamily: editorialFont,
    letterSpacing: -0.6,
  },

  subtitle: {
    fontSize: 17,
    lineHeight: 24,
    color: '#766B74',
  },

  label: {
    fontSize: 14,
    lineHeight: 20,
    color: '#5B4856',
    fontWeight: '700',
  },

  button: {
    backgroundColor: '#5E2D4F',
    minHeight: 52,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonText: {
    color: '#FFF9FB',
    fontWeight: '800',
    letterSpacing: 0.1,
  },

  accentButton: {
    backgroundColor: '#F2CAD7',
    alignSelf: 'flex-start',
    marginTop: 4,
  },

  accentButtonText: {
    color: '#4D243F',
    fontSize: 15,
    fontWeight: '800',
  },

  heroFootnote: { color: '#DDB2C1', fontSize: 10, lineHeight: 14, fontWeight: '800', letterSpacing: 1.4, marginTop: 2 },

  image: {
    width: '100%',
    height: 260,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },

  input: {
    borderWidth: 1,
    borderColor: '#E8DDE3',
    borderRadius: 15,
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFDFD',
    color: '#352A33',
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
    borderColor: '#E8DDE3',
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFDFD',
  },

  navOption: {
    flex: 0,
    minHeight: 54,
  },

  selected: {
    backgroundColor: '#F1E4EC',
    borderColor: '#B57490',
  },

  quickGrid: {
    flexDirection: 'row',
    gap: 12,
  },

  quickCard: {
    flex: 1,
    minHeight: 126,
    padding: 16,
    borderRadius: 20,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E8DDE3',
    justifyContent: 'space-between',
  },

  quickCardAccent: {
    backgroundColor: '#EEE8F4',
    borderColor: '#E5DCEC',
  },

  quickTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  quickArrow: { color: '#8E5874', fontFamily: editorialFont, fontSize: 19 },

  quickCardLabel: {
    color: '#9D5B79',
    fontSize: 12,
    fontWeight: '800',
    letterSpacing: 1.1,
    textTransform: 'uppercase',
  },

  quickCardTitle: {
    color: '#352A33',
    fontFamily: editorialFont,
    fontSize: 20,
    lineHeight: 24,
    fontWeight: '800',
  },

  quickCardMeta: {
    color: '#766B74',
    fontSize: 13,
    lineHeight: 18,
  },

  panel: {
    backgroundColor: '#FFFFFF',
    borderRadius: 24,
    borderWidth: 1,
    borderColor: '#E8DDE3',
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
    backgroundColor: '#F5E4E8',
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconBadgeText: {
    color: '#8E4968',
    fontSize: 22,
    fontWeight: '500',
  },

  sectionTitle: {
    color: '#352A33',
    fontFamily: editorialFont,
    fontSize: 20,
    fontWeight: '800',
  },

  divider: {
    height: 1,
    backgroundColor: '#F0E7EC',
  },

  subtleLink: {
    color: '#8E4968',
    fontWeight: '700',
    paddingVertical: 4,
  },

  error: {
    color: '#A14657',
    fontSize: 14,
  },

  summary: {
    fontSize: 15,
    lineHeight: 22,
    color: '#6D606A',
  },
});
