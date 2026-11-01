import type { SavedClothing } from '../types/clothing';

const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '');

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
  outfit: {
    sourceUrls: string[];
    title: string;
    explanation: string;
    weatherTip: string;
  };
};

function isRecommendation(value: unknown): value is OutfitRecommendation {
  if (!value || typeof value !== 'object') return false;
  const result = value as OutfitRecommendation;
  return !!result.weather && typeof result.weather.location === 'string'
    && typeof result.weather.temperatureC === 'number'
    && !!result.outfit && Array.isArray(result.outfit.sourceUrls)
    && result.outfit.sourceUrls.every(url => typeof url === 'string')
    && typeof result.outfit.title === 'string'
    && typeof result.outfit.explanation === 'string'
    && typeof result.outfit.weatherTip === 'string';
}

export async function getOutfitRecommendation(
  location: string,
  occasion: string,
  items: SavedClothing[],
): Promise<OutfitRecommendation> {
  if (!API_URL) throw new Error('Backend API URL is not configured.');
  const owned = items.filter(item => item.status === 'owned').slice(0, 100).map(item => ({
    sourceUrl: item.sourceUrl,
    name: item.name,
    brand: item.brand,
    category: item.category,
    subcategory: item.subcategory,
    color: item.color,
    material: item.material,
  }));
  if (!owned.length) throw new Error('Add at least one item to your wardrobe first.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 45000);
  try {
    const response = await fetch(`${API_URL}/recommend-outfit`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ location: location.trim(), occasion: occasion.trim() || 'everyday', items: owned }),
      signal: controller.signal,
    });
    const data: unknown = await response.json().catch(() => null);
    if (!response.ok) {
      const detail = data && typeof data === 'object' && 'detail' in data ? data.detail : null;
      throw new Error(typeof detail === 'string' ? detail : 'Could not create an outfit. Please try again.');
    }
    if (!isRecommendation(data)) throw new Error('The server returned an invalid outfit.');
    const ownedUrls = new Set(owned.map(item => item.sourceUrl));
    if (!data.outfit.sourceUrls.length || data.outfit.sourceUrls.some(url => !ownedUrls.has(url))) {
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
