import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: { flex: 1, padding: 24, backgroundColor: '#FAF7F2', gap: 16 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#292524' },
  row: { flexDirection: 'row', gap: 12 },
  option: { flex: 1, padding: 16, borderWidth: 1, borderColor: '#ccc', borderRadius: 12, alignItems: 'center' },
  selected: { backgroundColor: '#D9E8DD', borderColor: '#54745D' },
  message: { color: '#78716C', fontSize: 15 },
  error: { color: '#B91C1C' },
  button: { padding: 16, backgroundColor: '#292524', borderRadius: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
  list: { gap: 16, paddingBottom: 16 },
  card: { padding: 16, backgroundColor: '#fff', borderRadius: 12, gap: 8 },
  name: { fontSize: 18, fontWeight: '600' },
  accountRow: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10 },
  filters: { flexGrow: 0, maxHeight: 46 },
  chips: { gap: 8, alignItems: 'center' },
  chip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 18, borderWidth: 1, borderColor: '#D6D3D1' },
  sortRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, alignItems: 'center' },
  sectionTitle: { fontSize: 19, fontWeight: '600', color: '#54745D', marginTop: 8 },
  storeLink: { color: '#365C41', fontWeight: '600', paddingVertical: 8, textDecorationLine: 'underline' },
  image: { width: '100%', height: 200 },
});
