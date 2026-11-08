import { API_URL } from './apiConfig';
import { aiAuthorization } from './aiAuth';
import { aiServiceError } from './aiErrors';
import { getLanguage } from './i18n';
import { categories, type Category } from './collectionView';

export async function analyzeClothingPhoto(image: string): Promise<{ category: Category; name: string | null; subcategory: string | null; color: string | null; material: string | null }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 35000);
  try {
    const response = await fetch(`${API_URL}/analyze-photo`, {
      method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: await aiAuthorization() },
      body: JSON.stringify({ image }), signal: controller.signal,
    });
    const data = await response.json().catch(() => null);
    if (data && typeof data === 'object' && data.material === undefined) data.material = null;
    if (!response.ok) throw aiServiceError(response.status, data?.detail, getLanguage(), getLanguage() === 'ar' ? 'تعذّر تحليل الصورة. حاول مجدداً.' : 'Photo analysis failed. Please try again.');
    if (!data || !categories.includes(data.category) || !['name', 'subcategory', 'color', 'material'].every(key => data[key] === null || (typeof data[key] === 'string' && data[key].length <= 200))) throw new Error('Invalid photo suggestions. Please enter details manually.');
    return data;
  } finally { clearTimeout(timeout); }
}
