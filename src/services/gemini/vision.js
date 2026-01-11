// Gemini Vision Service for OCR and Image Text Extraction
// Uses Gemini 2.0's multimodal capabilities

import { GoogleGenAI } from "@google/genai";
import { getModel } from "./text";

// Initialize the client
const getClient = () => {
    const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
    if (!apiKey) {
        console.warn('VITE_GEMINI_API_KEY not found in .env file.');
        return null;
    }
    return new GoogleGenAI({ apiKey });
};

/**
 * Convert file to base64 for Gemini API
 * @param {File} file - The image file
 * @returns {Promise<{data: string, mimeType: string}>}
 */
async function fileToBase64(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => {
            // Extract base64 data (remove the data:image/xxx;base64, prefix)
            const base64 = reader.result.split(',')[1];
            resolve({
                data: base64,
                mimeType: file.type
            });
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
    });
}

/**
 * Extract text from an image using Gemini Vision
 * @param {File} imageFile - The image file to extract text from
 * @returns {Promise<Array<{id: number, text: string, en: string}>>} - Extracted text lines
 */
export async function extractTextFromImage(imageFile) {
    const ai = getClient();
    if (!ai) {
        throw new Error('API_NOT_CONFIGURED');
    }

    console.log('🔍 [Gemini Vision] Extracting text from image:', imageFile.name);

    try {
        // Convert image to base64
        const imageData = await fileToBase64(imageFile);

        const prompt = `You are an OCR expert. Extract ALL text from this image.

## Instructions:
1. Identify every piece of text visible in the image
2. Extract each distinct text element as a separate line
3. Preserve the original text exactly as it appears
4. Include headings, body text, buttons, labels, etc.
5. Order the text from top to bottom, left to right

## Output Format:
Return a JSON array where each item has:
- "id": A sequential number starting from 1
- "text": The extracted text exactly as it appears in the image

Example:
\`\`\`json
[
  {"id": 1, "text": "Welcome to our service"},
  {"id": 2, "text": "Get started today"},
  {"id": 3, "text": "Sign Up"}
]
\`\`\`

IMPORTANT: 
- Return ONLY the JSON array, no other text
- If no text is found, return an empty array []
- Preserve line breaks within text as \\n`;

        const response = await ai.models.generateContent({
            model: getModel(),
            contents: [
                {
                    parts: [
                        { text: prompt },
                        {
                            inlineData: {
                                mimeType: imageData.mimeType,
                                data: imageData.data
                            }
                        }
                    ]
                }
            ]
        });

        const text = response.text;
        console.log('✅ [Gemini Vision] Response received');

        // Parse the JSON response
        const lines = parseOCRResponse(text);
        console.log('📦 [Gemini Vision] Extracted', lines.length, 'text lines');

        return lines;

    } catch (error) {
        console.error('❌ [Gemini Vision] Error:', error);
        throw error;
    }
}

/**
 * Parse the OCR response from Gemini
 */
function parseOCRResponse(responseText) {
    try {
        // Extract JSON from response (handle markdown code blocks)
        let jsonStr = responseText;

        // Remove markdown code blocks if present
        const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
            jsonStr = jsonMatch[1];
        }

        const parsed = JSON.parse(jsonStr.trim());

        // Ensure each line has the expected format
        return parsed.map((item, index) => ({
            id: item.id || index + 1,
            text: item.text || '',
            en: item.text || '', // Use extracted text as English source
            my: '',
            zh: ''
        }));

    } catch (error) {
        console.error('Failed to parse OCR response:', error);
        console.error('Raw response:', responseText);
        return [];
    }
}

/**
 * Extract text and translate in one step
 * @param {File} imageFile - The image file
 * @param {Array} targetLanguages - Target language codes ['my', 'zh']
 * @param {Array} glossaryTerms - Glossary terms to apply
 * @returns {Promise<Array>} - Extracted and translated text lines
 */
export async function extractAndTranslate(imageFile, targetLanguages = ['my', 'zh'], glossaryTerms = []) {
    const ai = getClient();
    if (!ai) {
        throw new Error('API_NOT_CONFIGURED');
    }

    console.log('🔍 [Gemini Vision] Extracting and translating from image:', imageFile.name);

    try {
        const imageData = await fileToBase64(imageFile);

        // Build glossary section
        let glossarySection = '';
        if (glossaryTerms.length > 0) {
            const lines = glossaryTerms.map(term => {
                const translations = targetLanguages.map(lang => {
                    const langName = lang === 'my' ? 'Malay' : 'Chinese';
                    const value = lang === 'my' ? term.malay : term.chinese;
                    return value ? `${langName}: "${value}"` : null;
                }).filter(Boolean).join(', ');
                return `- "${term.english}" → ${translations}`;
            });
            glossarySection = `\n\n## Glossary (Use these exact translations):\n${lines.join('\n')}`;
        }

        const prompt = `You are an OCR and translation expert. Extract ALL text from this image and translate each line to Malay and Chinese.

## Instructions:
1. Identify every piece of text visible in the image
2. Extract each distinct text element as a separate line  
3. Translate each line to Bahasa Malaysia (Malaysian Malay, not Indonesian) and Simplified Chinese
4. Preserve any placeholders like {name} or {{variable}}
${glossarySection}

## Output Format:
Return a JSON array where each item has:
- "id": A sequential number starting from 1
- "en": The original English text from the image
- "my": Malay translation
- "zh": Chinese translation

Example:
\`\`\`json
[
  {"id": 1, "en": "Welcome", "my": "Selamat datang", "zh": "欢迎"},
  {"id": 2, "en": "Sign Up", "my": "Daftar", "zh": "注册"}
]
\`\`\`

IMPORTANT: Return ONLY the JSON array, no other text.`;

        const response = await ai.models.generateContent({
            model: getModel(),
            contents: [
                {
                    parts: [
                        { text: prompt },
                        {
                            inlineData: {
                                mimeType: imageData.mimeType,
                                data: imageData.data
                            }
                        }
                    ]
                }
            ]
        });

        const text = response.text;
        const lines = parseExtractAndTranslateResponse(text);
        console.log('📦 [Gemini Vision] Extracted and translated', lines.length, 'lines');

        return lines;

    } catch (error) {
        console.error('❌ [Gemini Vision] Error:', error);
        throw error;
    }
}

/**
 * Parse the extract+translate response
 */
function parseExtractAndTranslateResponse(responseText) {
    try {
        let jsonStr = responseText;
        const jsonMatch = responseText.match(/```(?:json)?\s*([\s\S]*?)```/);
        if (jsonMatch) {
            jsonStr = jsonMatch[1];
        }

        const parsed = JSON.parse(jsonStr.trim());

        return parsed.map((item, index) => ({
            id: item.id || index + 1,
            text: item.en || '',
            en: item.en || '',
            my: item.my || '',
            zh: item.zh || '',
            translated: !!(item.my || item.zh)
        }));

    } catch (error) {
        console.error('Failed to parse response:', error);
        return [];
    }
}

/**
 * Check if Vision API is available
 */
export function isVisionAvailable() {
    return !!import.meta.env.VITE_GEMINI_API_KEY;
}
