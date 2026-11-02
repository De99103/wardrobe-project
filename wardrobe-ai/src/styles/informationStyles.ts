import { StyleSheet } from 'react-native';
import { appFontFamily } from '../components/AppTypography';

export const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    padding: 18,
    paddingTop: 26,
    paddingBottom: 48,
    backgroundColor: '#FBF6F7',
    gap: 16,
  },
  eyebrow: { color: '#9D5B79', fontSize: 12, lineHeight: 16, fontWeight: '800', letterSpacing: 1.5, textTransform: 'uppercase' },
  title: { color: '#352A33', fontFamily: appFontFamily, fontSize: 36, lineHeight: 42, fontWeight: '800' },
  subtitle: { color: '#766B74', fontSize: 16, lineHeight: 23 },
  steps: { gap: 12 },
  card: { flexDirection: 'row', alignItems: 'flex-start', gap: 13, borderWidth: 1, borderColor: '#E8DDE3', borderRadius: 20, backgroundColor: '#FFFDFD', padding: 17 },
  number: { width: 34, height: 34, borderRadius: 17, backgroundColor: '#5E2D4F', alignItems: 'center', justifyContent: 'center' },
  numberText: { color: '#FFF9FB', fontWeight: '800' },
  copy: { flex: 1, gap: 5 },
  cardTitle: { color: '#352A33', fontFamily: appFontFamily, fontSize: 19, lineHeight: 25, fontWeight: '800' },
  body: { color: '#6D606A', fontSize: 15, lineHeight: 22 },
  noteCard: { borderRadius: 20, backgroundColor: '#F5E4E8', padding: 18, gap: 7 },
});
