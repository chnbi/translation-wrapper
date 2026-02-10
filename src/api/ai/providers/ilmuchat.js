
/**
 * ILMUchat Provider
 * OpenAI-compatible API endpoint for YTL AI Labs
 */
import { BaseAIProvider } from "./base";
import { LANGUAGES } from "@/lib/constants";

// Build language name map from centralized LANGUAGES constant
const getLangName = (code) => {
    const lang = LANGUAGES[code];
    return lang?.nativeLabel || lang?.label || code;
};

export class ILMUchatProvider extends BaseAIProvider {
    constructor(config = {}) {
        super(config);
        this.apiKey = config.apiKey || import.meta.env.VITE_ILMUCHAT_API_KEY;

        // Get target URL from env or default
        const targetUrl = config.endpoint || import.meta.env.VITE_ILMUCHAT_ENDPOINT || 'https://api.ytlailabs.tech/preview/v1/chat/completions';

        try {
            const urlObj = new URL(targetUrl);
            this.endpoint = `/proxy/ilmuchat${urlObj.pathname}`;
        } catch (e) {
            // Fallback if relative path provided
            this.endpoint = targetUrl.startsWith('/') ? targetUrl : `/proxy/ilmuchat/v1/chat/completions`;
        }

        this.model = config.model || import.meta.env.VITE_ILMUCHAT_MODEL || 'ilmu-preview';
    }

    /**
     * Initialize/Validate configuration
     */
    initialize() {
        if (!this.apiKey) {
            console.warn('[ILMUchat] No API Key found');
            return false;
        }
        return true;
    }

    /**
     * Update API key at runtime (for user-specific keys)
     * @param {string} newApiKey
     */
    setApiKey(newApiKey) {
        if (newApiKey && newApiKey !== this.apiKey) {
            this.apiKey = newApiKey;
            // API key updated
        }
    }

    // ============================================
    // PUBLIC METHODS
    // ============================================

    /**
     * Generate translations
     * @param {Array} items - {id, text, context}
     * @param {Object} options 
     */
    async generateBatch(items, options = {}) {
        this._validateConfig();

        const {
            sourceLanguage = 'en',
            targetLanguages = [],
            template,
            glossaryTerms = []
        } = options;

        // ILMUchat batch request started

        try {
            // 1. Build Prompts
            const systemPrompt = this._buildSystemPrompt(targetLanguages, glossaryTerms, sourceLanguage, template);
            const userPrompt = this._buildUserPrompt(items, targetLanguages);

            // 2. Execute API Call
            const responseData = await this._executeOpenAICompatible([
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ]);

            // 3. Parse Response
            const content = responseData.choices?.[0]?.message?.content || '';
            return this._parseBatchResponse(content, items, targetLanguages);

        } catch (error) {
            this._handleError(error);
        }
    }

    async testConnection() {
        if (!this.initialize()) return { success: false, message: 'API Key missing' };

        try {
            const data = await this._executeOpenAICompatible(
                [{ role: 'user', content: "Say 'OK'" }],
                10 // max_tokens
            );
            return { success: true, message: data.choices?.[0]?.message?.content || 'Connected' };
        } catch (e) {
            return { success: false, message: e.message };
        }
    }

    // ============================================
    // INTERNAL HELPERS
    // ============================================

    _validateConfig() {
        if (!this.initialize()) throw new Error('PROVIDER_NOT_CONFIGURED');
    }

    async _executeOpenAICompatible(messages, maxTokens = 4096) {
        const start = Date.now();

        console.log('[ILMUchat] Requesting:', this.endpoint, 'Key present:', !!this.apiKey, 'Key length:', this.apiKey?.length);

        const response = await fetch(this.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${this.apiKey}`
            },
            body: JSON.stringify({
                model: this.model,
                messages: messages,
                temperature: 0.3,
                max_tokens: maxTokens
            })
        });

        if (!response.ok) {
            const error = await response.json().catch(() => ({}));
            console.error('[ILMUchat] API Error:', response.status, error);

            if (response.status === 429) throw new Error('RATE_LIMIT');
            throw new Error(error.error?.message || `API Error: ${response.status}`);
        }

        const data = await response.json();
        const duration = Date.now() - start;
        // Response received

        return data;
    }

    _handleError(error) {
        console.error('[ILMUchat] Error:', error);
        throw error;
    }

    // --- Prompt Builders ---

    _buildSystemPrompt(targetLanguages, glossaryTerms, sourceLang, template) {
        const sourceLangName = getLangName(sourceLang);
        const targetLangNames = targetLanguages.map(l => getLangName(l)).join(', ');

        // Process Template
        if (!template?.prompt) {
            throw new Error('MISSING_TEMPLATE');
        }

        const instructions = template.prompt.replace(/\{\{targetLanguage\}\}/gi, targetLangNames);
        const glossarySection = this._buildGlossarySection(glossaryTerms);

        return `You are a professional translator.
Source Language: ${sourceLangName}
Target Languages: ${targetLangNames}

## Instructions
${instructions}
${glossarySection}

## Output Requirements
Return ONLY a valid JSON array with this exact structure:
[
  {
    "id": "row_id",
    "translations": {
      "${targetLanguages[0]}": { "text": "..." },
      "${targetLanguages[1] || 'lang2'}": { "text": "..." }
    }
  }
]

Rules:
- Return ONLY valid JSON (no markdown, no extra text)
- Include ALL target languages in each translation object`;
    }

    _buildUserPrompt(items, targetLanguages) {
        return `Translate the following items to ${targetLanguages.join(', ')}:

\`\`\`json
${JSON.stringify(items.map(i => ({ id: i.id, text: i.text, context: i.context })), null, 2)}
\`\`\``;
    }

    _buildGlossarySection(terms) {
        if (!terms || !terms.length) return '';
        return `
## Mandatory Glossary
Use these exact translations if the term appears:
${terms.map(t => `- ${t.english || t.term}: ${JSON.stringify(t.translations || {})}`).join('\n')}`;
    }

    // --- Response Parsers ---

    _parseBatchResponse(text, originalItems, targetLanguages) {
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
                        status: 'review'
                    };
                });

                return {
                    id: item.id,
                    translations
                };
            });
        } catch (e) {
            console.error('JSON Parse Error:', text);
            throw new Error('AI_RESPONSE_PARSE_FAILED');
        }
    }
}
