import type { ImportedProduct } from '../types/clothing';
import { isImportedProduct } from './productValidation';

const API_URL = process.env.EXPO_PUBLIC_API_URL?.replace(/\/+$/, '');

async function requestProduct(path: string, body?: object): Promise<ImportedProduct> {
  if (!API_URL) throw new Error('Backend API URL is not configured.');
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 120000);
  try {
    const response = await fetch(`${API_URL}${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
    let data: unknown;
    try {
      data = await response.json();
    } catch {
      throw new Error('The server returned an invalid response. Please try again.');
    }
    if (!response.ok) {
      const detail = data && typeof data === 'object' && 'detail' in data ? data.detail : null;
      throw new Error(typeof detail === 'string' ? detail : 'Could not import this product. Please try again.');
    }
    if (!isImportedProduct(data)) throw new Error('The server returned incomplete product data.');
    return data;
  } catch (error) {
    if (controller.signal.aborted) throw new Error('Import timed out. Please try again.');
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

// Share a recent product snapshot across collection changes and effect remounts.
// Keep the complete URL so different product variants never share a price.
const productImports = new Map<string, { expires: number; promise: Promise<ImportedProduct> }>();
export function importProduct(url: string): Promise<ImportedProduct> {
  const existing = productImports.get(url);
  if (existing && existing.expires > Date.now()) return existing.promise;
  if (productImports.size >= 32) productImports.delete(productImports.keys().next().value!);
  const entry = { expires: Date.now() + 120000, promise: requestProduct('/import-product', { url }) };
  entry.promise = entry.promise.then(product => {
    // Do not cache an incomplete price; a retry should be allowed to recover it.
    if (product.price == null && productImports.get(url) === entry) productImports.delete(url);
    else entry.expires = Date.now() + 120000;
    return product;
  }).catch(error => {
    if (productImports.get(url) === entry) productImports.delete(url);
    throw error;
  });
  productImports.set(url, entry);
  return entry.promise;
}

export function importProductManual(url: string, description: string): Promise<ImportedProduct> {
  return requestProduct('/import-product-manual', { url, description });
}

// Share the one-use handoff request across effect remounts (including React Strict Mode).
const imports = new Map<string, Promise<ImportedProduct>>();
export function getImportedProduct(importId: string): Promise<ImportedProduct> {
  const existing = imports.get(importId);
  if (existing) return existing;
  if (imports.size >= 32) imports.delete(imports.keys().next().value!);
  const pending = requestProduct(`/imports/${encodeURIComponent(importId)}`).catch(error => {
    imports.delete(importId);
    throw error;
  });
  imports.set(importId, pending);
  return pending;
}
