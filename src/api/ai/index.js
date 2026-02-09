/**
 * AI Service Factory
 * Returns the configured AI Provider based on environment variables or explicit selection
 */
import { GeminiProvider } from "./providers/gemini";
import { ILMUchatProvider } from "./providers/ilmuchat";

// Available providers registry
const PROVIDERS = {
    gemini: GeminiProvider,
    ilmuchat: ILMUchatProvider,
};

// Get default provider from env
const DEFAULT_PROVIDER = import.meta.env.VITE_DEFAULT_AI_PROVIDER || 'gemini';

/**
 * AI Service Singleton Manager
 * Supports switching providers at runtime
 */
export const AIService = (() => {
    let instances = {};
    let currentProvider = DEFAULT_PROVIDER;

    const createInstance = (providerName) => {
        const Provider = PROVIDERS[providerName];
        if (!Provider) {
            console.warn(`[AIService] Unknown provider: ${providerName}, falling back to gemini`);
            return new GeminiProvider();
        }
        return new Provider();
    };

    return {
        /**
         * Get AI provider instance
         * @param {string} providerName - Optional provider name, uses default if not specified
         */
        getInstance: (providerName) => {
            const name = providerName || currentProvider;
            if (!instances[name]) {
                instances[name] = createInstance(name);
            }
            return instances[name];
        },

        /**
         * Set the current active provider
         * @param {string} providerName 
         */
        setProvider: (providerName) => {
            if (PROVIDERS[providerName]) {
                currentProvider = providerName;
                // Provider switched
            }
        },

        /**
         * Get current provider name
         */
        getCurrentProvider: () => currentProvider,

        /**
         * Get list of available providers
         */
        getAvailableProviders: () => Object.keys(PROVIDERS),

        /**
         * Clear cached instances (useful for testing)
         */
        clearInstances: () => {
            instances = {};
        },

        /**
         * Apply user-specific API key to the current provider
         * Should be called before making translation requests
         * @param {string} userId - Firebase Auth UID
         */
        applyUserApiKey: async (userId) => {
            if (!userId) return;

            try {
                const { getEffectiveApiKey } = await import('@/api/firebase/apiKeys');
                const key = await getEffectiveApiKey(userId, currentProvider);

                if (key) {
                    const instance = instances[currentProvider];
                    if (instance && typeof instance.setApiKey === 'function') {
                        instance.setApiKey(key);
                    }
                }
            } catch (error) {
                console.warn('Could not apply user API key:', error.message);
            }
        }
    };
})();

// Convenience export for direct usage
export const getAI = (providerName) => AIService.getInstance(providerName);

// Export available providers list for UI
export const AI_PROVIDERS = [
    { id: 'gemini', label: 'Google Gemini', icon: '🧠' },
    { id: 'ilmuchat', label: 'ILMUchat (YTL)', icon: '💬' },
];
