
export type SavedClothing = ImportedProduct & {
  status: ClothingStatus;
  savedAt: string;
};

export type ClothingStatus = 'owned' | 'wishlist';

export type ClothingStyling = {
  colors: string[];
  pattern: string | null;
  warmth: number | null;
  formality: number | null;
  layerRole: 'base' | 'mid' | 'outer' | null;
  styleTags: string[];
};

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
  imageUrls?: string[];
  sourceUrl: string;
  // Optional so wardrobes saved before styling tags were introduced stay valid.
  styling?: ClothingStyling;
};
