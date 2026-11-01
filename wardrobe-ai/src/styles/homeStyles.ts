
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    padding: 24,
    paddingTop: 70,
    backgroundColor: '#FAF7F2',
    gap: 16,
  },

  title: {
    fontSize: 32,
    fontWeight: 'bold',
  },

  subtitle: {
    fontSize: 18,
    color: '#666',
  },

  label: {
    fontSize: 16,
    fontWeight: '600',
  },

  button: {
    backgroundColor: '#333',
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },

  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },

  image: {
    width: '100%',
    height: 240,
    borderRadius: 12,
  },

  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    padding: 14,
  },

  row: {
    flexDirection: 'row',
    gap: 12,
  },

  option: {
    flex: 1,
    padding: 16,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 12,
    alignItems: 'center',
  },

  selected: {
    backgroundColor: '#D9E8DD',
    borderColor: '#54745D',
  },

  error: {
    color: '#B91C1C',
    fontSize: 14,
  },

  summary: {
    marginTop: 12,
    fontSize: 16,
  },
});
