
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 760,
    alignSelf: 'center',
    padding: 18,
    paddingTop: 28,
    paddingBottom: 48,
    backgroundColor: '#FAF7F2',
    gap: 14,
  },

  title: {
    fontSize: 34,
    lineHeight: 40,
    fontWeight: '800',
    color: '#292524',
  },

  subtitle: {
    fontSize: 17,
    lineHeight: 24,
    color: '#78716C',
  },

  label: {
    fontSize: 16,
    fontWeight: '600',
  },

  button: {
    backgroundColor: '#333',
    minHeight: 52,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonText: {
    color: '#fff',
    fontWeight: '600',
  },

  image: {
    width: '100%',
    height: 260,
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },

  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 14,
    minHeight: 50,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
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
    borderColor: '#ccc',
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },

  navOption: {
    flex: 0,
    minHeight: 54,
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
    fontSize: 15,
    lineHeight: 22,
    color: '#57534E',
  },
});
