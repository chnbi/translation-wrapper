/**
 * Firebase Cloud Functions - Secure Gemini API Proxy
 * 
 * This function proxies translation requests to Google's Gemini API,
 * keeping the API key secure on the server side.
 */

const { onCall, HttpsError } = require("firebase-functions/v2/https");
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini with server-side API key
// Set this in Firebase: firebase functions:secrets:set GEMINI_API_KEY
const getGeminiClient = () => {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        throw new HttpsError("failed-precondition", "Gemini API key not configured");
    }
    return new GoogleGenerativeAI(apiKey);
};

/**
 * Translate a batch of text entries
 * 
 * @param {Object} data - { rows: [{id, en}], template: {prompt}, options: {targetLanguages, glossaryTerms} }
 * @returns {Object} - { results: [{id, my, zh, status}] }
 */
exports.translateBatch = onCall(
    {
        secrets: ["GEMINI_API_KEY"],
        cors: true,
        maxInstances: 10,
    },
    async (request) => {
        // Verify user is authenticated
        if (!request.auth) {
            throw new HttpsError("unauthenticated", "User must be logged in");
        }

        const { rows, template, options = {} } = request.data;

        // Validate input
        if (!rows || !Array.isArray(rows) || rows.length === 0) {
            throw new HttpsError("invalid-argument", "Rows array is required");
        }

        if (rows.length > 50) {
            throw new HttpsError("invalid-argument", "Maximum 50 rows per batch");
        }

        try {
            const genAI = getGeminiClient();
            const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

            const targetLanguages = options.targetLanguages || ["my", "zh"];
            const glossaryTerms = options.glossaryTerms || [];

            // Build the prompt
            const systemPrompt = buildSystemPrompt(template, glossaryTerms, targetLanguages);
            const userPrompt = buildUserPrompt(rows);

            const result = await model.generateContent([systemPrompt, userPrompt]);
            const responseText = result.response.text();

            // Parse the response
            const translations = parseTranslationResponse(responseText, rows);

            return {
                results: translations,
                usage: {
                    rowCount: rows.length,
                    timestamp: new Date().toISOString(),
                }
            };

        } catch (error) {
            console.error("Translation error:", error);

            if (error.message?.includes("429") || error.message?.includes("quota")) {
                throw new HttpsError("resource-exhausted", "API rate limit reached. Please wait.");
            }

            throw new HttpsError("internal", "Translation failed: " + error.message);
        }
    }
);

/**
 * Build system prompt with template and glossary
 */
function buildSystemPrompt(template, glossaryTerms, targetLanguages) {
    const langNames = {
        my: "Bahasa Malaysia",
        zh: "Simplified Chinese (中文)"
    };

    const targetLangList = targetLanguages.map(l => langNames[l] || l).join(" and ");

    let prompt = `You are a professional translator. Translate the following English texts into ${targetLangList}.

IMPORTANT RULES:
1. Maintain the original meaning and tone
2. Use natural, fluent language appropriate for the target audience
3. Preserve any technical terms, brand names, or proper nouns
4. Return translations in valid JSON format`;

    // Add custom template instructions
    if (template?.prompt) {
        prompt += `\n\n## Additional Instructions:\n${template.prompt}`;
    }

    // Add glossary terms
    if (glossaryTerms.length > 0) {
        prompt += `\n\n## Mandatory Glossary (Use these exact translations):`;
        glossaryTerms.slice(0, 50).forEach(term => {
            prompt += `\n- "${term.english}" → MY: "${term.malay}", ZH: "${term.chinese}"`;
        });
    }

    prompt += `\n\nRespond ONLY with a JSON array in this exact format:
[
  {"id": "row_id", "my": "Malay translation", "zh": "Chinese translation"},
  ...
]`;

    return prompt;
}

/**
 * Build user prompt with rows to translate
 */
function buildUserPrompt(rows) {
    const entries = rows.map(r => `- ID: "${r.id}" | Text: "${r.en}"`).join("\n");
    return `Translate these texts:\n${entries}`;
}

/**
 * Parse Gemini response into structured translations
 */
function parseTranslationResponse(responseText, originalRows) {
    try {
        // Extract JSON from response
        const jsonMatch = responseText.match(/\[[\s\S]*\]/);
        if (!jsonMatch) {
            throw new Error("No JSON array found in response");
        }

        const parsed = JSON.parse(jsonMatch[0]);

        // Map back to original row IDs
        return originalRows.map(row => {
            const translation = parsed.find(p => p.id === row.id);
            return {
                id: row.id,
                my: translation?.my || "",
                zh: translation?.zh || "",
                status: translation ? "success" : "error"
            };
        });

    } catch (error) {
        console.error("Parse error:", error);
        // Return empty translations on parse failure
        return originalRows.map(row => ({
            id: row.id,
            my: "",
            zh: "",
            status: "error"
        }));
    }
}
