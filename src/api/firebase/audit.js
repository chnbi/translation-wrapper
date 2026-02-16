// services/firebase/audit.js
import { db } from '../../lib/firebase';
import {
    collection,
    addDoc,
    getDocs,
    query,
    where,
    orderBy,
    serverTimestamp
} from 'firebase/firestore';

const COLLECTION = 'audit_logs';

export const AUDIT_ACTIONS = {
    // Translations
    TRANSLATED_AI: 'TRANSLATED_AI',
    TRANSLATED_MANUAL: 'TRANSLATED_MANUAL',
    EDITED: 'EDITED',

    // Workflow
    SENT_FOR_REVIEW: 'SENT_FOR_REVIEW',
    APPROVED: 'APPROVED',
    REJECTED: 'REJECTED',

    // Projects
    PROJECT_CREATED: 'PROJECT_CREATED',
    PROJECT_DELETED: 'PROJECT_DELETED',
    PAGE_ADDED: 'PAGE_ADDED',
    PAGE_DELETED: 'PAGE_DELETED',
    ROWS_IMPORTED: 'ROWS_IMPORTED',
    ROWS_EXPORTED: 'ROWS_EXPORTED',

    // Glossary
    GLOSSARY_ADDED: 'GLOSSARY_ADDED',
    GLOSSARY_EDITED: 'GLOSSARY_EDITED',
    GLOSSARY_DELETED: 'GLOSSARY_DELETED',

    // Prompts
    PROMPT_CREATED: 'PROMPT_CREATED',
    PROMPT_EDITED: 'PROMPT_EDITED',
    PROMPT_PUBLISHED: 'PROMPT_PUBLISHED',
};

/**
 * Log an action to the audit trail
 */
export async function logAction(user, action, entityType, entityId, options = {}) {
    if (!user?.id && !user?.uid) {
        return null;
    }

    try {
        const docRef = await addDoc(collection(db, COLLECTION), {
            userId: user.id || user.uid,
            userEmail: user.email || 'unknown',
            action,
            entityType,
            entityId,
            projectId: options.projectId || '',
            content: options.content || null,
            metadata: options.metadata || null,
            created: serverTimestamp(), // PB uses 'created', we use 'created' or 'createdAt'
            createdAt: serverTimestamp()
        });
        return docRef.id;
    } catch (error) {
        return null;
    }
}



/**
 * Get all audit logs (admin only)
 */
export async function getAllAuditLogs(filters = {}, maxResults = 100) {
    try {
        let constraints = [orderBy('createdAt', 'desc')];

        if (filters.projectId) constraints.push(where('projectId', '==', filters.projectId));
        if (filters.userId) constraints.push(where('userId', '==', filters.userId));
        if (filters.action) constraints.push(where('action', '==', filters.action));

        const q = query(collection(db, COLLECTION), ...constraints);
        const snapshot = await getDocs(q);

        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().createdAt?.toDate() || new Date()
        }));
    } catch (error) {
        return [];
    }
}

export function formatAction(action) {
    const labels = {
        TRANSLATED_AI: 'AI translated',
        TRANSLATED_MANUAL: 'Manually translated',
        EDITED: 'Edited',
        SENT_FOR_REVIEW: 'Sent for review',
        APPROVED: 'Approved',
        REJECTED: 'Rejected',
        PROJECT_CREATED: 'Created project',
        PROJECT_DELETED: 'Deleted project',
        PAGE_ADDED: 'Added page',
        PAGE_DELETED: 'Deleted page',
        ROWS_IMPORTED: 'Imported rows',
        ROWS_EXPORTED: 'Exported rows',
        GLOSSARY_ADDED: 'Added term',
        GLOSSARY_EDITED: 'Edited term',
        GLOSSARY_DELETED: 'Deleted term',
        PROMPT_CREATED: 'Created prompt',
        PROMPT_EDITED: 'Edited prompt',
        PROMPT_PUBLISHED: 'Published prompt',
    };
    return labels[action] || action;
}

export function formatRelativeTime(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
}
