import { ScrollView, View } from 'react-native';
import { styles } from '../styles/importResultStyles';
import { Text } from '../components/AppTypography';

export default function BrowserImportScreen() {
  return (
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.container}>
      <View style={styles.header}>
        <Text style={styles.eyebrow}>CHROME HELPER</Text>
        <Text style={styles.title}>Save a piece while you shop.</Text>
        <Text style={styles.subtitle}>The Wearly extension reads the open product page for you—no copying descriptions by hand.</Text>
      </View>
      <View style={styles.card}>
        <Text style={styles.cardTitle}>One-time setup</Text>
        <View style={styles.step}><Text style={styles.stepNumber}>1</Text><View style={styles.stepContent}><Text style={styles.stepTitle}>Open extensions</Text><Text style={styles.value}>Visit chrome://extensions in Chrome and enable Developer mode.</Text></View></View>
        <View style={styles.divider} />
        <View style={styles.step}><Text style={styles.stepNumber}>2</Text><View style={styles.stepContent}><Text style={styles.stepTitle}>Load Wearly</Text><Text style={styles.value}>Choose Load unpacked and select the browser-extension folder inside wardrobe-project.</Text></View></View>
        <View style={styles.divider} />
        <View style={styles.step}><Text style={styles.stepNumber}>3</Text><View style={styles.stepContent}><Text style={styles.stepTitle}>Keep it close</Text><Text style={styles.value}>Pin Wearly from the Extensions menu.</Text></View></View>
      </View>
      <View style={styles.recoveryCard}>
        <Text style={styles.cardTitle}>Import while shopping</Text>
        <Text style={styles.value}>Open any HTTPS product page, let it finish loading, click Wearly, then choose Wardrobe or Wishlist. You can review everything before saving.</Text>
        <Text style={styles.mutedNote}>For local development, keep the backend and app running. Pages requiring sign-in or verification must be opened normally first.</Text>
      </View>
    </ScrollView>
  );
}
