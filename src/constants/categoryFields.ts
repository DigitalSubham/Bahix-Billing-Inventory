export type BusinessCategory = 'GENERAL' | 'PHARMA';

export const BUSINESS_CATEGORY_OPTIONS = [
  { label: 'General / Retail', value: 'GENERAL' },
  { label: 'Pharma / Medical', value: 'PHARMA' },
];

/**
 * Optional per-line invoice fields each business category collects.
 * The PDF decides its own columns from the data, so adding a category here
 * only controls which inputs are shown in the app.
 */
export const CATEGORY_ITEM_FIELDS: Record<BusinessCategory, string[]> = {
  GENERAL: [],
  PHARMA: ['batchNo', 'expDate', 'mfgBy', 'freeQty', 'discountPercent'],
};

/** Optional fields shown on the business profile and customer forms. */
export const CATEGORY_PARTY_FIELDS: Record<BusinessCategory, string[]> = {
  GENERAL: [],
  PHARMA: ['dlNo', 'fssaiNo', 'uid', 'beat', 'stateCode'],
};

export const normalizeCategory = (value?: string | null): BusinessCategory =>
  value === 'PHARMA' ? 'PHARMA' : 'GENERAL';

export const hasItemField = (
  category: BusinessCategory,
  field: string,
): boolean => CATEGORY_ITEM_FIELDS[category].includes(field);

export const hasPartyField = (
  category: BusinessCategory,
  field: string,
): boolean => CATEGORY_PARTY_FIELDS[category].includes(field);
