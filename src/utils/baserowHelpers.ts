/**
 * Helper utility to perform case-insensitive and normalized key lookups
 * on objects returned by Baserow, ensuring casing mismatches do not break the UI.
 */
export const getValueByPossibleKeys = (item: any, column: string): any => {
  if (!item) return undefined;
  if (item[column] !== undefined && item[column] !== null) return item[column];

  const lowerCol = column.toLowerCase();
  const keys = Object.keys(item);

  // Try exact match case-insensitively
  const matchedKey = keys.find(k => k.toLowerCase() === lowerCol);
  if (matchedKey) return item[matchedKey];

  // Try matching normalized strings (removing spaces, underscores, and dashes)
  const normCol = lowerCol.replace(/[\s_-]/g, '');
  const matchedNormKey = keys.find(k => k.toLowerCase().replace(/[\s_-]/g, '') === normCol);
  if (matchedNormKey) return item[matchedNormKey];

  return undefined;
};

/**
 * Maps expected form/frontend keys back to their actual database key casings
 * based on the keys present in the database item.
 */
export const mapToDatabaseKeys = (formData: any, existingKeys: string[]): any => {
  if (!existingKeys || existingKeys.length === 0 || !formData) return formData;
  const mapped: Record<string, any> = {};
  
  Object.keys(formData).forEach(key => {
    const matchedKey = existingKeys.find(k => k.toLowerCase() === key.toLowerCase());
    if (matchedKey) {
      mapped[matchedKey] = formData[key];
    } else {
      mapped[key] = formData[key];
    }
  });
  
  return mapped;
};
