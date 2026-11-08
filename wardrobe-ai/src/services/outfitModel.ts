import type { SavedClothing } from '../types/clothing';
import type { OutfitEnvironment, OutfitRecommendation } from './outfitApi';

export type SavedOutfit = Omit<OutfitRecommendation, 'weather'> & {
  weather: OutfitRecommendation['weather'] | null;
  origin?: 'manual';
  environment?: OutfitEnvironment;
  id: string;
  occasion: string;
  savedAt: string;
};

export function isSavedOutfit(value: unknown): value is SavedOutfit {
  if (!value || typeof value !== 'object') return false;
  const saved = value as SavedOutfit;
  const weather = saved.weather;
  const outfit = saved.outfit;
  return typeof saved.id === 'string' && saved.id.length > 0 && saved.id.length <= 100
    && typeof saved.savedAt === 'string' && saved.savedAt.length <= 40
    && typeof saved.occasion === 'string' && saved.occasion.length <= 200
    && (saved.origin === undefined || saved.origin === 'manual')
    && (saved.environment === undefined || ['indoors', 'outdoors', 'mixed'].includes(saved.environment))
    && ((saved.origin === 'manual' && weather === null && saved.environment !== undefined) || (!!weather && typeof weather === 'object'
    && typeof weather.location === 'string' && typeof weather.localTime === 'string'
    && typeof weather.condition === 'string' && typeof weather.temperatureC === 'number'
    && typeof weather.feelsLikeC === 'number' && typeof weather.precipitationMm === 'number'
    && (weather.chanceOfRain === null || typeof weather.chanceOfRain === 'number')
    && typeof weather.windKph === 'number' && typeof weather.humidity === 'number'
    && typeof weather.isDay === 'boolean'))
    && !!outfit && typeof outfit === 'object'
    && Array.isArray(outfit.sourceUrls) && outfit.sourceUrls.length > 0 && outfit.sourceUrls.length <= 100
    && outfit.sourceUrls.every(url => typeof url === 'string' && url.length <= 2048)
    && typeof outfit.title === 'string' && outfit.title.length <= 2000
    && typeof outfit.explanation === 'string' && outfit.explanation.length <= 5000
    && typeof outfit.weatherTip === 'string' && outfit.weatherTip.length <= 2000;
}

export function makeSavedOutfit(
  recommendation: OutfitRecommendation,
  occasion: string,
  id: string,
  savedAt: string,
): SavedOutfit {
  const value: SavedOutfit = {
    weather: recommendation.weather,
    outfit: recommendation.outfit,
    id,
    savedAt,
    occasion: occasion.trim() || 'Everyday',
  };
  if (!isSavedOutfit(value)) throw new Error('This outfit could not be saved.');
  return value;
}

export type ManualOutfitInput = { title: string; sourceUrls: string[]; occasion: string; environment: OutfitEnvironment };
export function makeManualOutfit(input: ManualOutfitInput, wardrobe: SavedClothing[], id: string, savedAt: string): SavedOutfit {
  const title = input.title.trim();
  const occasion = input.occasion.trim();
  const owned = new Set(wardrobe.filter(item => item.status === 'owned').map(item => item.sourceUrl));
  if (!title || title.length > 120 || !occasion || occasion.length > 200) throw new Error('Add an outfit name and occasion.');
  if (!['indoors', 'outdoors', 'mixed'].includes(input.environment)) throw new Error('Choose where you will wear this outfit.');
  if (!input.sourceUrls.length || input.sourceUrls.length > 8 || new Set(input.sourceUrls).size !== input.sourceUrls.length
      || input.sourceUrls.some(url => !owned.has(url))) throw new Error('Choose between 1 and 8 items from your wardrobe.');
  return {
    id, savedAt, occasion, origin: 'manual', environment: input.environment, weather: null,
    outfit: { title, sourceUrls: [...input.sourceUrls], explanation: '', weatherTip: '' },
  };
}

export function favoriteOutfitExamples(saved: SavedOutfit[], wardrobe: SavedClothing[]) {
  const owned = new Set(wardrobe.filter(item => item.status === 'owned').map(item => item.sourceUrl));
  return saved.filter(value => value.outfit.sourceUrls.length <= 8 && value.outfit.sourceUrls.every(url => owned.has(url)))
    .slice(0, 10).map(value => ({ sourceUrls: value.outfit.sourceUrls, occasion: value.occasion,
      ...(value.environment ? { environment: value.environment } : {}),
    }));
}
