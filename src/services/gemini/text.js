// Gemini AI Service for Translation
// Uses @google/genai SDK to call Gemini API
// Includes glossary integration and template variable substitution

import { GoogleGenAI } from "@google/genai";

// Initialize the client - API key from environment variable
const getClient = () => {
    // Note: In Vite, keys must typically start with VITE_ to be exposed to the client
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;
    if (!apiKey) {
        console.warn('VITE_GEMINI_API_KEY not found in .env file.');
        return null;
    }
    return new GoogleGenAI({ apiKey });
};
// Get configured model or default to stable flash
export const getModel = () => {
    return import.meta.env.VITE_GEMINI_MODEL || "gemini-2.0-flash";
};

/**
 * Language code to name mapping
 */
const LANGUAGE_NAMES = {
    'en': 'English',
    'my': 'Bahasa Malaysia (Malay)',
    'zh': 'Simplified Chinese (中文)'
};

/**
 * Build glossary section for prompt with context-aware filtering (Lite-RAG)
 * Only includes glossary terms that actually appear in the source texts
 * @param {Array} glossaryTerms - Array of {english, malay, chinese} terms
 * @param {Array} targetLanguages - Target language codes ['my', 'zh']
 * @param {Array} sourceTexts - Array of {id, text, context} objects to check against
 * @returns {string} Formatted glossary section for prompt
 */
function buildGlossaryPrompt(glossaryTerms, targetLanguages, sourceTexts = []) {
    if (!glossaryTerms || glossaryTerms.length === 0) {
        return '';
    }

    // Combine all source text into one searchable string (lowercase for case-insensitive matching)
    const combinedSourceText = sourceTexts
        .map(s => `${s.text || ''} ${s.context || ''}`)
        .join(' ')
        .toLowerCase();

    // Filter glossary to only terms that appear in the source text
    const relevantTerms = glossaryTerms.filter(term => {
        if (!term.english) return false;
        // Check if the English term appears in the combined source text
        return combinedSourceText.includes(term.english.toLowerCase());
    });

    if (relevantTerms.length === 0) {
        return '';
    }

    console.log(`📚 [Glossary] Filtered ${glossaryTerms.length} terms → ${relevantTerms.length} relevant terms`);

    const lines = relevantTerms.map(term => {
        const translations = targetLanguages.map(lang => {
            const langName = lang === 'my' ? 'Malay' : 'Chinese';
            const value = lang === 'my' ? term.malay : term.chinese;
            return value ? `${langName}: "${value}"` : null;
        }).filter(Boolean).join(', ');

        return `| ${term.english} | ${translations} |`;
    });

    return `
## MANDATORY GLOSSARY - YOU MUST USE THESE EXACT TRANSLATIONS
> [!CRITICAL] The following terms have been specifically defined for brand consistency.
> You MUST use these exact translations whenever these English terms appear in the source text.
> Do NOT use alternative translations for these terms under any circumstances.

| English Term | Required Translations |
|--------------|----------------------|
${lines.join('\n')}
`;
}

/**
 * Process template with variable substitution
 * @param {Object} template - Template object with {name, prompt}
 * @param {Array} targetLanguages - Target language codes
 * @returns {string} Processed prompt with variables replaced
 */
function processTemplate(template, targetLanguages) {
    if (!template?.prompt) {
        return 'Translate accurately while maintaining the original meaning and tone.';
    }

    const targetLangStr = targetLanguages.map(l => LANGUAGE_NAMES[l] || l).join(' and ');

    // Replace common template variables
    let processed = template.prompt
        .replace(/\{\{targetLanguage\}\}/gi, targetLangStr)
        .replace(/\{\{target_language\}\}/gi, targetLangStr)
        .replace(/\{targetLanguage\}/gi, targetLangStr)
        .replace(/\{target_language\}/gi, targetLangStr);

    return processed;
}

