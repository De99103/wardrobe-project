import { categories } from './collectionView';
import type { Category } from './collectionView';
import { validateStoreUrl } from './productValidation';
import type { ImportedProduct } from '../types/clothing';

export type ImportedProductEditDraft = {
  name: string;
  brand: string;
  subcategory: string;
  color: string;
  material: string;
  price: string;
  currency: string;
};

export function editableProductDetails(product: ImportedProduct): { category: Category; details: ImportedProductEditDraft } {
  const category = product.category?.trim().toLowerCase();
  return {
    category: categories.includes(category as Category) ? category as Category : 'uncategorized',
    details: {
      name: product.name ?? '',
      brand: product.brand ?? '',
      subcategory: product.subcategory ?? '',
      color: product.color ?? '',
      material: product.material ?? '',
      price: product.price === null ? '' : String(product.price),
      currency: product.currency ?? '',
    },
  };
}

export function applyImportedProductEdits(
  original: ImportedProduct,
  category: string,
  details: ImportedProductEditDraft,
): ImportedProduct {
  if (!categories.includes(category as Category)) throw new Error('Choose a category before saving your changes.');
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
    ...original,
    name: text(details.name),
    brand: text(details.brand),
    category,
    subcategory: text(details.subcategory),
    color: text(details.color),
    material: text(details.material),
    price: amount ? Number(amount) : null,
    currency: currency || null,
  };
}

export function emptyImportedProduct(sourceUrl: string): ImportedProduct {
  return {
    name: null,
    brand: null,
    category: 'uncategorized',
    subcategory: null,
    color: null,
    material: null,
    price: null,
    currency: null,
    imageUrl: null,
    sourceUrl: validateStoreUrl(sourceUrl),
  };
}
