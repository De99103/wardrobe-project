import type { OutfitRecommendation } from './outfitApi';

export type SavedOutfit = OutfitRecommendation & {
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
    && !!weather && typeof weather === 'object'
    && typeof weather.location === 'string' && typeof weather.localTime === 'string'
    && typeof weather.condition === 'string' && typeof weather.temperatureC === 'number'
    && typeof weather.feelsLikeC === 'number' && typeof weather.precipitationMm === 'number'
    && (weather.chanceOfRain === null || typeof weather.chanceOfRain === 'number')
    && typeof weather.windKph === 'number' && typeof weather.humidity === 'number'
    && typeof weather.isDay === 'boolean'
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
    ...recommendation,
    id,
    savedAt,
    occasion: occasion.trim() || 'Everyday',
  };
  if (!isSavedOutfit(value)) throw new Error('This outfit could not be saved.');
  return value;
}
