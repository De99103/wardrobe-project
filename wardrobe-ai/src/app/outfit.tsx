import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, View } from 'react-native';
import { Stack } from 'expo-router';

import { getOutfitRecommendation } from '../services/outfitApi';
import type { OutfitRecommendation } from '../services/outfitApi';
import { loadClothing } from '../services/wardrobeStorage';
import { deleteSavedOutfit, loadSavedOutfits, saveOutfit } from '../services/outfitStorage';
import type { SavedOutfit } from '../services/outfitStorage';
import type { SavedClothing } from '../types/clothing';
import { styles } from '../styles/outfitStyles';
import { Text, TextInput } from '../components/AppTypography';
import { BrandColors } from '../constants/brand';

const occasionOptions = ['Everyday', 'Work', 'Dinner', 'Going out'] as const;

export default function OutfitScreen() {
  const [items, setItems] = useState<SavedClothing[]>([]);
  const [location, setLocation] = useState('Stockholm');
  const [occasion, setOccasion] = useState('everyday');
  const [result, setResult] = useState<OutfitRecommendation | null>(null);
  const [loadingWardrobe, setLoadingWardrobe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedOutfits, setSavedOutfits] = useState<SavedOutfit[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [savingOutfit, setSavingOutfit] = useState(false);
  const [savedCurrent, setSavedCurrent] = useState(false);
  const [savedError, setSavedError] = useState('');
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    loadClothing().then(value => { if (active) setItems(value); })
      .catch(() => { if (active) setError('Could not load your wardrobe.'); })
      .finally(() => { if (active) setLoadingWardrobe(false); });
    loadSavedOutfits().then(value => { if (active) setSavedOutfits(value); })
      .catch(reason => { if (active) setSavedError(savedOutfitError(reason, 'load')); })
      .finally(() => { if (active) setLoadingSaved(false); });
    return () => { active = false; };
  }, []);

  const owned = useMemo(() => items.filter(item => item.status === 'owned'), [items]);
  const selected = useMemo(() => {
    const urls = new Set(result?.outfit.sourceUrls ?? []);
    return owned.filter(item => urls.has(item.sourceUrl));
  }, [owned, result]);

  async function createOutfit() {
    if (!location.trim()) { setError('Enter a city or postcode.'); return; }
    setLoading(true); setError(''); setResult(null); setSavedCurrent(false); setSavedError('');
    try {
      setResult(await getOutfitRecommendation(location, occasion, owned));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not create an outfit.');
    } finally { setLoading(false); }
  }

  async function saveCurrentOutfit() {
    if (!result || savingOutfit || savedCurrent) return;
    setSavingOutfit(true); setSavedError('');
    try {
      const saved = await saveOutfit(result, occasion);
      setSavedOutfits(previous => [saved, ...previous]);
      setSavedCurrent(true);
    } catch (reason) {
      setSavedError(savedOutfitError(reason, 'save'));
    } finally { setSavingOutfit(false); }
  }

  async function removeSavedOutfit(id: string) {
    if (deleting) return;
    setDeleting(id); setSavedError('');
    try {
      await deleteSavedOutfit(id);
      setSavedOutfits(previous => previous.filter(outfit => outfit.id !== id));
      setConfirmDelete(null);
    } catch (reason) {
      setSavedError(savedOutfitError(reason, 'delete'));
    } finally { setDeleting(null); }
  }

  const busy = loading || loadingWardrobe;

  return <View style={styles.container}>
    <Stack.Screen options={{
      title: 'Outfit stylist',
      headerStyle: { backgroundColor: BrandColors.ivory },
      headerShadowVisible: false,
      headerTintColor: BrandColors.charcoal,
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
            placeholderTextColor={BrandColors.softGrey}
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
            placeholderTextColor={BrandColors.softGrey}
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
          {loading ? <ActivityIndicator color={BrandColors.ivory} /> : null}
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
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: savingOutfit || savedCurrent }}
            disabled={savingOutfit || savedCurrent}
            style={[styles.saveButton, (savingOutfit || savedCurrent) && styles.buttonDisabled]}
            onPress={saveCurrentOutfit}
          >
            {savingOutfit ? <ActivityIndicator color={BrandColors.charcoal} /> : null}
            <Text style={styles.saveButtonText}>{savedCurrent ? 'Outfit saved  ✓' : 'Save this outfit'}</Text>
          </Pressable>
        </View>
      </>}

      <View style={styles.savedSection}>
        <View style={styles.savedHeading}>
          <View style={{ flex: 1 }}>
            <Text style={styles.sectionTitle}>Saved outfits</Text>
            <Text style={styles.sectionSubtitle}>Keep looks you want to wear again.</Text>
          </View>
          <View style={styles.savedCount}><Text style={styles.savedCountText}>{savedOutfits.length}</Text></View>
        </View>
        {loadingSaved ? <ActivityIndicator color={BrandColors.charcoal} /> : savedOutfits.length === 0 ? <Text style={styles.emptySaved}>Your saved outfits will appear here.</Text> : savedOutfits.map(saved => {
          const pieceNames = saved.outfit.sourceUrls.map(sourceUrl => {
            const item = owned.find(value => value.sourceUrl === sourceUrl);
            return item?.name ?? item?.subcategory ?? 'Wardrobe item';
          });
          return <View key={saved.id} style={styles.savedCard}>
            <View style={styles.savedCardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.savedTitle}>{saved.outfit.title}</Text>
                <Text style={styles.savedMeta}>{saved.occasion} · {saved.weather.location} · {Math.round(saved.weather.temperatureC)}°C</Text>
              </View>
              <Text style={styles.savedDate}>{new Date(saved.savedAt).toLocaleDateString()}</Text>
            </View>
            <Text style={styles.savedPieces}>{pieceNames.join(' · ')}</Text>
            <Text style={styles.savedTip}>{saved.outfit.weatherTip}</Text>
            {confirmDelete === saved.id ? <View style={styles.confirmPanel}>
              <Text style={styles.savedMeta}>Remove this saved outfit?</Text>
              <View style={styles.confirmRow}>
                <Pressable accessibilityRole="button" disabled={!!deleting} style={styles.smallButton} onPress={() => setConfirmDelete(null)}><Text style={styles.smallButtonText}>Cancel</Text></Pressable>
                <Pressable accessibilityRole="button" disabled={!!deleting} style={styles.smallButton} onPress={() => removeSavedOutfit(saved.id)}><Text style={styles.removeText}>{deleting === saved.id ? 'Removing…' : 'Remove'}</Text></Pressable>
              </View>
            </View> : <Pressable accessibilityRole="button" accessibilityLabel={`Remove saved outfit ${saved.outfit.title}`} onPress={() => setConfirmDelete(saved.id)}><Text style={styles.removeText}>Remove saved outfit</Text></Pressable>}
          </View>;
        })}
      </View>
      {!!savedError && <View style={styles.errorBox}><Text accessibilityRole="alert" style={styles.error}>{savedError}</Text></View>}
    </ScrollView>
  </View>;
}

function savedOutfitError(reason: unknown, operation: 'load' | 'save' | 'delete') {
  const code = reason && typeof reason === 'object' && 'code' in reason ? reason.code : '';
  if (code === 'permission-denied') return 'Saved outfits need the updated Firestore rules. Publish firestore.rules, then try again.';
  if (reason instanceof Error) return reason.message;
  return operation === 'load' ? 'Could not load saved outfits.' : operation === 'save' ? 'Could not save this outfit.' : 'Could not remove this outfit.';
}
