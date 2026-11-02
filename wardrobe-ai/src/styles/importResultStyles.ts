import { StyleSheet } from 'react-native';
import { appFontFamily as editorialFont } from '../components/AppTypography';

const palette = {
  ivory: '#FBF6F7', paper: '#FFFDFD', forest: '#5E2D4F', ink: '#352A33',
  terracotta: '#D98CA3', muted: '#766B74', line: '#E8DDE3', sage: '#F1E4EC',
};
export const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: palette.ivory },
  container: {
    flexGrow: 1, width: '100%', maxWidth: 780, alignSelf: 'center',
    padding: 24, paddingTop: 32, paddingBottom: 56, gap: 24,
  },
  centered: {
    flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32,
    backgroundColor: palette.ivory, gap: 22,
  },
  eyebrow: { fontSize: 11, fontWeight: '700', letterSpacing: 2.4, color: palette.forest },
  header: { gap: 12 },
  title: { fontFamily: editorialFont, fontSize: 38, lineHeight: 44, color: palette.forest },
  subtitle: { fontSize: 15, lineHeight: 23, color: palette.muted, maxWidth: 540 },
  imageContainer: {
    width: '100%', aspectRatio: 1, maxHeight: 440, backgroundColor: '#F5E4E8',
    borderRadius: 22, justifyContent: 'center', alignItems: 'center', overflow: 'hidden',
  },
  image: { width: '100%', height: '100%' },
  imagePlaceholder: { alignItems: 'center', gap: 12, padding: 28 },
  placeholderMark: { color: palette.forest, fontSize: 44, fontFamily: editorialFont },
  card: {
    backgroundColor: palette.paper, borderRadius: 22, padding: 24, gap: 20,
    borderWidth: 1, borderColor: palette.line,
  },
  recoveryCard: {
    backgroundColor: palette.paper, borderRadius: 22, padding: 24, gap: 18,
    borderWidth: 1, borderColor: palette.line, borderTopWidth: 3, borderTopColor: palette.terracotta,
  },
  editCard: {
    backgroundColor: palette.paper, borderRadius: 22, padding: 24, gap: 18,
    borderWidth: 1, borderColor: palette.line, borderTopWidth: 3, borderTopColor: '#B57490',
  },
  editField: { gap: 8 },
  editActions: { gap: 10 },
  categoryGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  categoryPill: {
    minHeight: 40, justifyContent: 'center', borderWidth: 1, borderColor: palette.line,
    borderRadius: 999, backgroundColor: '#FFFFFF', paddingHorizontal: 13, paddingVertical: 8,
  },
  categoryPillSelected: { borderColor: '#B57490', backgroundColor: palette.sage },
  categoryText: { color: palette.forest, fontWeight: '600' },
  input: {
    minHeight: 50, borderWidth: 1, borderColor: palette.line, borderRadius: 14,
    paddingHorizontal: 14, paddingVertical: 12, backgroundColor: '#FFFFFF', color: palette.ink, fontSize: 16,
  },
  incompleteNotice: { backgroundColor: '#FAECEF', borderRadius: 13, padding: 12 },
  cardTitle: { fontFamily: editorialFont, fontSize: 27, lineHeight: 34, color: palette.forest },
  productName: { fontFamily: editorialFont, fontSize: 30, lineHeight: 37, color: palette.ink },
  price: { fontSize: 22, fontWeight: '600', color: palette.forest },
  productHeader: { gap: 12 },
  detailGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 20, borderTopWidth: 1, borderTopColor: palette.line, paddingTop: 20 },
  detail: { flexGrow: 1, flexBasis: 140, gap: 7 },
  label: { fontSize: 11, fontWeight: '700', letterSpacing: 1.3, textTransform: 'uppercase', color: palette.muted },
  value: { fontSize: 15, lineHeight: 23, color: palette.ink },
  statusBox: {
    backgroundColor: palette.sage, padding: 20, borderRadius: 16,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 16,
  },
  statusCopy: { flex: 1, gap: 7 },
  statusMark: { color: palette.forest, fontSize: 25 },
  message: { fontSize: 15, lineHeight: 23, color: palette.muted, textAlign: 'center', maxWidth: 440 },
  button: {
    backgroundColor: palette.forest, minHeight: 54, paddingHorizontal: 20, paddingVertical: 16,
    borderRadius: 14, alignItems: 'center', justifyContent: 'center',
  },
  buttonText: { color: palette.paper, fontWeight: '600', fontSize: 15, textAlign: 'center' },
  secondaryButton: {
    minHeight: 52, borderWidth: 1, borderColor: palette.line, borderRadius: 14,
    padding: 15, alignItems: 'center', justifyContent: 'center',
  },
  secondaryButtonText: { color: palette.forest, fontWeight: '600', fontSize: 15, textAlign: 'center' },
  backText: { color: palette.forest, fontWeight: '600', fontSize: 14, lineHeight: 22, paddingVertical: 10 },
  storeLink: { color: palette.forest, fontFamily: editorialFont, fontWeight: '600', fontSize: 14, lineHeight: 22, paddingVertical: 8, textDecorationLine: 'underline' },
  descriptionInput: {
    backgroundColor: palette.paper, borderWidth: 1, borderColor: palette.line,
    borderRadius: 14, padding: 16, minHeight: 140, fontSize: 16, lineHeight: 24, color: palette.ink,
  },
  errorText: { color: '#A14657', fontSize: 14, lineHeight: 22 },
  mutedNote: { color: palette.muted, fontSize: 13, lineHeight: 21 },
  actions: { gap: 12 },
  step: { flexDirection: 'row', alignItems: 'flex-start', gap: 16 },
  stepNumber: { fontFamily: editorialFont, fontSize: 25, color: palette.forest, width: 32 },
  stepContent: { flex: 1, gap: 6 },
  stepTitle: { fontSize: 16, fontWeight: '600', lineHeight: 23, color: palette.ink },
  divider: { height: 1, backgroundColor: palette.line },
});
