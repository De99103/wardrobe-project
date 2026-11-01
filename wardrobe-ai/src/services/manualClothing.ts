import { categories, type Category } from './collectionView';
import { validateStoreUrl } from './productValidation';
import type { ImportedProduct } from '../types/clothing';

export const emptyDetails = { name: '', brand: '', subcategory: '', color: '', material: '', price: '', currency: '', imageUrl: '' };
export type ManualDetails = typeof emptyDetails;

export function manualProduct(category: string, details: ManualDetails, id: string): ImportedProduct {
  if (!categories.includes(category as Category)) throw new Error('Choose a category before saving.');
  const text = (value: string) => {
    if (value.trim().length > 2000) throw new Error('Keep each answer under 2,000 characters.');
    return value.trim() || null;
  };
  const amount = details.price.trim().replace(',', '.');
  if (amount && (!/^\d+(\.\d{1,2})?$/.test(amount) || !Number.isFinite(Number(amount)))) {
    throw new Error('Enter a price such as 349 or 349.50, or leave it blank.');
  }
  const currency = details.currency.trim().toUpperCase();
  if (currency && !/^[A-Z]{3}$/.test(currency)) throw new Error('Use a three-letter currency such as SEK, or leave it blank.');
  return {
    name: text(details.name), brand: text(details.brand), category,
    subcategory: text(details.subcategory), color: text(details.color), material: text(details.material),
    price: amount ? Number(amount) : null, currency: currency || null,
    imageUrl: details.imageUrl.trim() ? validateStoreUrl(details.imageUrl) : null,
    // Stable internal identity for clothes with no store link. Never displayed as a store URL.
    sourceUrl: `manual:${id}`,
  };
}
