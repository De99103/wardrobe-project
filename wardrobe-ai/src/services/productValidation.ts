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
  const url = new URL(value.trim());
  const host = url.hostname.toLowerCase().replace(/\.$/, '');
  const local = host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal');
  if (url.protocol !== 'https:' || (url.port && url.port !== '443') || url.username || url.password
      || local || !host || value.trim().length > 2048) {
    throw new Error('Use a public HTTPS product link from a store.');
  }
  return url.href;
}
