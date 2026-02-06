
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

    initialize() {
        if (!this.apiKey) {
            console.warn('❌ [GeminiProvider] No API Key found');
            return false;
        }
        this.client = new GoogleGenAI({ apiKey: this.apiKey });
        return true;
    }

    /**
     * Generate translations
     * @param {Array} items - {id, text, context}
     * @param {Object} options 
     */
    async generateBatch(items, options = {}) {
        if (!this.client) this.initialize();
        if (!this.client) throw new Error('PROVIDER_NOT_CONFIGURED');

        const {
            sourceLanguage = 'en',
            targetLanguages = [], // ['my', 'zh']
            template,
            glossaryTerms = []
        } = options;

        console.log('🚀 [Gemini] Batch Request:', {
            count: items.length,
            targets: targetLanguages
        });

        // 1. Build Prompt
        const prompt = this._buildPrompt(items, template, targetLanguages, glossaryTerms, sourceLanguage);

        // 2. Call API
        try {
            const start = Date.now();
            const response = await this.client.models.generateContent({
                model: this.model,
                contents: prompt,
            });
            const duration = Date.now() - start;
            console.log(`✅ [Gemini] Response in ${duration}ms`);

            // 3. Parse & Format as V2 Output
            return this._parseResponse(response.text, items, targetLanguages);

        } catch (error) {
            console.error('❌ [Gemini] Error:', error);
            if (error.status === 429) throw new Error('RATE_LIMIT');
            throw error;
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
            return { success: true, message: res.text };
        } catch (e) {
            return { success: false, message: e.message };
        }
    }

    // --- Internal Helpers ---

    _buildPrompt(items, template, targetLanguages, glossaryTerms, sourceLang) {
        // Resolve Language Names (using centralized LANGUAGES constant)
        const sourceLangName = getLangName(sourceLang);
        const targetLangNames = targetLanguages.map(l => getLangName(l)).join(', ');

        // Process Template
        let instructions = template?.prompt || 'Translate accurately.';
        instructions = instructions.replace(/\{\{targetLanguage\}\}/gi, targetLangNames);

        // Build Glossary
        const glossarySection = this._buildGlossarySection(glossaryTerms, items);

        return `
You are a professional translator. Translate from ${sourceLangName} to: ${targetLangNames}.

## Instructions
${instructions}

${glossarySection}

## Input Data (JSON)
\`\`\`json
${JSON.stringify(items.map(i => ({ id: i.id, text: i.text, context: i.context })), null, 2)}
\`\`\`

## Required Output Format
Return a JSON Array. Each object must have an "id" and a "translations" object containing the target languages.
Example:
[
  {
    "id": "1",
    "translations": {
      "${targetLanguages[0]}": { "text": "Translated text..." },
      "${targetLanguages[1] || 'other'}": { "text": "Translated text..." }
    }
  }
]

IMPORTANT:
- Return ONLY valid JSON.
- Ensure every target language is present in the "translations" object.
`;
    }

    _buildGlossarySection(terms, items) {
        if (!terms.length) return '';
        // Lite-RAG: Filter relevant terms
        const combinedText = items.map(i => i.text).join(' ').toLowerCase();
        const relevant = terms.filter(t => combinedText.includes((t.english || t.term).toLowerCase()));

        if (!relevant.length) return '';

        return `
## Mandatory Glossary
Use these exact translations if the term appears:
| Term | Translations |
|---|---|
${relevant.map(t => `| ${t.english || t.term} | ${JSON.stringify(t.translations || {})} |`).join('\n')}
`;
    }

    _parseResponse(text, originalItems, targetLanguages) {
        try {
            const cleaner = text.replace(/```json/g, '').replace(/```/g, '').trim();
            const json = JSON.parse(cleaner);

            // Map back to guarantee structure
            return originalItems.map(item => {
                const match = json.find(j => String(j.id) === String(item.id));
                const translations = {};

                targetLanguages.forEach(lang => {
                    const tData = match?.translations?.[lang];
                    translations[lang] = {
                        text: typeof tData === 'object' ? tData.text : (tData || ''),
                        status: 'review' // Default status for new translations
                    };
                });

                return {
                    id: item.id,
                    translations // V2 Nested Structure
                };
            });
        } catch (e) {
            console.error('JSON Parse Error:', text);
            throw new Error('AI_RESPONSE_PARSE_FAILED');
        }
    }
}
