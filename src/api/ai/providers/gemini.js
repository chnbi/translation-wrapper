
import { GoogleGenAI } from "@google/genai";
import { BaseAIProvider } from "./base";
import { LANGUAGES, getNativeLabel } from "@/lib/constants";

// Build language name map from centralized LANGUAGES constant
const getLangName = (code) => {
    const lang = LANGUAGES[code];
    return lang?.nativeLabel || lang?.label || code;
};


export class GeminiProvider extends BaseAIProvider {
    constructor(config = {}) {
        super(config);
        this.apiKey = config.apiKey || import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY;
        this.model = config.model || import.meta.env.VITE_GEMINI_MODEL || "gemini-2.0-flash";
        this.client = null;
    }

    /**
     * Initialize the GoogleGenAI client
     */
    initialize() {
        if (!this.apiKey) {
            console.warn('[Gemini] No API Key found');
            return false;
        }
        this.client = new GoogleGenAI({ apiKey: this.apiKey });
        return true;
    }

    /**
     * Update API key at runtime
     * @param {string} newApiKey
     */
    setApiKey(newApiKey) {
        if (newApiKey && newApiKey !== this.apiKey) {
            this.apiKey = newApiKey;
            this.client = new GoogleGenAI({ apiKey: this.apiKey });
        }
    }

    // ============================================
    // PUBLIC METHODS
    // ============================================

    /**
     * Generate translations for a batch of items
     * @param {Array} items - Items to translate {id, text, context}
     * @param {Object} options - { sourceLanguage, targetLanguages, template, glossaryTerms }
     */
    async generateBatch(items, options = {}) {
        this._validateConfig();

        const {
            sourceLanguage = 'en',
            targetLanguages = [],
            template,
            glossaryTerms = []
        } = options;

        // Debug logging removed for production

        try {
            // 1. Prepare Prompt
            const prompt = this._buildBatchPrompt(items, template, targetLanguages, glossaryTerms, sourceLanguage);

            // 2. Execute API Call
            const responseText = await this._executeGenAI(prompt);

            // 3. Parse Response
            return this._parseBatchResponse(responseText, items, targetLanguages);

        } catch (error) {
            this._handleError(error);
        }
    }

    /**
     * Extract text from an image (OCR)
     * @param {File} imageFile 
     */
    async extractTextFromImage(imageFile) {
        this._validateConfig();
        // OCR extraction

        try {
            const imagePart = await this._fileToGenerativePart(imageFile);
            const prompt = `Extract all text from this image. Return the result as a JSON array of objects, where each object has an "id" (number) and "text" (string) field. Preserves original line breaks as separate items.`;

            const responseText = await this._executeGenAI([prompt, imagePart]);
            return this._parseOCRResponse(responseText);

        } catch (error) {
            this._handleError(error);
        }
    }

    /**
     * Extract text and translate in one step
     * @param {File} imageFile 
     * @param {Array} targetLanguages 
     * @param {Array} glossaryTerms 
     */
    async extractAndTranslate(imageFile, targetLanguages = ['my', 'zh'], glossaryTerms = []) {
        this._validateConfig();
        // OCR + Translation

        try {
            const imagePart = await this._fileToGenerativePart(imageFile);
            const glossaryText = this._buildGlossarySection(glossaryTerms, []); // Pass empty items as we don't know text yet

            const prompt = `
Extract all text from this image and translate it to ${targetLanguages.join(', ')}.
${glossaryText}

Return a valid JSON array where each item has:
- "id": number
- "text": original text
- "en": original text (if detected)
- ${targetLanguages.map(lang => `"${lang}": translated text`).join('\n- ')}
`;

            const responseText = await this._executeGenAI([prompt, imagePart]);
            return this._parseExtractAndTranslateResponse(responseText, targetLanguages);

        } catch (error) {
            this._handleError(error);
        }
    }

    async testConnection() {
        if (!this.client) this.initialize();
        if (!this.client) return { success: false, message: 'API Key missing' };

        try {
            const res = await this.client.models.generateContent({
                model: this.model,
                contents: "Say 'OK'",
            });

            // Handle different SDK response structures
            let text = '';
            if (typeof res?.text === 'function') {
                text = res.text();
            } else if (typeof res?.response?.text === 'function') {
                text = res.response.text();
            } else if (typeof res?.candidates?.[0]?.content?.parts?.[0]?.text === 'string') {
                text = res.candidates[0].content.parts[0].text;
            } else {
                text = 'Connected (response format unknown)';
            }

            return { success: true, message: text };
        } catch (e) {
            return { success: false, message: e.message };
        }
    }

    // ============================================
    // INTERNAL HELPERS
    // ============================================

