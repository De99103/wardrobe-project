import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1, width: '100%', maxWidth: 980, alignSelf: 'center', padding: 18, backgroundColor: '#FAF7F2', gap: 14 },
  title: { fontSize: 30, lineHeight: 36, fontWeight: '800', color: '#292524' },
  row: { flexDirection: 'row', gap: 12 },
  option: { flex: 1, minHeight: 50, paddingHorizontal: 14, paddingVertical: 12, borderWidth: 1, borderColor: '#D6D3D1', borderRadius: 14, alignItems: 'center', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  selected: { backgroundColor: '#D9E8DD', borderColor: '#54745D' },
  message: { color: '#78716C', fontSize: 15 },
  error: { color: '#B91C1C' },
  button: { minHeight: 52, paddingHorizontal: 18, paddingVertical: 14, backgroundColor: '#292524', borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
  list: { gap: 14, paddingBottom: 20 },
  card: { padding: 16, backgroundColor: '#fff', borderRadius: 16, gap: 9, borderWidth: 1, borderColor: '#EEEAE4' },
  name: { fontSize: 19, lineHeight: 24, fontWeight: '700', color: '#292524' },
  accountRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  filters: { flexGrow: 0, height: 48, minHeight: 48 },
  chips: { gap: 8, alignItems: 'center', paddingVertical: 4 },
  chip: { minHeight: 38, paddingHorizontal: 13, paddingVertical: 8, borderRadius: 20, borderWidth: 1, borderColor: '#D6D3D1', justifyContent: 'center', backgroundColor: '#FFFFFF' },
  sortRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  sectionTitle: { fontSize: 19, fontWeight: '600', color: '#54745D', marginTop: 8 },
  storeLink: { color: '#365C41', fontWeight: '600', paddingVertical: 8, textDecorationLine: 'underline' },
  image: { width: '100%', height: 230, borderRadius: 12, backgroundColor: '#F5F3F0' },
});
