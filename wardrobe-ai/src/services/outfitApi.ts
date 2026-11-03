import type { SavedClothing } from '../types/clothing';
import { API_URL } from './apiConfig';
import { inferClothingStyling } from './stylingTags';
import { loadOutfitFeedback } from './outfitFeedback';
import { aiAuthorization } from './aiAuth';

export type WeatherSummary = {
  location: string;
  localTime: string;
  condition: string;
  temperatureC: number;
  feelsLikeC: number;
  precipitationMm: number;
  chanceOfRain: number | null;
  windKph: number;
  humidity: number;
  isDay: boolean;
};

export type OutfitRecommendation = {
  weather: WeatherSummary;
  outfit: OutfitChoice;
  outfits?: RankedOutfit[];
  context?: OutfitContext;
  notice?: string | null;
};

export type OutfitChoice = {
  sourceUrls: string[];
  title: string;
  explanation: string;
  weatherTip: string;
  missingPieces?: string[];
  hijabColor?: string | null;
};

export type RankedOutfit = OutfitChoice & {
  rank: number;
  label: string;
};

export type OutfitEnvironment = 'indoors' | 'outdoors' | 'mixed';
export type HijabPreference = 'yes' | 'no';

export type OutfitVariation = {
  mode: 'swap' | 'restyle';
  currentSourceUrls: string[];
  replaceSourceUrl?: string | null;
  avoidOutfits: string[][];
};

export type OutfitContext = {
  plannedTime: string | null;
  environment: OutfitEnvironment;
  hijab?: HijabPreference;
  requiredSourceUrls?: string[];
  language?: 'en' | 'ar';
  favoriteOutfits?: { sourceUrls: string[]; occasion: string }[];
};

function isOutfitChoice(value: unknown): value is OutfitChoice {
  if (!value || typeof value !== 'object') return false;
  const outfit = value as OutfitChoice;
  return Array.isArray(outfit.sourceUrls)
    && outfit.sourceUrls.length > 0 && outfit.sourceUrls.length <= 8
    && outfit.sourceUrls.every(url => typeof url === 'string' && url.length > 0 && url.length <= 2048)
    && new Set(outfit.sourceUrls).size === outfit.sourceUrls.length
    && typeof outfit.title === 'string' && outfit.title.length > 0 && outfit.title.length <= 120
    && typeof outfit.explanation === 'string' && outfit.explanation.length > 0 && outfit.explanation.length <= 800
    && typeof outfit.weatherTip === 'string' && outfit.weatherTip.length > 0 && outfit.weatherTip.length <= 500
    && (outfit.missingPieces === undefined || (Array.isArray(outfit.missingPieces) && outfit.missingPieces.length <= 6
      && outfit.missingPieces.every(piece => typeof piece === 'string' && piece.length > 0 && piece.length <= 60)))
    && (outfit.hijabColor === undefined || outfit.hijabColor === null || (typeof outfit.hijabColor === 'string' && outfit.hijabColor.length <= 60));
}

function isRankedOutfit(value: unknown): value is RankedOutfit {
  if (!isOutfitChoice(value)) return false;
  const outfit = value as RankedOutfit;
  return Number.isInteger(outfit.rank) && outfit.rank >= 1 && outfit.rank <= 3
    && typeof outfit.label === 'string' && outfit.label.length > 0 && outfit.label.length <= 80;
}

function isContext(value: unknown): value is OutfitContext {
  if (!value || typeof value !== 'object') return false;
  const context = value as OutfitContext;
  return (context.plannedTime === null || (typeof context.plannedTime === 'string' && context.plannedTime.length <= 30))
    && (context.environment === 'indoors' || context.environment === 'outdoors' || context.environment === 'mixed')
    && (context.hijab === undefined || context.hijab === 'yes' || context.hijab === 'no');
}

