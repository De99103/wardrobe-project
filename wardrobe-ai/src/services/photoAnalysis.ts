import { API_URL } from './apiConfig';
import { categories, type Category } from './collectionView';

export async function analyzeClothingPhoto(image: string): Promise<{ category: Category; name: string | null; subcategory: string | null; color: string | null }> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 35000);
  try {
    const response = await fetch(`${API_URL}/analyze-photo`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ image }), signal: controller.signal,
    });
    const data = await response.json();
    if (!response.ok) throw new Error(typeof data.detail === 'string' ? data.detail : 'Photo analysis failed.');
    if (!categories.includes(data.category) || !['name', 'subcategory', 'color'].every(key => data[key] === null || (typeof data[key] === 'string' && data[key].length <= 200))) throw new Error('Invalid photo suggestions. Please enter details manually.');
    return data;
  } finally { clearTimeout(timeout); }
}
