import type { OutfitRecommendation } from './outfitApi';

export type SavedOutfit = OutfitRecommendation & {
  id: string;
  occasion: string;
  savedAt: string;
  // Present only for looks the person built themselves. Looks saved from an AI
  // suggestion have no `source` field, which keeps older saved data valid.
  source?: 'user';
};

export type FavoriteLook = { sourceUrls: string[]; occasion: string; source: 'ai' | 'user' };

export const MIN_LOOK_PIECES = 2;
export const MAX_LOOK_PIECES = 8;

export function isSavedOutfit(value: unknown): value is SavedOutfit {
  if (!value || typeof value !== 'object') return false;
  const saved = value as SavedOutfit;
  const weather = saved.weather;
  const outfit = saved.outfit;
  return (saved.source === undefined || saved.source === 'user')
    && typeof saved.id === 'string' && saved.id.length > 0 && saved.id.length <= 100
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

/**
 * A look the person built from their own wardrobe. Weather does not apply, so a
 * neutral placeholder keeps the saved shape (and existing database rules) valid;
 * screens hide it for `source: 'user'`.
 */
export function makeUserOutfit(
  sourceUrls: string[],
  occasion: string,
  title: string,
  id: string,
  savedAt: string,
): SavedOutfit {
  const urls = [...new Set(sourceUrls)];
  if (urls.length < MIN_LOOK_PIECES || urls.length > MAX_LOOK_PIECES) {
    throw new Error(`Choose between ${MIN_LOOK_PIECES} and ${MAX_LOOK_PIECES} pieces for a look.`);
  }
  const cleanOccasion = occasion.trim() || 'Everyday';
  const value: SavedOutfit = {
    weather: {
      location: 'Created by you', localTime: savedAt, condition: 'Not applicable',
      temperatureC: 0, feelsLikeC: 0, precipitationMm: 0, chanceOfRain: null,
      windKph: 0, humidity: 0, isDay: true,
    },
    outfit: {
      sourceUrls: urls,
      title: title.trim().slice(0, 120) || `My ${cleanOccasion.toLowerCase()} look`.slice(0, 120),
      explanation: 'A look you created.',
      weatherTip: 'Created by you.',
    },
    id, savedAt, occasion: cleanOccasion.slice(0, 200), source: 'user',
  };
  if (!isSavedOutfit(value)) throw new Error('This look could not be saved.');
  return value;
}

/**
 * Pick the looks that teach the stylist the person's taste. Looks they built
 * themselves come first (newest first, up to six), then saved AI suggestions
 * fill the remaining slots. The server accepts at most ten.
 */
export function pickFavoriteLooks(saved: SavedOutfit[], limit = 10): FavoriteLook[] {
  const newestFirst = [...saved].sort((a, b) => b.savedAt.localeCompare(a.savedAt));
  const own = newestFirst.filter(outfit => outfit.source === 'user').slice(0, 6);
  const rest = newestFirst.filter(outfit => outfit.source !== 'user').slice(0, Math.max(0, limit - own.length));
  return [
    ...own.map(outfit => ({ sourceUrls: outfit.outfit.sourceUrls, occasion: outfit.occasion, source: 'user' as const })),
    ...rest.map(outfit => ({ sourceUrls: outfit.outfit.sourceUrls, occasion: outfit.occasion, source: 'ai' as const })),
  ].slice(0, limit);
}
