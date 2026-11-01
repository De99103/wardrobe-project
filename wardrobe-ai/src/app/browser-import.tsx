import { ScrollView, Text } from 'react-native';
import { styles } from '../styles/importResultStyles';

export default function BrowserImportScreen() {
  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Import from your browser</Text>
      <Text style={styles.value}>Add products without copying descriptions. Open the product in Chrome, click the Wardrobe AI extension, then choose Import Product.</Text>
      <Text style={styles.label}>One-time setup for the local development app</Text>
      <Text style={styles.value}>1. Open chrome://extensions in Chrome and enable Developer mode.</Text>
      <Text style={styles.value}>2. Choose Load unpacked and select the browser-extension folder inside wardrobe-project.</Text>
      <Text style={styles.value}>3. Pin Wardrobe AI from the Extensions menu.</Text>
      <Text style={styles.label}>Import a product</Text>
      <Text style={styles.value}>Open an HTTPS product page, let it finish loading, click Wardrobe AI, and select Wardrobe or Wishlist. Review the extracted details in the app and save.</Text>
      <Text style={styles.message}>Keep the local backend and app running. The extension reads product text and image links only when you click Import Product. Pages requiring sign-in or verification must be opened normally first.</Text>
    </ScrollView>
  );
}
