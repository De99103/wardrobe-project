import type { ImportedProduct } from '../types/clothing';

const textFields = ['name', 'brand', 'category', 'subcategory', 'color', 'material', 'currency', 'imageUrl'] as const;

export function isImportedProduct(value: unknown): value is ImportedProduct {
  if (!value || typeof value !== 'object') return false;
  const product = value as Record<string, unknown>;
  return typeof product.sourceUrl === 'string'
    && textFields.every(field => product[field] === null || typeof product[field] === 'string')
    && (product.price === null || (typeof product.price === 'number' && Number.isFinite(product.price) && product.price >= 0));
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
