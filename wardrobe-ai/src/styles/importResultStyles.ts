
import { StyleSheet } from 'react-native';

export const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    width: '100%',
    maxWidth: 780,
    alignSelf: 'center',
    padding: 18,
    paddingBottom: 48,
    backgroundColor: '#FAF7F2',
    gap: 16,
  },

  centered: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#FAF7F2',
    gap: 20,
  },

  title: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: '800',
    color: '#292524',
  },

  subtitle: {
    fontSize: 15,
    color: '#78716C',
  },

  imageContainer: {
    width: '100%',
    aspectRatio: 4 / 3,
    maxHeight: 420,
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'hidden',
  },

  image: {
    width: '100%',
    height: '100%',
  },

  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    gap: 8,
    borderWidth: 1,
    borderColor: '#EEEAE4',
  },

  productName: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#292524',
  },

  price: {
    fontSize: 20,
    fontWeight: '600',
    color: '#54745D',
    marginBottom: 12,
  },

  label: {
    fontSize: 14,
    color: '#78716C',
    marginTop: 8,
  },

  value: {
    fontSize: 16,
    color: '#292524',
  },

  statusBox: {
    backgroundColor: '#D9E8DD',
    padding: 16,
    borderRadius: 12,
  },

  message: {
    fontSize: 16,
    color: '#78716C',
    textAlign: 'center',
  },

  button: {
    backgroundColor: '#292524',
    minHeight: 52,
    paddingHorizontal: 18,
    paddingVertical: 14,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },

  buttonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },

  secondaryButton: {
    borderWidth: 1,
    borderColor: '#54745D',
    borderRadius: 12,
    padding: 14,
    alignItems: 'center',
  },

  secondaryButtonText: {
    color: '#54745D',
    fontWeight: '600',
  },

  rawJson: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    borderRadius: 12,
    fontSize: 12,
    fontFamily: 'monospace',
    color: '#292524',
  },

  backText: {
    color: '#54745D',
    fontWeight: '600',
  },


descriptionInput: {
  backgroundColor: '#FFFFFF',
  borderWidth: 1,
  borderColor: '#D6D3D1',
  borderRadius: 12,
  padding: 16,
  minHeight: 140,
  fontSize: 16,
  color: '#292524',
},

errorText: {
  color: '#B91C1C',
  fontSize: 14,
  lineHeight: 20,
},
});