/**
 * Translate a batch of rows using Gemini AI
 * @param {Array} rows - Array of row objects with {id, en/my/zh/source, context}
 * @param {Object} template - Prompt template with {name, prompt}
 * @param {Object} options - Translation options
 * @param {string} options.sourceLanguage - Source language code ('en', 'my', 'zh')
 * @param {Array} options.targetLanguages - Target language codes ['my', 'zh']
 * @param {Array} options.glossaryTerms - Array of glossary terms
 * @returns {Promise<Array>} - Array of translated results
 */
export async function translateBatch(rows, template, options = {}) {
    const {
        sourceLanguage = 'en',
        targetLanguages = ['my', 'zh'],
        glossaryTerms = []
    } = options;

    const startTime = Date.now();

    console.log('🚀 [Gemini API] Starting translation batch:', {
        rowCount: rows.length,
        template: template?.name || 'Default',
        sourceLanguage,
        targetLanguages,
        glossaryTermCount: glossaryTerms.length
    });

    const ai = getClient();
    if (!ai) {
        throw new Error('API_NOT_CONFIGURED');
    }

    // Build the translation prompt - extract source text based on source language
    const sourceTexts = rows.map(row => {
        // Try to get text from source language field, fallback to common fields
        const text = row[sourceLanguage] || row.en || row.english || row.source || '';
        return {
            id: row.id,
            text: text,
            context: row.context || row.description || ''
        };
    });

    const prompt = buildTranslationPrompt(sourceTexts, template, targetLanguages, glossaryTerms, sourceLanguage);

    console.log('📝 [Gemini API] Prompt built, sending request...');

    try {
        const response = await ai.models.generateContent({
            model: getModel(),
            contents: prompt,
        });

        const text = response.text;
        const elapsed = Date.now() - startTime;

        console.log('✅ [Gemini API] Response received:', {
            elapsed: `${elapsed}ms`,
            responseLength: text?.length || 0
        });

        // Parse the JSON response
        const results = parseTranslationResponse(text, rows);

        console.log('📦 [Gemini API] Parsed results:', {
            successCount: results.filter(r => r.status === 'review').length,
            errorCount: results.filter(r => r.status === 'error').length
        });

        return results;

    } catch (error) {
        const elapsed = Date.now() - startTime;
        console.error('❌ [Gemini API] Error after', elapsed, 'ms:', error);

        // Check for rate limit error
        if (error.status === 429 || error.message?.includes('429')) {
            console.warn('⏳ [Gemini API] Rate limited, will retry...');
            throw new Error('RATE_LIMIT');
        }

        throw error;
    }
}

/**
 * Build the translation prompt with template, glossary, and context
 */
