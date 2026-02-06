/**
 * Data Migration & Normalization Utilities
 * Handles compatibility between V1 (Flat) and V2 (Nested) Row Schemas
 */

/**
 * Normalize a row object to the V2 Nested Schema
 * @param {Object} row - The raw row object from database
 * @param {Array} targetLanguages - List of target languages to ensure exist
 * @returns {Object} V2 formatted row with `translations` object
 */
export const normalizeRow = (row, targetLanguages = []) => {
    // 1. If already V2 (has translations object), return strict structure
    if (row.translations && typeof row.translations === 'object') {
        return row;
    }

    // 2. Migration Logic: Convert Flat -> Nested
    const translations = {};
    const globalStatus = row.status || 'draft';

    // Default migration for common legacy columns
    // We try to capture all known language columns
    const legacyCols = ['ms', 'my', 'zh', 'cn', 'ja'];
    const langsToMigrate = [...new Set([...targetLanguages, ...legacyCols])];

    langsToMigrate.forEach(lang => {
        // Handle code aliases (ms=my, zh=cn)
        let text = row[lang] || '';

        // Specific fallback for Malay alias
        if (lang === 'ms' && !text) text = row.my || '';
        if (lang === 'my' && !text) text = row.ms || '';

        // Specific fallback for Chinese alias
        if (lang === 'zh' && !text) text = row.cn || '';

        // Only create entry if we have text OR it's a target language
        if (text || targetLanguages.includes(lang)) {
            translations[lang] = {
                text: text,
                status: globalStatus, // Inherit global status
                updatedAt: row.updatedAt
            };
        }
    });

    return {
        ...row,
        translations
    };
};

/**
 * Denormalize V2 row back to Flat structure (for Table display if needed)
 * @param {Object} v2Row 
 * @returns {Object} Flat row
 */
export const flattenRowForTable = (v2Row) => {
    const flat = { ...v2Row };
    if (v2Row.translations) {
        Object.entries(v2Row.translations).forEach(([lang, data]) => {
            flat[lang] = data.text;
            flat[`${lang}_status`] = data.status;
        });
    }
    return flat;
};
