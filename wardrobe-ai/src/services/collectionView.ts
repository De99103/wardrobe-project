import type { SavedClothing, ClothingStatus } from '../types/clothing';
export const categories = ['tops', 'bottoms', 'dresses', 'outerwear', 'shoes', 'accessories', 'uncategorized'] as const;
export type Category = typeof categories[number];
export type CollectionSort = 'type' | 'newest' | 'name';
export const categoryLabel = (value: string) => value.charAt(0).toUpperCase() + value.slice(1);
export function clothingCategory(item: SavedClothing): Category {
  const value = item.category?.toLowerCase().trim();
  return categories.includes(value as Category) ? value as Category : 'uncategorized';
}
export function storeLink(value: string): string | null {
  try {
    const url = new URL(value);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : null;
  } catch { return null; }
}
export function collectionSections(items: SavedClothing[], status: ClothingStatus, category: Category | 'all', sort: CollectionSort) {
  const selected = items.filter(item => item.status === status && (category === 'all' || clothingCategory(item) === category));
  selected.sort((a, b) => sort === 'newest' ? b.savedAt.localeCompare(a.savedAt)
    : (sort === 'type' ? (a.subcategory ?? '').localeCompare(b.subcategory ?? '') : 0)
      || (a.name ?? '').localeCompare(b.name ?? '') || a.sourceUrl.localeCompare(b.sourceUrl));
  return sort === 'type' ? categories.map(value => ({ title: categoryLabel(value), data: selected.filter(item => clothingCategory(item) === value) })).filter(section => section.data.length)
    : selected.length ? [{ title: sort === 'newest' ? 'Recently added' : 'Clothing', data: selected }] : [];
}
