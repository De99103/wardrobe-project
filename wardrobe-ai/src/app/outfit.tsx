import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, Text, TextInput, View } from 'react-native';
import { Stack } from 'expo-router';

import { getOutfitRecommendation } from '../services/outfitApi';
import type { OutfitRecommendation } from '../services/outfitApi';
import { loadClothing } from '../services/wardrobeStorage';
import type { SavedClothing } from '../types/clothing';
import { styles } from '../styles/outfitStyles';

const occasionOptions = ['Everyday', 'Work', 'Dinner', 'Going out'] as const;

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

  const busy = loading || loadingWardrobe;

  return <View style={styles.container}>
    <Stack.Screen options={{
      title: 'AI Outfit Stylist',
      headerStyle: { backgroundColor: '#FBF6F7' },
      headerShadowVisible: false,
      headerTintColor: '#5E2D4F',
    }} />
    <ScrollView contentInsetAdjustmentBehavior="automatic" contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Weather-aware styling</Text>
        <Text style={styles.heroTitle}>What should I wear?</Text>
        <Text style={styles.heroSubtitle}>A considered outfit made from pieces you already own, styled for today’s weather and your plans.</Text>
      </View>

      <View style={styles.setupCard}>
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Set the scene</Text>
          <Text style={styles.sectionSubtitle}>Wishlist pieces stay out of your recommendation.</Text>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>City or postcode</Text>
          <TextInput
            style={styles.input}
            value={location}
            onChangeText={setLocation}
            placeholder="Stockholm"
            placeholderTextColor="#9A958E"
            autoCapitalize="words"
            maxLength={200}
            returnKeyType="next"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>What are you dressing for?</Text>
          <View style={styles.occasionRow}>
            {occasionOptions.map(option => {
              const selectedOccasion = occasion.trim().toLowerCase() === option.toLowerCase();
              return <Pressable
                key={option}
                accessibilityRole="radio"
                accessibilityState={{ checked: selectedOccasion }}
                disabled={loading}
                style={[styles.occasionPill, selectedOccasion && styles.occasionPillSelected]}
                onPress={() => setOccasion(option)}
              >
                <Text style={[styles.occasionText, selectedOccasion && styles.occasionTextSelected]}>{option}</Text>
              </Pressable>;
            })}
          </View>
          <TextInput
            style={styles.input}
            value={occasion}
            onChangeText={setOccasion}
            placeholder="Or describe your plans…"
            placeholderTextColor="#9A958E"
            maxLength={200}
            returnKeyType="done"
          />
        </View>

        <View style={styles.wardrobeStatus}>
          <View style={styles.statusDot} />
          <Text style={styles.statusText}>{loadingWardrobe ? 'Checking your wardrobe…' : `${owned.length} owned ${owned.length === 1 ? 'piece' : 'pieces'} ready to style`}</Text>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityState={{ disabled: busy || !owned.length }}
          disabled={busy || !owned.length}
          style={[styles.button, (busy || !owned.length) && styles.buttonDisabled]}
          onPress={createOutfit}
        >
          {loading ? <ActivityIndicator color="#FFF9FB" /> : null}
          <Text style={styles.buttonText}>{loading ? 'Styling your outfit…' : result ? 'Style another outfit  →' : 'Recommend an outfit  →'}</Text>
        </Pressable>
      </View>

      {!!error && <View style={styles.errorBox}><Text accessibilityRole="alert" style={styles.error}>{error}</Text></View>}

      {result && <>
        <View style={styles.weather}>
          <View style={styles.weatherHeader}>
            <View style={styles.weatherCopy}>
              <Text style={styles.weatherEyebrow}>Today’s weather</Text>
              <Text style={styles.weatherTitle}>{result.weather.location}</Text>
              <Text style={styles.weatherCondition}>{result.weather.condition}</Text>
            </View>
            <Text style={styles.weatherMain}>{result.weather.temperatureC}°</Text>
          </View>
          <View style={styles.weatherStats}>
            <View style={styles.weatherPill}><Text style={styles.weatherPillText}>Feels {result.weather.feelsLikeC}°C</Text></View>
            <View style={styles.weatherPill}><Text style={styles.weatherPillText}>Wind {result.weather.windKph} km/h</Text></View>
            {result.weather.chanceOfRain !== null && <View style={styles.weatherPill}><Text style={styles.weatherPillText}>Rain {result.weather.chanceOfRain}%</Text></View>}
          </View>
        </View>

        <View style={styles.card}>
          <Text style={styles.resultEyebrow}>Styled from your wardrobe</Text>
          <Text style={styles.cardTitle}>{result.outfit.title}</Text>
          <Text style={styles.explanation}>{result.outfit.explanation}</Text>

          {!!selected.length && <View style={styles.itemList}>
            <Text style={styles.itemListTitle}>The pieces</Text>
            {selected.map(item => <View key={item.sourceUrl} style={styles.item}>
              {item.imageUrl
                ? <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="contain" />
                : <View style={[styles.image, styles.imagePlaceholder]}><Text style={styles.imagePlaceholderText}>◇</Text></View>}
              <View style={styles.itemText}>
                <Text style={styles.itemName}>{item.name ?? item.subcategory ?? 'Wardrobe item'}</Text>
                <Text style={styles.itemMeta}>{[item.brand, item.color, item.category].filter(Boolean).join(' · ') || 'From your wardrobe'}</Text>
              </View>
            </View>)}
          </View>}

          <View style={styles.tip}>
            <Text style={styles.tipLabel}>Stylist’s weather note</Text>
            <Text style={styles.tipText}>{result.outfit.weatherTip}</Text>
          </View>
        </View>
      </>}
    </ScrollView>
  </View>;
}
