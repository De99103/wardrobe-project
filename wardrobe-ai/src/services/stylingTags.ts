import type { ClothingStyling, ImportedProduct } from '../types/clothing';
import { isClothingStyling } from './productValidation';

export type StylingDraft = {
  colors: string;
  pattern: string;
  warmth: string;
  formality: string;
  layerRole: '' | 'base' | 'mid' | 'outer';
  styleTags: string;
};

const patternWords = [
  ['striped', /\b(striped|stripe|randig)\b/i], ['checked', /\b(checked|checkered|check|plaid|rutig)\b/i],
  ['floral', /\b(floral|flower(?:ed)?|blommig)\b/i], ['polka dot', /\b(polka[ -]?dot|dotted|prickig)\b/i],
  ['animal print', /\b(animal print|leopard|zebra|snake print)\b/i], ['graphic', /\b(graphic|logo print|printed)\b/i],
] as const;
const styleWords = [
  ['chunky knit', /\b(chunky|cable knit|grovstickad)\b/i],
  ['ribbed texture', /\b(ribbed|ribbstickad)\b/i],
  ['satin finish', /\b(satin)\b/i],
  ['structured', /\b(structured|tailored|figursydd)\b/i],
  ['flowing', /\b(flowing|draped|draperad)\b/i],
  ['oversized fit', /\b(oversized|oversize|loose fit)\b/i],
  ['fitted', /\b(fitted|slim fit|figurnära)\b/i],
  ['cropped length', /\b(cropped|crop top)\b/i],
  ['maxi length', /\b(maxi|ankle.length)\b/i],
  ['lightweight', /\b(lightweight|light.weight)\b/i],
  ['heavyweight', /\b(heavyweight|heavy.weight)\b/i],
  ['casual', /\b(casual|everyday)\b/i], ['formal', /\b(formal|occasion|evening|tuxedo)\b/i],
  ['classic', /\b(classic|timeless|tailored)\b/i], ['minimal', /\b(minimal|clean-lined|simple)\b/i],
  ['sporty', /\b(sporty|athletic|training|running)\b/i], ['romantic', /\b(romantic|ruffle|lace|bow)\b/i],
  ['bohemian', /\b(boho|bohemian)\b/i], ['streetwear', /\b(streetwear|oversized hoodie)\b/i],
] as const;

function unique(values: string[], limit: number): string[] {
  const seen = new Set<string>();
  return values.filter(value => { const normalized = value.trim().toLowerCase(); if (!normalized || normalized.length > 60 || seen.has(normalized)) return false; seen.add(normalized); return true; }).map(value => value.trim().toLowerCase()).slice(0, limit);
}
function numberTag(value: unknown): value is number { return typeof value === 'number' && Number.isInteger(value) && value >= 1 && value <= 5; }

export function inferClothingStyling(product: Pick<ImportedProduct, 'category' | 'subcategory' | 'color' | 'material' | 'name'>): ClothingStyling {
  const category = product.category?.trim().toLowerCase() ?? '';
  const description = [product.name, product.subcategory, product.material, product.color].filter((value): value is string => !!value).join(' ');
  const pattern = patternWords.find(([, matcher]) => matcher.test(description))?.[0] ?? null;
  const patternMatchers = patternWords.map(([, matcher]) => matcher);
  const colors = unique((product.color ?? '').split(/\s*(?:\/|,|;|&|\band\b)\s*/i).filter(value => value && !patternMatchers.some(matcher => matcher.test(value))), 8);
  const styleTags = unique(styleWords.filter(([, matcher]) => matcher.test(description)).map(([tag]) => tag), 12);
  let layerRole: ClothingStyling['layerRole'] = null;
  if (category === 'outerwear') layerRole = 'outer';
  else if (category === 'tops') layerRole = /\b(sweater|jumper|cardigan|hoodie|sweatshirt|fleece|vest|knitwear)\b/i.test(description) ? 'mid' : 'base';
  else if (category === 'bottoms' || category === 'dresses') layerRole = 'base';
  let warmth: number | null = null;
  if (/\b(down|puffer|insulated|shearling|thermal|heavyweight)\b/i.test(description)) warmth = 5;
  else if (/\b(wool|cashmere|fleece|winter coat|parka|quilted)\b/i.test(description)) warmth = 4;
  else if (/\b(knit|denim|leather|sweater|jumper|cardigan|hoodie|sweatshirt)\b/i.test(description)) warmth = 3;
  else if (/\b(cotton|jersey|shirt|blouse|trouser|jeans|sneaker)\b/i.test(description)) warmth = 2;
  else if (/\b(linen|silk|camisole|tank top|shorts|sandal)\b/i.test(description)) warmth = 1;
  let formality: number | null = null;
  if (/\b(gown|tuxedo|black tie|evening dress)\b/i.test(description)) formality = 5;
  else if (/\b(suit|blazer|tailored|dress shirt|pencil skirt|loafer|heel)\b/i.test(description)) formality = 4;
  else if (/\b(dress|skirt|trouser|blouse|button[- ]?down|ankle boot)\b/i.test(description)) formality = 3;
  else if (/\b(jeans|t-?shirt|sweater|sneaker|casual)\b/i.test(description)) formality = 2;
  else if (/\b(legging|track|gym|sport|hoodie|sweatshirt|flip flop)\b/i.test(description)) formality = 1;
  return { colors, pattern, warmth, formality, layerRole, styleTags };
}
export function withInferredStyling<T extends ImportedProduct>(product: T): T & { styling: ClothingStyling } { return { ...product, styling: isClothingStyling(product.styling) ? product.styling : inferClothingStyling(product) }; }
export function stylingDraft(product: ImportedProduct): StylingDraft {
  const styling = isClothingStyling(product.styling) ? product.styling : inferClothingStyling(product);
  return { colors: styling.colors.join(', '), pattern: styling.pattern ?? '', warmth: styling.warmth === null ? '' : String(styling.warmth), formality: styling.formality === null ? '' : String(styling.formality), layerRole: styling.layerRole ?? '', styleTags: styling.styleTags.join(', ') };
}
export function stylingFromDraft(draft: StylingDraft): ClothingStyling {
  const rating = (value: string, label: string) => { if (!value.trim()) return null; const parsed = Number(value); if (!numberTag(parsed)) throw new Error(`${label} must be from 1 to 5, or left blank.`); return parsed; };
  const shortText = (value: string) => { const result = value.trim().toLowerCase(); if (result.length > 60) throw new Error('Keep each styling tag under 60 characters.'); return result || null; };
  const styling: ClothingStyling = { colors: unique(draft.colors.split(','), 8), pattern: shortText(draft.pattern), warmth: rating(draft.warmth, 'Warmth'), formality: rating(draft.formality, 'Formality'), layerRole: draft.layerRole || null, styleTags: unique(draft.styleTags.split(','), 12) };
  if (!isClothingStyling(styling)) throw new Error('Check the styling details and try again.');
  return styling;
}
