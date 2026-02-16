// services/firebase/templates.js
import { db } from '../../lib/firebase';
import {
    collection,
    doc,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    serverTimestamp,
    increment
} from 'firebase/firestore';

const COLLECTION = 'prompt_templates';

// ==========================================
// DEFAULT TEMPLATE DEFINITION
// ==========================================
export const DEFAULT_TEMPLATE = {
    name: "Default Template",
    description: "General-purpose translation template. Always used as the base for all translations.",
    prompt: `You are a professional translator. Translate the following text accurately while maintaining the original meaning and tone.

Guidelines:
- Preserve any placeholders like {name} or {{variable}}
- Keep formatting (line breaks, punctuation) consistent
- Use natural, fluent language in the target language
- For Malay: Use Malaysian Malay (not Indonesian)
- For Chinese: Use Simplified Chinese`,
    category: "default",
    tags: ["Default", "General"],
    author: "System",
    iconName: "FileText",
    iconColor: "text-slate-600 dark:text-slate-400",
    iconBg: "bg-slate-100 dark:bg-slate-900/50",
    color: "bg-slate-50 dark:bg-slate-950/30",
    isDefault: true,
    status: "published"
};

// ==========================================
// TEMPLATES CRUD
// ==========================================

export async function getTemplates() {
    try {
        const q = query(collection(db, COLLECTION), orderBy('createdAt', 'desc'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    } catch (error) {
        console.error('Error fetching templates:', error);
        return [];
    }
}

/**
 * Get or create the default template - ensures one always exists
 */
export async function getOrCreateDefaultTemplate() {
    try {
        const records = await getTemplates();
        const defaultTemplate = records.find(t => t.isDefault === true);

        if (defaultTemplate) {
            return defaultTemplate;
        }

        // No default template - create one
        // No default template - create one
        const docRef = await addDoc(collection(db, COLLECTION), {
            ...DEFAULT_TEMPLATE,
            createdAt: serverTimestamp()
        });

        return { id: docRef.id, ...DEFAULT_TEMPLATE };

    } catch (error) {
        console.error('Error getting/creating default template:', error);
        // Return the constant as fallback (won't be in DB but app can still work)
        return { ...DEFAULT_TEMPLATE, id: 'fallback-default' };
    }
}

export async function createTemplate(templateData) {
    try {
        const docRef = await addDoc(collection(db, COLLECTION), {
            ...templateData,
            status: templateData.status || 'draft',
            author: templateData.author || 'You',
            createdBy: templateData.createdBy || null,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            version: 1
        });
        return { id: docRef.id, ...templateData, version: 1 };
    } catch (error) {
        console.error('Error creating template:', error);
        throw error;
    }
}

export async function updateTemplate(id, updates) {
    try {
        const docRef = doc(db, COLLECTION, id);
        await updateDoc(docRef, {
            ...updates,
            updatedAt: serverTimestamp(),
            version: increment(1)
        });
    } catch (error) {
        console.error('Error updating template:', error);
        throw error;
    }
}

export async function deleteTemplate(id) {
    try {
        await deleteDoc(doc(db, COLLECTION, id));
    } catch (error) {
        console.error('Error deleting template:', error);
        throw error;
    }
}
