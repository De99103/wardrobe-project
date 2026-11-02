import type { ClothingStyling, ImportedProduct } from '../types/clothing';

const textFields = ['name', 'brand', 'category', 'subcategory', 'color', 'material', 'currency', 'imageUrl'] as const;

function stringList(value: unknown, limit: number): value is string[] {
  return Array.isArray(value) && value.length <= limit
    && value.every(entry => typeof entry === 'string' && entry.trim().length > 0 && entry.length <= 60);
}

export function isClothingStyling(value: unknown): value is ClothingStyling {
  if (!value || typeof value !== 'object') return false;
  const styling = value as Record<string, unknown>;
  const keys = Object.keys(styling);
  const rating = (entry: unknown) => typeof entry === 'number' && Number.isInteger(entry) && entry >= 1 && entry <= 5;
  return keys.length === 6
    && keys.every(key => ['colors', 'pattern', 'warmth', 'formality', 'layerRole', 'styleTags'].includes(key))
    && stringList(styling.colors, 8)
    && (styling.pattern === null || (typeof styling.pattern === 'string' && styling.pattern.length <= 60))
    && (styling.warmth === null || rating(styling.warmth))
    && (styling.formality === null || rating(styling.formality))
    && (styling.layerRole === null || ['base', 'mid', 'outer'].includes(String(styling.layerRole)))
    && stringList(styling.styleTags, 12);
}

export function isImportedProduct(value: unknown): value is ImportedProduct {
  if (!value || typeof value !== 'object') return false;
  const product = value as Record<string, unknown>;
  return typeof product.sourceUrl === 'string'
    && textFields.every(field => product[field] === null || typeof product[field] === 'string')
    && (product.price === null || (typeof product.price === 'number' && Number.isFinite(product.price) && product.price >= 0))
    && (product.styling === undefined || isClothingStyling(product.styling));
}

export function validateStoreUrl(value: string): string {
  // Remove Markdown escaping from copied links
  const cleaned = value.trim().replace(/\\([&_])/g, '$1');

  const url = new URL(cleaned);
  const host = url.hostname.toLowerCase().replace(/\.$/, '');

  const local =
    host === 'localhost' ||
    host.endsWith('.localhost') ||
    host.endsWith('.local') ||
    host.endsWith('.internal');

  if (
    url.protocol !== 'https:' ||
    (url.port && url.port !== '443') ||
    url.username ||
    url.password ||
    local ||
    !host ||
    cleaned.length > 2048 ||
    cleaned.includes('\\')
  ) {
    throw new Error('Use a public HTTPS product link from a store.');
  }

  // Remove page navigation fragments
  url.hash = '';

  // Remove advertising tracking parameters
  for (const key of [...url.searchParams.keys()]) {
    if (/^(utm_|_gl$|gclid$|gbraid$|wbraid$|fbclid$)/i.test(key)) {
      url.searchParams.delete(key);
    }
  }

  return url.href;
}