export function isRecommendation(value: unknown): value is OutfitRecommendation {
  if (!value || typeof value !== 'object') return false;
  const result = value as OutfitRecommendation;
  return !!result.weather && typeof result.weather.location === 'string'
    && Number.isFinite(result.weather.temperatureC)
    && Number.isFinite(result.weather.feelsLikeC)
    && Number.isFinite(result.weather.precipitationMm)
    && (result.weather.chanceOfRain === null || Number.isFinite(result.weather.chanceOfRain))
    && Number.isFinite(result.weather.windKph)
    && Number.isFinite(result.weather.humidity)
    && typeof result.weather.isDay === 'boolean'
    && isOutfitChoice(result.outfit)
    && (result.outfits === undefined || (Array.isArray(result.outfits)
      && result.outfits.length >= 1 && result.outfits.length <= 3
      && result.outfits.every(isRankedOutfit)
      && new Set(result.outfits.map(outfit => outfit.rank)).size === result.outfits.length
      && new Set(result.outfits.map(outfit => [...outfit.sourceUrls].sort().join('\n'))).size === result.outfits.length))
    && (result.context === undefined || isContext(result.context))
    && (result.notice === undefined || result.notice === null || (typeof result.notice === 'string' && result.notice.length <= 500));
}

export async function getOutfitRecommendation(
  location: string,
  occasion: string,
  items: SavedClothing[],
  context: OutfitContext = { plannedTime: null, environment: 'mixed', hijab: 'no' },
  variation?: OutfitVariation,
): Promise<OutfitRecommendation> {
  if (!API_URL) throw new Error('Backend API URL is not configured.');
  const owned = items.filter(item => item.status === 'owned').slice(0, 100).map(item => {
    const styling = item.styling ?? inferClothingStyling(item);
    return {
      sourceUrl: item.sourceUrl,
      name: item.name,
      brand: item.brand,
      category: item.category,
      subcategory: item.subcategory,
      color: item.color,
      material: item.material,
      styling: {
        colors: styling.colors,
        pattern: styling.pattern,
        warmth: styling.warmth,
        formality: styling.formality,
        layerRole: styling.layerRole,
        styleTags: styling.styleTags,
      },
    };
  });
  if (!owned.length) throw new Error('Add at least one item to your wardrobe first.');
  const ownedIds = new Set(owned.map(item => item.sourceUrl));
  const feedback = (await loadOutfitFeedback()).filter(row => row.sourceUrls.every(url => ownedIds.has(url)));
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetch(`${API_URL}/recommend-outfit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: await aiAuthorization() },
      body: JSON.stringify({
        location: location.trim(),
        occasion: occasion.trim() || 'everyday',
        plannedTime: context.plannedTime,
        environment: context.environment,
        hijab: context.hijab ?? 'no',
        items: owned,
        requiredSourceUrls: context.requiredSourceUrls ?? [],
        language: context.language ?? 'en',
        favoriteOutfits: (context.favoriteOutfits ?? []).slice(0, 10),
        feedback,
        variation: variation ?? null,
      }),
      signal: controller.signal,
    });
    const data: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      if (response.status === 401) throw new Error(context.language === 'ar' ? 'سجّل الدخول للحصول على اقتراحات الإطلالات.' : 'Sign in to get outfit recommendations.');
      const detail = data && typeof data === 'object' && 'detail' in data ? data.detail : null;
      if (detail === 'AI sign-in verification is not configured.') throw new Error(context.language === 'ar' ? 'خدمة الاقتراحات غير متاحة مؤقتاً. حاول لاحقاً.' : 'Outfit recommendations are temporarily unavailable. Please try again later.');
      throw new Error(typeof detail === 'string' ? detail : 'Could not create an outfit. Please try again.');
    }
    if (!isRecommendation(data)) throw new Error('The server returned an invalid outfit.');
    const ownedUrls = new Set(owned.map(item => item.sourceUrl));
    const choices = [data.outfit, ...(data.outfits ?? [])];
    if (choices.some(outfit => !outfit.sourceUrls.length || outfit.sourceUrls.some(url => !ownedUrls.has(url)))) {
      throw new Error('The recommendation included an unknown wardrobe item.');
    }
    return data;
  } catch (error) {
    if (controller.signal.aborted) throw new Error('The stylist took too long. Please try again.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}