    _validateConfig() {
        if (!this.client) this.initialize();
        if (!this.client) throw new Error('PROVIDER_NOT_CONFIGURED');
    }

    async _executeGenAI(contents) {
        const result = await this.client.models.generateContent({
            model: this.model,
            contents: contents,
        });

        // Handle different SDK response structures
        if (typeof result?.text === 'function') {
            return result.text();
        } else if (typeof result?.response?.text === 'function') {
            return result.response.text();
        } else if (typeof result?.candidates?.[0]?.content?.parts?.[0]?.text === 'string') {
            return result.candidates[0].content.parts[0].text;
        } else {
            console.error('[Gemini] Unexpected response structure');
            throw new Error('AI_INVALID_RESPONSE_STRUCTURE');
        }
    }

    _handleError(error) {
        console.error('[Gemini] Error:', error.message || error);
        if (error.status === 429) throw new Error('RATE_LIMIT');
        throw error;
    }

    // --- Prompt Builders ---

    _buildBatchPrompt(items, template, targetLanguages, glossaryTerms, sourceLang) {
        const sourceLangName = getLangName(sourceLang);
        const targetLangNames = targetLanguages.map(l => getLangName(l)).join(', ');

        if (!template?.prompt) throw new Error('MISSING_TEMPLATE');

        const instructions = template.prompt.replace(/\{\{targetLanguage\}\}/gi, targetLangNames);
        const glossarySection = this._buildGlossarySection(glossaryTerms, items);

        return `# Translation Task
Role: Professional Translator
Source: ${sourceLangName}
Targets: ${targetLangNames}

## Instructions
${instructions}
${glossarySection}

## Input
\`\`\`json
${JSON.stringify(items.map(i => ({ id: i.id, text: i.text, context: i.context })), null, 2)}
\`\`\`

## Output
Return JSON array with structure:
[{ "id": "val", "translations": { "lang_code": { "text": "..." } } }]
`;
    }

    _buildGlossarySection(terms, items) {
        if (!terms.length) return '';

        // Lite-RAG: Filter if items provided, else use all
        let relevant = terms;
        if (items && items.length > 0) {
            const combinedText = items.map(i => i.text).join(' ').toLowerCase();
            relevant = terms.filter(t => {
                const termText = t.english || t.term || t.en || '';
                return termText && combinedText.includes(termText.toLowerCase());
            });
        }

        if (!relevant.length) return '';

        return `
## Mandatory Glossary
| Term | Translations |
|---|---|
${relevant.map(t => `| ${t.english || t.term} | ${JSON.stringify(t.translations || {})} |`).join('\n')}
`;
    }

    // --- Response Parsers ---

    _parseBatchResponse(text, originalItems, targetLanguages) {
        try {
            const json = this._cleanAndParseJSON(text);

            return originalItems.map(item => {
                const match = json.find(j => String(j.id) === String(item.id));
                const translations = {};

                targetLanguages.forEach(lang => {
                    const tData = match?.translations?.[lang];
                    translations[lang] = {
                        text: typeof tData === 'object' ? tData.text : (tData || ''),
                        status: 'review'
                    };
                });

                return { id: item.id, translations };
            });
        } catch (e) {
            console.error('JSON Parse Error:', text);
            throw new Error('AI_RESPONSE_PARSE_FAILED');
        }
    }

    _parseOCRResponse(text) {
        try {
            const json = this._cleanAndParseJSON(text);
            return json.map(item => ({
                id: item.id || Date.now() + Math.random(),
                text: item.text || '',
                en: item.text || '' // Default 'en' to text
            }));
        } catch (e) {
            console.error('OCR Parse Error:', text);
            return []; // Fail gracefully for OCR
        }
    }

    _parseExtractAndTranslateResponse(text, targetLanguages) {
        try {
            const json = this._cleanAndParseJSON(text);
            return json.map(item => {
                const result = {
                    id: item.id || Date.now(),
                    text: item.text || item.en || '',
                    en: item.en || item.text || '',
                    translated: true
                };

                targetLanguages.forEach(lang => {
                    result[lang] = item[lang] || '';
                });

                return result;
            });
        } catch (e) {
            console.error('Extract+Translate Parse Error:', text);
            return [];
        }
    }

    _cleanAndParseJSON(text) {
        const cleaner = text.replace(/```json/g, '').replace(/```/g, '').trim();
        return JSON.parse(cleaner);
    }

    async _fileToGenerativePart(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => {
                const base64Data = reader.result.split(',')[1];
                resolve({
                    inlineData: {
                        data: base64Data,
                        mimeType: file.type
                    }
                });
            };
            reader.onerror = reject;
            reader.readAsDataURL(file);
        });
    }
}
