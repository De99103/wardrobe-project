import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Stack } from 'expo-router';

import { getOutfitRecommendation } from '../services/outfitApi';
import type { OutfitRecommendation } from '../services/outfitApi';
import { loadClothing } from '../services/wardrobeStorage';
import type { SavedClothing } from '../types/clothing';
import { styles } from '../styles/outfitStyles';

export default function OutfitScreen() {
  const [items, setItems] = useState<SavedClothing[]>([]);
  const [location, setLocation] = useState('Stockholm');
  const [occasion, setOccasion] = useState('everyday');
  const [result, setResult] = useState<OutfitRecommendation | null>(null);
  const [loadingWardrobe, setLoadingWardrobe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    loadClothing().then(value => { if (active) setItems(value); })
      .catch(() => { if (active) setError('Could not load your wardrobe.'); })
      .finally(() => { if (active) setLoadingWardrobe(false); });
    return () => { active = false; };
  }, []);

  const owned = useMemo(() => items.filter(item => item.status === 'owned'), [items]);
  const selected = useMemo(() => {
    const urls = new Set(result?.outfit.sourceUrls ?? []);
    return owned.filter(item => urls.has(item.sourceUrl));
  }, [owned, result]);

  async function createOutfit() {
    if (!location.trim()) { setError('Enter a city or postcode.'); return; }
    setLoading(true); setError(''); setResult(null);
    try {
      setResult(await getOutfitRecommendation(location, occasion, owned));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not create an outfit.');
    } finally { setLoading(false); }
  }

  return <View style={styles.container}>
    <Stack.Screen options={{ title: 'AI Outfit Stylist' }} />
    <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <Text style={styles.title}>What should I wear?</Text>
      <Text style={styles.subtitle}>Your AI stylist uses today’s weather and only the clothes saved in your Wardrobe. Wishlist items are never included.</Text>
      <Text style={styles.label}>Your city or postcode</Text>
      <TextInput style={styles.input} value={location} onChangeText={setLocation} placeholder="Stockholm" autoCapitalize="words" maxLength={200} />
      <Text style={styles.label}>What are you dressing for?</Text>
      <TextInput style={styles.input} value={occasion} onChangeText={setOccasion} placeholder="Everyday, work, dinner…" maxLength={200} />
      <Text style={styles.subtitle}>{loadingWardrobe ? 'Loading wardrobe…' : `${owned.length} owned ${owned.length === 1 ? 'item' : 'items'} available`}</Text>
      <Pressable accessibilityRole="button" disabled={loading || loadingWardrobe || !owned.length} style={[styles.button, (loading || loadingWardrobe || !owned.length) && styles.buttonDisabled]} onPress={createOutfit}>
        <Text style={styles.buttonText}>{loading ? 'Styling your outfit…' : 'Recommend an outfit'}</Text>
      </Pressable>
      {loading && <ActivityIndicator />}
      {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
      {result && <>
        <View style={styles.weather}>
          <Text style={styles.weatherTitle}>{result.weather.location} · {result.weather.condition}</Text>
          <Text style={styles.weatherMain}>{result.weather.temperatureC}°C</Text>
          <Text>Feels like {result.weather.feelsLikeC}°C · Wind {result.weather.windKph} km/h</Text>
          {result.weather.chanceOfRain !== null && <Text>{result.weather.chanceOfRain}% chance of rain</Text>}
        </View>
        <View style={styles.card}>
          <Text style={styles.cardTitle}>{result.outfit.title}</Text>
          <Text style={styles.explanation}>{result.outfit.explanation}</Text>
          {selected.map(item => <View key={item.sourceUrl} style={styles.item}>
            {item.imageUrl ? <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="contain" /> : <View style={styles.image} />}
            <View style={styles.itemText}>
              <Text style={styles.itemName}>{item.name ?? item.subcategory ?? 'Wardrobe item'}</Text>
              <Text>{[item.brand, item.color, item.category].filter(Boolean).join(' · ')}</Text>
            </View>
          </View>)}
          <Text style={styles.tip}>Weather tip: {result.outfit.weatherTip}</Text>
        </View>
      </>}
    </ScrollView>
  </View>;
}
