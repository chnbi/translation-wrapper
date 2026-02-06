
import { GeminiProvider } from "./providers/gemini";

/**
 * AI Service Factory
 * Returns the configured AI Provider based on environment variables
 */
export const AIService = (() => {
    let instance = null;

    const createInstance = () => {
        // Future: Switch on import.meta.env.VITE_AI_PROVIDER
        return new GeminiProvider();
    };

    return {
        getInstance: () => {
            if (!instance) {
                instance = createInstance();
            }
            return instance;
        }
    };
})();

// Convenience export for direct usage
export const getAI = () => AIService.getInstance();
