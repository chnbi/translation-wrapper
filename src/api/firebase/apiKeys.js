/**
 * API Key Management Service
 * Stores and retrieves user-specific AI provider API keys from Firestore
 */
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// Cache for current user's keys (avoid repeated Firestore reads)
let cachedKeys = null;
let cachedUserId = null;

/**
 * Get API keys for a user
 * @param {string} userId - Firebase Auth UID
 * @returns {Object} { gemini: string|null, ilmuchat: string|null }
 */
export async function getUserApiKeys(userId) {
    if (cachedUserId === userId && cachedKeys) {
        return cachedKeys;
    }

    try {
        const docRef = doc(db, 'users', userId, 'settings', 'apiKeys');
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
            cachedKeys = docSnap.data();
            cachedUserId = userId;
            return cachedKeys;
        }

        return { gemini: null, ilmuchat: null };
    } catch (error) {
        console.error('Error fetching API keys:', error);
        return { gemini: null, ilmuchat: null };
    }
}

/**
 * Save API keys for a user
 * @param {string} userId - Firebase Auth UID
 * @param {Object} keys - { gemini?: string, ilmuchat?: string }
 */
export async function saveUserApiKeys(userId, keys) {
    try {
        const docRef = doc(db, 'users', userId, 'settings', 'apiKeys');

        // Merge with existing keys
        const existing = await getUserApiKeys(userId);
        const updatedKeys = {
            ...existing,
            ...keys,
            updatedAt: serverTimestamp()
        };

        await setDoc(docRef, updatedKeys, { merge: true });

        // Update cache
        cachedKeys = updatedKeys;
        cachedUserId = userId;


        return true;
    } catch (error) {
        throw error;
    }
}



/**
 * Get the effective API key for a provider
 * Priority: User key (Firestore) > Environment variable
 * @param {string} userId - Optional user ID
 * @param {string} provider - 'gemini' or 'ilmuchat'
 */
export async function getEffectiveApiKey(userId, provider) {
    // First, try user-specific key
    if (userId) {
        const userKeys = await getUserApiKeys(userId);
        if (userKeys[provider]) {
            return userKeys[provider];
        }
    }

    // Fallback to environment variable
    const envKeys = {
        gemini: null, // Removed for production
        ilmuchat: import.meta.env.VITE_ILMUCHAT_API_KEY
    };

    return envKeys[provider] || null;
}