function buildTranslationPrompt(sourceTexts, template, targetLanguages, glossaryTerms = [], sourceLanguage = 'en') {
    const targetLangStr = targetLanguages.map(l => LANGUAGE_NAMES[l] || l).join(' and ');
    const sourceLangStr = LANGUAGE_NAMES[sourceLanguage] || 'English';

    // Process template with variable substitution
    const styleInstruction = processTemplate(template, targetLanguages);
    console.log('📝 [Gemini API] Style Instruction:', styleInstruction); // DEBUG LOG

    // Build glossary section (with context-aware filtering)
    const glossarySection = buildGlossaryPrompt(glossaryTerms, targetLanguages, sourceTexts);

    // Build language-specific style instructions to prevent selective application
    const languageSpecificStyles = targetLanguages.map(langCode => {
        const langName = LANGUAGE_NAMES[langCode] || langCode;
        return `### For ${langName} translations specifically:
${styleInstruction}`;
    }).join('\n\n');

    const prompt = `You are a professional translator for a Malaysian telecommunications company. Translate the following texts from ${sourceLangStr} to ${targetLangStr}.

## Core Requirements
- Use Malaysian Bahasa (not Indonesian) for Malay translations
- Use Simplified Chinese with Malaysian expressions for Chinese translations
- Maintain professional but approachable tone
- Preserve any placeholders like {name} or {{variable}} exactly as they appear
- Maintain the same formatting (line breaks, punctuation style)
${glossarySection}
## MANDATORY Style Guidelines (APPLY TO ALL LANGUAGES)
The following style instructions MUST be applied to EVERY target language equally:

${languageSpecificStyles}

## Input
I will provide you with a JSON array of objects. Each object has:
- "id": A unique identifier (return this unchanged)
- "text": The ${sourceLangStr} text to translate
- "context": Optional context about where this text is used

\`\`\`json
${JSON.stringify(sourceTexts, null, 2)}
\`\`\`

## Output Format
Return a JSON array with the same "id" values, plus translations for each target language.
Use these exact keys: ${targetLanguages.map(l => `"${l}"`).join(', ')}

Example output format:
\`\`\`json
[
  {"id": 1, ${targetLanguages.map(l => `"${l}": "${LANGUAGE_NAMES[l] || l} translation"`).join(', ')}},
  {"id": 2, ${targetLanguages.map(l => `"${l}": "..."`).join(', ')}}
]
\`\`\`

CRITICAL REMINDERS:
- Return ONLY the JSON array, no other text
- Apply glossary terms exactly as specified
- If a glossary term appears in the source, use the exact translation from the glossary
- YOU MUST apply ALL style instructions to EVERY language translation. Do NOT apply style to only one language and ignore others.
- Double-check: Did you apply the style rules to BOTH ${targetLangStr}? If not, regenerate.`;

    return prompt;
}

/**
 * Parse the translation response from Gemini
 */
function parseTranslationResponse(responseText, originalRows) {
    try {
        // Extract JSON from response (handle markdown code blocks)
        let jsonStr = responseText;

        // Remove markdown code blocks if present
        const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
            jsonStr = jsonMatch[1];
        }

        const parsed = JSON.parse(jsonStr.trim());

        // Merge with original row data
        return originalRows.map(row => {
            const translation = parsed.find(t => String(t.id) === String(row.id));
            const { id, ...translatedFields } = translation || {};

            return {
                id: row.id,
                ...translatedFields, // Dynamically spread all returned languages (en, my, zh)
                status: 'review',
                translatedAt: new Date().toISOString(),
            };
        });

    } catch (error) {
        console.error('Failed to parse translation response:', error);
        console.error('Raw response:', responseText);

        // Return error status for all rows
        return originalRows.map(row => ({
            id: row.id,
            status: 'error',
            errorMessage: 'Failed to parse AI response'
        }));
    }
}

/**
 * Translate a single text (convenience wrapper)
 * @param {string} sourceText - Text to translate
 * @param {string} targetLanguage - 'my' or 'zh'
 * @param {Object} options - {category, glossaryTerms}
 * @returns {Promise<string>} Translated text
 */
export async function translateText(sourceText, targetLanguage, options = {}) {
    const { category = 'general', glossaryTerms = [] } = options;

    const template = {
        name: category,
        prompt: `Translate for ${category} context. Be accurate and natural.`
    };

    const results = await translateBatch(
        [{ id: 1, en: sourceText }],
        template,
        {
            targetLanguages: [targetLanguage],
            glossaryTerms
        }
    );

    return results[0]?.[targetLanguage] || '';
}

/**
 * Test the API connection
 */
export async function testConnection() {
    try {
        const ai = getClient();
        if (!ai) {
            return { success: false, message: 'API key not configured' };
        }
        const response = await ai.models.generateContent({
            model: getModel(),
            contents: "Say 'API connection successful' in exactly those words.",
        });
        return { success: true, message: response.text };
    } catch (error) {
        return { success: false, message: error.message };
    }
}

/**
 * Get available models (for settings/debugging)
 */
export function getConfig() {
    return {
        apiKeyConfigured: !!import.meta.env.VITE_GEMINI_API_KEY,
        model: getModel(),
        supportedLanguages: ['en', 'my', 'zh']
    };
}
