
export type SavedClothing = ImportedProduct & {
  status: ClothingStatus;
  savedAt: string;
};

export type ClothingStatus = 'owned' | 'wishlist';

export type ImportedProduct = {
  name: string | null;
  brand: string | null;
  category: string | null;
  subcategory: string | null;
  color: string | null;
  material: string | null;
  price: number | null;
  currency: string | null;
  imageUrl: string | null;
  sourceUrl: string;
};
