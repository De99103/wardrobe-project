import { ProfileLink } from '../components/ProfileLink';
import { useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Pressable, ScrollView, View } from 'react-native';
import { Stack, Link, router } from 'expo-router';
import { storageAccount } from '../services/firebaseClient';

import { favoriteOutfitExamples } from '../services/outfitModel';
import { getOutfitRecommendation } from '../services/outfitApi';
import type { HijabPreference, OutfitEnvironment, OutfitRecommendation, RankedOutfit, OutfitVariation } from '../services/outfitApi';
import { loadClothing } from '../services/wardrobeStorage';
import { deleteSavedOutfit, loadSavedOutfits, saveOutfit } from '../services/outfitStorage';
import type { SavedOutfit } from '../services/outfitStorage';
import type { SavedClothing } from '../types/clothing';
import { styles } from '../styles/outfitStyles';
import { Text, TextInput } from '../components/AppTypography';
import { AiSignInRequiredError } from '../services/aiErrors';
import { BrandColors } from '../constants/brand';
import { useLanguage } from '../services/i18n';
import { saveOutfitFeedback } from '../services/outfitFeedback';
import { feedbackReasons, type FeedbackReason } from '../services/outfitFeedback';

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
  const [showFeedbackReasons, setShowFeedbackReasons] = useState(false);
  const [showFeedbackInfo, setShowFeedbackInfo] = useState(false);
  const [items, setItems] = useState<SavedClothing[]>([]);
  const [requiredSourceUrls, setRequiredSourceUrls] = useState<string[]>([]);
  const [piecePickerOpen, setPiecePickerOpen] = useState(false);
  const [location, setLocation] = useState('Linköping');
  const [occasion, setOccasion] = useState('everyday');
  const [plannedDate, setPlannedDate] = useState('');
  const [plannedClock, setPlannedClock] = useState('');
  const [plannedDay, setPlannedDay] = useState<'today' | 'tomorrow' | 'dayAfterTomorrow' | ''>('');
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
    if (!await storageAccount()) {
      router.push({ pathname: '/account', params: { reason: 'ai-sign-in' } });
      return;
    }
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
      const pinnedForRequest = variation?.mode === 'swap' ? requiredSourceUrls.filter(url => url !== variation.replaceSourceUrl) : requiredSourceUrls;
      const recommendation = await getOutfitRecommendation(location, occasion, owned, { plannedTime, environment, hijab, requiredSourceUrls: pinnedForRequest, language,
        favoriteOutfits: favoriteOutfitExamples(savedOutfits, owned),
      }, variation);
      setResult(recommendation);
      if (variation?.mode === 'swap') setRequiredSourceUrls(pinnedForRequest);
      setChangeMode(null);
      setReplaceUrl(null);
      setPreviousLooks(previous => [...previous, ...rankedOutfits.map(look => look.sourceUrls), ...(recommendation.outfits?.map(look => look.sourceUrls) ?? [recommendation.outfit.sourceUrls])].slice(-20));
      setSavedRanks([]);
      setResultOccasion(occasion.trim() || 'Everyday');
      setSelectedRank(recommendation.outfits?.[0]?.rank ?? 1);
    } catch (reason) {
      if (reason instanceof AiSignInRequiredError) {
        router.push({ pathname: '/account', params: { reason: 'ai-sign-in' } });
        return;
      }
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

  async function rateOutfit(rating: 'like' | 'dislike', reason?: FeedbackReason) {
    if (!selectedOutfit || sendingFeedback) return;
    setSendingFeedback(true);
    setFeedbackMessage('');
    try {
      await saveOutfitFeedback({ sourceUrls: selectedOutfit.sourceUrls, occasion: resultOccasion, rating, ...(reason ? { reason } : {}) });
      setShowFeedbackReasons(false);
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
      <ProfileLink />
      <View style={styles.hero}>
        <Text style={styles.eyebrow}>Weather-aware styling</Text>
        <Text style={styles.heroTitle}>What should I wear?</Text>
        <Text style={styles.heroSubtitle}>A considered outfit made from pieces you already own, styled for today’s weather and your plans.</Text>
      </View>

      <View style={styles.setupCard}>
        <View style={styles.sectionHeading}>
          <Text style={styles.sectionTitle}>Set the scene</Text>
          <Text style={styles.sectionTitle}>{language === 'ar' ? 'ابدأ بقطع من خزانتك' : 'Build around your pieces'}</Text>
          <Text>{language === 'ar' ? 'اختياري: اختر قطعة واحدة من كل فئة لهذه الإطلالة.' : 'Optional: choose one piece per category for this outfit.'}</Text>
          <Pressable accessibilityRole="button" accessibilityState={{ expanded: piecePickerOpen }} style={[styles.occasionPill, { backgroundColor: BrandColors.stone, borderBottomColor: BrandColors.charcoal, borderBottomWidth: 2, paddingHorizontal: 18, paddingVertical: 14, minHeight: 48 }]} onPress={() => setPiecePickerOpen(open => !open)}>
            <Text style={{ fontWeight: '700', color: BrandColors.charcoal }}>{language === 'ar' ? `اختر القطع (${requiredSourceUrls.length})` : requiredSourceUrls.length ? `${requiredSourceUrls.length} pieces selected` : 'Choose wardrobe pieces'} {piecePickerOpen ? '⌃' : '⌄'}</Text>
          </Pressable>
          {piecePickerOpen && <ScrollView style={{ maxHeight: 280 }} nestedScrollEnabled>
            {owned.map(item => <Pressable key={item.sourceUrl} accessibilityRole="checkbox" accessibilityState={{ checked: requiredSourceUrls.includes(item.sourceUrl) }} style={styles.occasionPill}
              onPress={() => {
                setRequiredSourceUrls(previous => previous.includes(item.sourceUrl)
                  ? previous.filter(url => url !== item.sourceUrl)
                  : [...previous.filter(url => item.category === 'accessories' || (owned.find(piece => piece.sourceUrl === url)?.category || 'uncategorized') !== (item.category || 'uncategorized')), item.sourceUrl]);
                setResult(null);
              }}>
              <Text>{requiredSourceUrls.includes(item.sourceUrl) ? '☑ ' : '☐ '}{item.name || item.category}</Text>
            </Pressable>)}
            <Pressable accessibilityRole="button" style={styles.occasionPill} onPress={() => setPiecePickerOpen(false)}><Text>{language === 'ar' ? 'تم' : 'Done'}</Text></Pressable>
          </ScrollView>}
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
          <Text style={styles.fieldHint}>Choose a day in the next three days, add a time, or use either one on its own.</Text>
          <View style={[styles.occasionRow, language === 'ar' && styles.occasionRowArabic]}>
            {(['today', 'tomorrow', 'dayAfterTomorrow'] as const).map(day => <Pressable
              key={day}
              accessibilityRole="radio"
              accessibilityState={{ checked: plannedDay === day }}
              disabled={loading}
              style={[styles.occasionPill, plannedDay === day && styles.occasionPillSelected]}
              onPress={() => {
                setPlannedDay(day);
                setPlannedDate(dateForOffset(day === 'today' ? 0 : day === 'tomorrow' ? 1 : 2));
              }}
            >
              <Text style={[styles.occasionText, plannedDay === day && styles.occasionTextSelected]}>{day === 'today' ? 'Today' : day === 'tomorrow' ? 'Tomorrow' : 'Day after tomorrow'}</Text>
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
          <Text style={styles.buttonText}>{loading ? 'Styling your outfit…' : result && rankedOutfits.length > 1 && rankedOutfits.findIndex(outfit => outfit.rank === selectedRank) < rankedOutfits.length - 1 ? 'Show another look  →︎' : result ? 'Style another outfit  →︎' : 'Recommend an outfit  →︎'}</Text>
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
            <Text style={styles.sectionSubtitle}>{language === 'ar' ? `${rankedOutfits.length} إطلالات مرتبة، جميعها من قطع خزانتك فقط.` : `${rankedOutfits.length} ranked options, each made only from your wardrobe.`}</Text>
          </View>
          <View style={styles.optionRow}>
            {rankedOutfits.map(outfit => {
              const active = outfit.rank === selectedOutfit?.rank;
              return <Pressable
                key={`${outfit.rank}:${outfit.title}`}
                accessibilityRole="radio"
                accessibilityState={{ checked: active }}
                style={[styles.optionButton, active && styles.optionButtonSelected]}
                onPress={() => { setFeedbackMessage(''); setSelectedRank(outfit.rank); setChangeMode(null); setReplaceUrl(null); setShowFeedbackReasons(false); }}
              >
                <Text style={styles.optionRank}>0{outfit.rank}</Text>
                <Text style={[styles.optionLabel, active && styles.optionLabelSelected]}>{outfit.label}</Text>
                <Text style={styles.optionTitle} numberOfLines={2}>{outfit.title}</Text>
              </Pressable>;
            })}
          </View>
        </View>}

        {selectedOutfit && <View style={styles.card}>
          <Text accessibilityLiveRegion="polite" style={styles.cardTitle}>{selectedOutfit.title}</Text>
          <Text style={styles.explanation}>{selectedOutfit.explanation}</Text>
          <View style={styles.savedImages}>
            {selected.map(item => item.imageUrl ? <View key={item.sourceUrl} style={requiredSourceUrls.includes(item.sourceUrl) ? { borderWidth: 2, borderColor: '#A33232', borderRadius: 8, padding: 3 } : undefined}>
              <Image source={{ uri: item.imageUrl }} style={styles.savedImage} resizeMode="contain" accessibilityLabel={item.name ?? 'Outfit item'} />
              {requiredSourceUrls.includes(item.sourceUrl) && <Text style={{ color: '#A33232', fontSize: 12, fontWeight: '700', textAlign: 'center' }}>{language === 'ar' ? 'قطعة أساسية مختارة' : 'Must include'}</Text>}
            </View> : null)}
          </View>
          <View style={{ backgroundColor: BrandColors.charcoalSoft, padding: 18, gap: 16, borderTopWidth: 1, borderBottomWidth: 1, borderColor: BrandColors.stone }}>
          <View style={{ gap: 10 }}>
            <Text style={styles.sectionTitle}>Change this look</Text>
            <Text style={styles.sectionSubtitle}>{language === 'ar' ? 'استبدل قطعة أو جرّب تنسيقاً مختلفاً، ثم أخبرنا برأيك.' : 'Swap a piece or try a different style, then tell us what you think.'}</Text>
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
              <Text style={styles.buttonText}>{loading ? 'Restyling…' : 'Show my new look →︎'}</Text>
            </Pressable>}
          </View>
          <View style={{ flexDirection: language === 'ar' ? 'row-reverse' : 'row', alignItems: 'center', gap: 6 }}>
            <Text style={{ fontWeight: '700' }}>{language === 'ar' ? 'رأيك في الإطلالة' : 'Your feedback'}</Text>
            <Pressable accessibilityRole="button" accessibilityLabel={language === 'ar' ? 'كيف يساعد رأيك؟' : 'How your feedback helps'} accessibilityState={{ expanded: showFeedbackInfo }} hitSlop={8} onPress={() => setShowFeedbackInfo(value => !value)} style={{ minWidth: 44, minHeight: 44, alignItems: 'center', justifyContent: 'center' }}>
              <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 1, borderColor: BrandColors.charcoal, alignItems: 'center', justifyContent: 'center' }}><Text style={{ fontSize: 13, fontWeight: '700', lineHeight: 17 }}>i</Text></View>
            </Pressable>
          </View>
          {showFeedbackInfo && <Text accessibilityLiveRegion="polite" style={styles.sectionSubtitle}>{language === 'ar' ? 'أخبرنا بما يعجبك لنقترح إطلالات أقرب إلى ذوقك في المرات القادمة.' : 'Tell us what you like to help make future outfits feel more like you.'}</Text>}
          <View style={[styles.occasionRow, language === 'ar' && styles.occasionRowArabic]}>
            <Pressable accessibilityRole="button" disabled={sendingFeedback} style={styles.occasionPill} onPress={() => rateOutfit('like')}>
              <Text>{language === 'ar' ? 'سأرتدي هذه الإطلالة' : 'I’d wear this'}</Text>
            </Pressable>
            <Pressable accessibilityRole="button" disabled={sendingFeedback} style={styles.occasionPill} onPress={() => setShowFeedbackReasons(value => !value)}>
              <Text>{language === 'ar' ? 'ليست من ذوقي' : 'Not my style'}</Text>
            </Pressable>
          </View>
          {showFeedbackReasons && <View>
            <Text>{language === 'ar' ? 'ما الذي تريد تحسينه؟' : 'What should we improve?'}</Text>
            <View style={styles.occasionRow}>{feedbackReasons.map(reason => {
              const labels: Record<FeedbackReason, [string, string]> = {
                too_warm: ['Too warm', 'دافئة أكثر من اللازم'], too_cold: ['Too cold', 'غير دافئة بما يكفي'],
                too_formal: ['Too formal', 'رسمية أكثر من اللازم'], too_casual: ['Too casual', 'غير رسمية بما يكفي'],
                colors: ['Colors don’t match', 'الألوان غير متناسقة'], comfort: ['Not comfortable', 'غير مريحة'], not_my_style: ['Not my style', 'ليست من ذوقي'],
                more_elegant: ['More elegant', 'أكثر أناقة'], more_interesting: ['More interesting', 'لمسة مميزة'], minimal: ['More minimal', 'أكثر بساطة'],
              };
              return <Pressable key={reason} disabled={sendingFeedback} accessibilityRole="button" style={styles.occasionPill} onPress={() => rateOutfit('dislike', reason)}><Text>{labels[reason][language === 'ar' ? 1 : 0]}</Text></Pressable>;
            })}</View>
          </View>}
          {!!feedbackMessage && <Text accessibilityLiveRegion="polite">{feedbackMessage}</Text>}
          <Text style={{ fontWeight: '700' }}>{language === 'ar' ? 'جرّب أسلوباً آخر' : 'Try a different style'}</Text>
          <View style={[styles.occasionRow, language === 'ar' && styles.occasionRowArabic]}>
            {([
              ['too_formal', 'Make it more casual', 'اجعلها أكثر عفوية'],
              ['too_casual', 'Make it more formal', 'اجعلها أكثر رسمية'],
              ['more_elegant', 'Make it more elegant', 'اجعلها أكثر أناقة'],
              ['more_interesting', 'Make it more interesting', 'أضف لمسة مميزة'],
              ['minimal', 'Keep it minimal', 'اجعلها بسيطة'],
              ['colors', 'Try different colors', 'جرّب ألواناً مختلفة'],
            ] as const).map(([reason, en, ar]) => <Pressable key={reason} accessibilityRole="button" disabled={busy || sendingFeedback} style={styles.occasionPill} onPress={async () => {
              if (!selectedOutfit) return;
              setSendingFeedback(true);
              try {
                await saveOutfitFeedback({ sourceUrls: selectedOutfit.sourceUrls, occasion: resultOccasion, rating: 'dislike', reason });
                await createOutfit({ mode: 'restyle', currentSourceUrls: selectedOutfit.sourceUrls, avoidOutfits: previousLooks });
              } catch { setFeedbackMessage(language === 'ar' ? 'تعذّر تعديل الإطلالة. حاول مجدداً.' : 'Could not adjust this look. Please try again.'); }
              finally { setSendingFeedback(false); }
            }}><Text>{language === 'ar' ? ar : en}</Text></Pressable>)}
          </View>
          </View>
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
            {selected.map(item => <View key={item.sourceUrl} style={[styles.item, requiredSourceUrls.includes(item.sourceUrl) && { borderWidth: 2, borderColor: '#A33232', borderRadius: 8, padding: 10 }]}>
              {item.imageUrl
                ? <Image source={{ uri: item.imageUrl }} style={styles.image} resizeMode="contain" />
                : <View style={[styles.image, styles.imagePlaceholder]}><Text style={styles.imagePlaceholderText}>◇</Text></View>}
              <View style={styles.itemText}>
                {requiredSourceUrls.includes(item.sourceUrl) && <Text style={{ color: '#A33232', fontSize: 12, fontWeight: '700' }}>{language === 'ar' ? 'قطعة أساسية مختارة' : 'Must include'}</Text>}
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

      <Link href="/saved-outfits"><Text>Saved outfits →︎</Text></Link>
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
