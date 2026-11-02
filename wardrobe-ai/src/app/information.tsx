import { ScrollView, View } from 'react-native';
import { Text } from '../components/AppTypography';
import { styles } from '../styles/informationStyles';

const steps = [
  {
    number: '1',
    title: 'Add your clothes',
    body: 'Add a piece manually with an optional photo, or paste a public store link. If a store page is incomplete, edit the imported details yourself before saving.',
  },
  {
    number: '2',
    title: 'Organize your collection',
    body: 'Wardrobe is for pieces you own. Wishlist is for pieces you may buy. Wishlist items can be moved to Wardrobe after you buy them.',
  },
  {
    number: '3',
    title: 'Create an outfit',
    body: 'Choose your location and occasion. The stylist uses current weather and only the pieces in your Wardrobe—never your Wishlist.',
  },
  {
    number: '4',
    title: 'Save a look',
    body: 'Save recommendations you want to wear again. Each saved look keeps its occasion, weather, selected pieces, and styling note.',
  },
];

export default function InformationScreen() {
  return <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.container}>
    <Text style={styles.eyebrow}>Information</Text>
    <Text style={styles.title}>How Wardrobe works</Text>
    <Text style={styles.subtitle}>A quick guide to adding clothes, organizing them, and creating outfits.</Text>

    <View style={styles.steps}>
      {steps.map(step => <View key={step.number} style={styles.card}>
        <View style={styles.number}><Text style={styles.numberText}>{step.number}</Text></View>
        <View style={styles.copy}>
          <Text style={styles.cardTitle}>{step.title}</Text>
          <Text style={styles.body}>{step.body}</Text>
        </View>
      </View>)}
    </View>

    <View style={styles.noteCard}>
      <Text style={styles.cardTitle}>Your account and privacy</Text>
      <Text style={styles.body}>Without sign-in, clothes and outfits stay on this device. With Google sign-in, they are stored in your private Firebase account so you can use them across devices.</Text>
    </View>

    <View style={styles.noteCard}>
      <Text style={styles.cardTitle}>What comes next</Text>
      <Text style={styles.body}>Wishlist price-drop alerts and native App Store and Google Play builds are planned next. Price alerts are not active yet.</Text>
    </View>
  </ScrollView>;
}
