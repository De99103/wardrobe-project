import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, View } from 'react-native';
import { Stack } from 'expo-router';

import { getOutfitRecommendation } from '../services/outfitApi';
import type { HijabPreference, OutfitEnvironment, OutfitRecommendation, RankedOutfit, OutfitVariation } from '../services/outfitApi';
import { loadClothing } from '../services/wardrobeStorage';
import { deleteSavedOutfit, loadSavedOutfits, saveOutfit } from '../services/outfitStorage';
import type { SavedOutfit } from '../services/outfitStorage';
import type { SavedClothing } from '../types/clothing';
import { styles } from '../styles/outfitStyles';
import { Text, TextInput } from '../components/AppTypography';
import { BrandColors } from '../constants/brand';
import { useLanguage } from '../services/i18n';
import { saveOutfitFeedback } from '../services/outfitFeedback';

const occasionOptions = ['Everyday', 'Work', 'Dinner', 'Going out'] as const;
const environmentOptions: { value: OutfitEnvironment; label: string }[] = [
  { value: 'indoors', label: 'Mostly indoors' },
  { value: 'outdoors', label: 'Mostly outdoors' },
  { value: 'mixed', label: 'A mix of both' },
];

export default function OutfitScreen() {
  const { language } = useLanguage();
  const [feedbackMessage, setFeedbackMessage] = useState('');
  const [sendingFeedback, setSendingFeedback] = useState(false);
  const [items, setItems] = useState<SavedClothing[]>([]);
  const [location, setLocation] = useState('Linköping');
  const [occasion, setOccasion] = useState('everyday');
  const [plannedDate, setPlannedDate] = useState('');
  const [plannedClock, setPlannedClock] = useState('');
  const [plannedDay, setPlannedDay] = useState<'today' | 'tomorrow' | ''>('');
  const [environment, setEnvironment] = useState<OutfitEnvironment>('mixed');
  const [hijab, setHijab] = useState<HijabPreference>('no');
  const [result, setResult] = useState<OutfitRecommendation | null>(null);
  const [resultOccasion, setResultOccasion] = useState('Everyday');
  const [selectedRank, setSelectedRank] = useState(1);
  const [changeMode, setChangeMode] = useState<'swap' | 'restyle' | null>(null);
  const [replaceUrl, setReplaceUrl] = useState<string | null>(null);
  const [previousLooks, setPreviousLooks] = useState<string[][]>([]);
  const [loadingWardrobe, setLoadingWardrobe] = useState(true);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [savedOutfits, setSavedOutfits] = useState<SavedOutfit[]>([]);
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [savingOutfit, setSavingOutfit] = useState(false);
  const [savedRanks, setSavedRanks] = useState<number[]>([]);
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
  const rankedOutfits = useMemo<RankedOutfit[]>(() => {
    if (!result) return [];
    if (result.outfits?.length) return [...result.outfits].sort((a, b) => a.rank - b.rank);
    return [{ ...result.outfit, rank: 1, label: 'Best match' }];
  }, [result]);
  const selectedOutfit = rankedOutfits.find(outfit => outfit.rank === selectedRank) ?? rankedOutfits[0] ?? null;
  const selected = useMemo(() => {
    const urls = new Set(selectedOutfit?.sourceUrls ?? []);
    return owned.filter(item => urls.has(item.sourceUrl));
  }, [owned, selectedOutfit]);
  const selectedSaved = selectedOutfit ? savedRanks.includes(selectedOutfit.rank) : false;

  async function createOutfit(variation?: OutfitVariation) {
    setFeedbackMessage('');
    if (savingOutfit) return;
    if (!location.trim()) { setError('Enter a city or postcode.'); return; }
    let plannedTime: string | null;
    try {
      plannedTime = normalizePlannedTime(plannedDate, plannedClock);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Check the planned date and time.');
      return;
    }
    setLoading(true); setError(''); setSavedError('');
    try {
      const recommendation = await getOutfitRecommendation(location, occasion, owned, { plannedTime, environment, hijab }, variation);
      setResult(recommendation);
      setChangeMode(null);
      setReplaceUrl(null);
      setPreviousLooks(previous => [...previous, ...rankedOutfits.map(look => look.sourceUrls), ...(recommendation.outfits?.map(look => look.sourceUrls) ?? [recommendation.outfit.sourceUrls])].slice(-20));
      setSavedRanks([]);
      setResultOccasion(occasion.trim() || 'Everyday');
      setSelectedRank(recommendation.outfits?.[0]?.rank ?? 1);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Could not create an outfit.');
    } finally { setLoading(false); }
  }

  function handleRecommendationPress() {
    // The API returns up to three ranked looks. Show the next distinct look
    // immediately instead of making a second request that may repeat the same
    // model response. Once those choices are exhausted, ask the AI again.
    if (result && rankedOutfits.length > 1) {
      const currentIndex = rankedOutfits.findIndex(outfit => outfit.rank === selectedRank);
      const nextOutfit = currentIndex >= 0 ? rankedOutfits[currentIndex + 1] : rankedOutfits[0];
      if (nextOutfit) {
        setFeedbackMessage('');
        setSelectedRank(nextOutfit.rank);
        setError('');
        return;
      }
    }
    if (selectedOutfit) {
      void createOutfit({ mode: 'restyle', currentSourceUrls: selectedOutfit.sourceUrls, avoidOutfits: [...previousLooks, ...rankedOutfits.map(look => look.sourceUrls)].slice(-20) });
    } else {
      void createOutfit();
    }
  }

  async function saveCurrentOutfit() {
    if (!result || !selectedOutfit || savingOutfit || selectedSaved) return;
    setSavingOutfit(true); setSavedError('');
    try {
      const { sourceUrls, title, explanation, weatherTip } = selectedOutfit;
      const saved = await saveOutfit({
        weather: result.weather,
        outfit: { sourceUrls, title, explanation, weatherTip },
      }, resultOccasion);
      setSavedOutfits(previous => [saved, ...previous]);
      setSavedRanks(previous => previous.includes(selectedOutfit.rank) ? previous : [...previous, selectedOutfit.rank]);
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

  const busy = loading || loadingWardrobe || savingOutfit;

  async function rateOutfit(rating: 'like' | 'dislike') {
    if (!selectedOutfit || sendingFeedback) return;
    setSendingFeedback(true);
    setFeedbackMessage('');
    try {
      await saveOutfitFeedback({ sourceUrls: selectedOutfit.sourceUrls, occasion: resultOccasion, rating });
      setFeedbackMessage(language === 'ar' ? 'تم حفظ رأيك لتحسين الاقتراحات القادمة على هذا الجهاز.' : 'Feedback saved for future recommendations on this device.');
    } catch {
      setFeedbackMessage(language === 'ar' ? 'تعذّر حفظ رأيك. حاول مجدداً.' : 'Could not save feedback. Please try again.');
    } finally { setSendingFeedback(false); }
  }

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
          <Text style={styles.label}>City</Text>
          <TextInput
            style={styles.input}
            value={location}
            onChangeText={setLocation}
            placeholder="Linköping"
            placeholderTextColor={BrandColors.softGrey}
            autoCapitalize="words"
            maxLength={200}
            returnKeyType="next"
          />
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>When will you wear it?</Text>
          <Text style={styles.fieldHint}>Choose Today or Tomorrow, add a time, or use either one on its own.</Text>
          <View style={[styles.occasionRow, language === 'ar' && styles.occasionRowArabic]}>
            {(['today', 'tomorrow'] as const).map(day => <Pressable
              key={day}
              accessibilityRole="radio"
              accessibilityState={{ checked: plannedDay === day }}
              disabled={loading}
              style={[styles.occasionPill, plannedDay === day && styles.occasionPillSelected]}
              onPress={() => {
                setPlannedDay(day);
                setPlannedDate(dateForOffset(day === 'tomorrow' ? 1 : 0));
              }}
            >
              <Text style={[styles.occasionText, plannedDay === day && styles.occasionTextSelected]}>{day === 'today' ? 'Today' : 'Tomorrow'}</Text>
            </Pressable>)}
          </View>
          <View style={styles.timeRow}>
            <TextInput
              style={[styles.input, styles.timeInput]}
              value={plannedClock}
              onChangeText={setPlannedClock}
              placeholder="Around what time? e.g. 18:30"
              placeholderTextColor={BrandColors.softGrey}
              maxLength={5}
              autoCapitalize="none"
              keyboardType="numbers-and-punctuation"
              accessibilityLabel="Approximate time"
            />
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>What are you dressing for?</Text>
          <View style={[styles.occasionRow, language === 'ar' && styles.occasionRowArabic]}>
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

        <View style={styles.field}>
          <Text style={styles.label}>Where will you spend most of the time?</Text>
          <View style={[styles.occasionRow, language === 'ar' && styles.occasionRowArabic]}>
            {environmentOptions.map(option => <Pressable
              key={option.value}
              accessibilityRole="radio"
              accessibilityState={{ checked: environment === option.value }}
              disabled={loading}
              style={[styles.occasionPill, environment === option.value && styles.occasionPillSelected]}
              onPress={() => setEnvironment(option.value)}
            >
              <Text style={[styles.occasionText, environment === option.value && styles.occasionTextSelected]}>{option.label}</Text>
            </Pressable>)}
          </View>
        </View>

        <View style={styles.field}>
          <Text style={styles.label}>Do you wear a hijab?</Text>
          <View style={[styles.occasionRow, language === 'ar' && styles.occasionRowArabic]}>
            {(['no', 'yes'] as const).map(option => <Pressable
              key={option}
              accessibilityRole="radio"
              accessibilityState={{ checked: hijab === option }}
              disabled={loading}
              style={[styles.occasionPill, hijab === option && styles.occasionPillSelected]}
              onPress={() => setHijab(option)}
            >
              <Text style={[styles.occasionText, hijab === option && styles.occasionTextSelected]}>{option === 'yes' ? 'Yes' : 'No'}</Text>
            </Pressable>)}
          </View>
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
          onPress={handleRecommendationPress}
        >
          {loading ? <ActivityIndicator color={BrandColors.ivory} /> : null}
          <Text style={styles.buttonText}>{loading ? 'Styling your outfit…' : result && rankedOutfits.length > 1 && rankedOutfits.findIndex(outfit => outfit.rank === selectedRank) < rankedOutfits.length - 1 ? 'Show another look  →' : result ? 'Style another outfit  →' : 'Recommend an outfit  →'}</Text>
        </Pressable>
      </View>

      {!!error && <View style={styles.errorBox}><Text accessibilityRole="alert" style={styles.error}>{error}</Text></View>}

      {result && <>
        <View style={styles.weather}>
          <View style={styles.weatherHeader}>
            <View style={styles.weatherCopy}>
              <Text style={styles.weatherEyebrow}>{result.context?.plannedTime ? 'Forecast for your plan' : 'Current weather'}</Text>
              <Text style={styles.weatherTitle}>{result.weather.location}</Text>
              <Text style={styles.weatherCondition}>{result.weather.condition}</Text>
              {!!result.weather.localTime && <Text style={styles.weatherTime}>{result.weather.localTime}</Text>}
            </View>
            <Text style={styles.weatherMain}>{result.weather.temperatureC}°</Text>
          </View>
          <View style={styles.weatherStats}>
            <View style={styles.weatherPill}><Text style={styles.weatherPillText}>Feels {result.weather.feelsLikeC}°C</Text></View>
            <View style={styles.weatherPill}><Text style={styles.weatherPillText}>Wind {result.weather.windKph} km/h</Text></View>
            {result.weather.chanceOfRain !== null && <View style={styles.weatherPill}><Text style={styles.weatherPillText}>Rain {result.weather.chanceOfRain}%</Text></View>}
          </View>
        </View>

        {!!result.notice && <View style={styles.noticeBox}><Text style={styles.noticeText}>{result.notice}</Text></View>}

        {rankedOutfits.length > 1 && <View style={styles.optionSection}>
          <View style={styles.sectionHeading}>
            <Text style={styles.sectionTitle}>Choose your look</Text>
            <Text style={styles.sectionSubtitle}>{rankedOutfits.length} ranked options, each made only from your wardrobe.</Text>
          </View>
          <View style={styles.optionRow}>
            {rankedOutfits.map(outfit => {
              const active = outfit.rank === selectedOutfit?.rank;
              return <Pressable
                key={`${outfit.rank}:${outfit.title}`}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                style={[styles.optionButton, active && styles.optionButtonSelected]}
                onPress={() => { setFeedbackMessage(''); setSelectedRank(outfit.rank); }}
              >
                <Text style={styles.optionRank}>0{outfit.rank}</Text>
                <Text style={[styles.optionLabel, active && styles.optionLabelSelected]}>{outfit.label}</Text>
                <Text style={styles.optionTitle} numberOfLines={2}>{outfit.title}</Text>
              </Pressable>;
            })}
          </View>
        </View>}

        {selectedOutfit && <View style={styles.card}>
          <View style={styles.setupCard}>
            <Text style={styles.sectionTitle}>Change this look</Text>
            <Text style={styles.sectionSubtitle}>What would you like to change?</Text>
            <View style={styles.occasionRow}>
              <Pressable accessibilityRole="button" style={[styles.occasionPill, changeMode === 'swap' && styles.occasionPillSelected]}
                onPress={() => { setChangeMode('swap'); setReplaceUrl(null); }}>
                <Text style={styles.occasionText}>Change one item</Text>
              </Pressable>
              <Pressable accessibilityRole="button" style={[styles.occasionPill, changeMode === 'restyle' && styles.occasionPillSelected]}
                onPress={() => { setChangeMode('restyle'); setReplaceUrl(null); }}>
                <Text style={styles.occasionText}>Change entire outfit</Text>
              </Pressable>
            </View>
            {changeMode === 'swap' && <>
              <Text style={styles.sectionSubtitle}>Which piece should Wearly replace?</Text>
              {selected.map(item => <Pressable key={item.sourceUrl} accessibilityRole="radio"
                accessibilityState={{ checked: replaceUrl === item.sourceUrl }}
                style={[styles.occasionPill, replaceUrl === item.sourceUrl && styles.occasionPillSelected]}
                onPress={() => setReplaceUrl(item.sourceUrl)}>
                <Text style={styles.occasionText}>{item.name ?? item.subcategory ?? item.category ?? 'Item'}</Text>
              </Pressable>)}
            </>}
            {!!changeMode && <Pressable style={[styles.button, (loading || (changeMode === 'swap' && !replaceUrl)) && styles.buttonDisabled]}
              disabled={loading || (changeMode === 'swap' && !replaceUrl)}
              onPress={() => void createOutfit({
                mode: changeMode,
                currentSourceUrls: selectedOutfit.sourceUrls,
                ...(changeMode === 'swap' ? { replaceSourceUrl: replaceUrl } : {}),
                avoidOutfits: [...previousLooks, ...rankedOutfits.map(look => look.sourceUrls)].slice(-20),
              })}>
              <Text style={styles.buttonText}>{loading ? 'Restyling…' : 'Show my new look →'}</Text>
            </Pressable>}
          </View>
          <View style={[styles.occasionRow, language === 'ar' && styles.occasionRowArabic]}>
            <Pressable accessibilityRole="button" disabled={sendingFeedback} style={styles.occasionPill} onPress={() => rateOutfit('like')}>
              <Text>{language === 'ar' ? 'سأرتدي هذه الإطلالة' : 'I’d wear this'}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={sendingFeedback} style={styles.occasionPill} onPress={() => rateOutfit('dislike')}>
              <Text>{language === 'ar' ? 'ليست من ذوقي' : 'Not my style'}</Text>
            </Pressable>
          </View>
          {!!feedbackMessage && <Text accessibilityLiveRegion="polite">{feedbackMessage}</Text>}
          <Text style={styles.resultEyebrow}>{selectedOutfit.label}</Text>
          <Text style={styles.cardTitle}>{selectedOutfit.title}</Text>
          <Text style={styles.explanation}>{selectedOutfit.explanation}</Text>
          {!!selectedOutfit.hijabColor && <View style={styles.hijabBox}>
            <Text style={styles.missingTitle}>Hijab color suggestion</Text>
            <Text style={styles.missingText}>{selectedOutfit.hijabColor}</Text>
          </View>}
          {!!selectedOutfit.missingPieces?.length && <View style={styles.missingBox}>
            <Text style={styles.missingTitle}>Complete the look</Text>
            <Text style={styles.missingText}>Consider adding: {selectedOutfit.missingPieces.join(' · ')}</Text>
          </View>}

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
            <Text style={styles.tipText}>{selectedOutfit.weatherTip}</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityState={{ disabled: savingOutfit || selectedSaved }}
            disabled={savingOutfit || selectedSaved}
            style={[styles.saveButton, (savingOutfit || selectedSaved) && styles.buttonDisabled]}
            onPress={saveCurrentOutfit}
          >
            {savingOutfit ? <ActivityIndicator color={BrandColors.charcoal} /> : null}
            <Text style={styles.saveButtonText}>{selectedSaved ? 'Outfit saved  ✓' : 'Save this outfit'}</Text>
          </Pressable>
        </View>}
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
          const savedItems = saved.outfit.sourceUrls.map(sourceUrl => owned.find(value => value.sourceUrl === sourceUrl)).filter((item): item is SavedClothing => !!item);
          const pieceNames = savedItems.map(item => item.name ?? item.subcategory ?? 'Wardrobe item');
          return <View key={saved.id} style={styles.savedCard}>
            <View style={styles.savedCardTop}>
              <View style={{ flex: 1 }}>
                <Text style={styles.savedTitle}>{saved.outfit.title}</Text>
                <Text style={styles.savedMeta}>{saved.occasion} · {saved.weather.location} · {Math.round(saved.weather.temperatureC)}°C</Text>
              </View>
              <Text style={styles.savedDate}>{new Date(saved.savedAt).toLocaleDateString()}</Text>
            </View>
            {!!savedItems.some(item => !!item.imageUrl) && <View style={styles.savedImages}>
              {savedItems.map(item => item.imageUrl ? <Image key={item.sourceUrl} source={{ uri: item.imageUrl }} style={styles.savedImage} resizeMode="cover" accessibilityLabel={item.name ?? 'Saved outfit piece'} /> : null)}
            </View>}
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

function normalizePlannedTime(dateValue: string, clockValue: string): string | null {
  const date = dateValue.trim();
  const clock = clockValue.trim();
  if (!date && !clock) return null;
  const resolvedDate = date || dateForOffset(0);
  const resolvedClock = clock || defaultTimeForDate(resolvedDate);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(resolvedDate) || !/^(?:[01]\d|2[0-3]):[0-5]\d$/.test(resolvedClock)) {
    throw new Error('Use a valid day and time.');
  }
  const [year, month, day] = resolvedDate.split('-').map(Number);
  const check = new Date(Date.UTC(year, month - 1, day));
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
    throw new Error('Enter a real calendar date.');
  }
  return `${resolvedDate}T${resolvedClock}`;
}

function dateForOffset(offset: number): string {
  const date = new Date();
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + offset);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function defaultTimeForDate(date: string): string {
  if (date !== dateForOffset(0)) return '12:00';
  const nextHour = Math.min(new Date().getHours() + 1, 23);
  return `${String(nextHour).padStart(2, '0')}:00`;
}
