/**
 * Base AI Provider Interface
 * All AI service implementations must extend this class
 */
export class BaseAIProvider {
    constructor(config = {}) {
        this.config = config;
    }

    /**
     * Initialize the client (optional)
     */
    initialize() {
        // Override to setup client
    }

    /**
     * Generate translations for a batch of items
     * @param {Array} items - Array of {id, text, context}
     * @param {Object} options - { sourceLanguage, targetLanguages, template, glossaryTerms }
     * @returns {Promise<Array>} - Array of {id, translations: { [lang]: { text, status } }}
     */
    async generateBatch(items, options) {
        throw new Error('generateBatch() must be implemented by provider');
    }

    /**
     * Test the connection to the provider
     * @returns {Promise<{success: boolean, message: string}>}
     */
    async testConnection() {
        throw new Error('testConnection() must be implemented by provider');
    }
}
