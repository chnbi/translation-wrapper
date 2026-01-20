/**
 * Audit Trail Service
 * Logs all user actions for compliance, peer review, and history tracking
 */

import { collection, addDoc, serverTimestamp, query, where, orderBy, getDocs, limit } from 'firebase/firestore'
import { db } from './client'

// Action types for consistency
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
}

/**
 * Log an action to the audit trail
 * 
 * @param {Object} user - Current user { uid, email }
 * @param {string} action - Action type from AUDIT_ACTIONS
 * @param {string} entityType - Type of entity: 'row', 'project', 'glossary', 'prompt'
 * @param {string} entityId - ID of the entity affected
 * @param {Object} options - Additional options
 * @param {string} options.projectId - Project ID for context
 * @param {Object} options.content - { before, after } for Option B actions
 * @param {Object} options.metadata - Any additional metadata
 */
export async function logAction(user, action, entityType, entityId, options = {}) {
    if (!user?.uid) {
        console.warn('[Audit] No user provided, skipping log')
        return null
    }

    try {
        const logEntry = {
            timestamp: serverTimestamp(),
            userId: user.uid,
            userEmail: user.email || 'unknown',
            action,
            entityType,
            entityId,
            projectId: options.projectId || null,
            content: options.content || null,
            metadata: options.metadata || null,
        }

        const docRef = await addDoc(collection(db, 'audit_logs'), logEntry)
        console.log(`[Audit] Logged: ${action} on ${entityType}/${entityId}`)
        return docRef.id

    } catch (error) {
        console.error('[Audit] Failed to log action:', error)
        return null
    }
}

/**
 * Get audit logs for a specific entity (row, project, etc.)
 * 
 * @param {string} entityType - Type of entity
 * @param {string} entityId - ID of the entity
 * @param {number} maxResults - Maximum number of results (default 50)
 */
export async function getEntityHistory(entityType, entityId, maxResults = 50) {
    try {
        const q = query(
            collection(db, 'audit_logs'),
            where('entityType', '==', entityType),
            where('entityId', '==', entityId),
            orderBy('timestamp', 'desc'),
            limit(maxResults)
        )

        const snapshot = await getDocs(q)
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate?.() || new Date()
        }))

    } catch (error) {
        console.error('[Audit] Failed to get entity history:', error)
        return []
    }
}

/**
 * Get recent activity for a project
 * 
 * @param {string} projectId - Project ID
 * @param {number} maxResults - Maximum number of results (default 20)
 */
export async function getProjectActivity(projectId, maxResults = 20) {
    try {
        const q = query(
            collection(db, 'audit_logs'),
            where('projectId', '==', projectId),
            orderBy('timestamp', 'desc'),
            limit(maxResults)
        )

        const snapshot = await getDocs(q)
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate?.() || new Date()
        }))

    } catch (error) {
        console.error('[Audit] Failed to get project activity:', error)
        return []
    }
}

/**
 * Get all audit logs (admin only)
 * 
 * @param {Object} filters - { projectId?, userId?, action? }
 * @param {number} maxResults - Maximum number of results (default 100)
 */
export async function getAllAuditLogs(filters = {}, maxResults = 100) {
    try {
        let q = query(
            collection(db, 'audit_logs'),
            orderBy('timestamp', 'desc'),
            limit(maxResults)
        )

        // Note: Firestore requires indexes for compound queries
        // For now, we filter client-side for simplicity
        const snapshot = await getDocs(q)
        let results = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            timestamp: doc.data().timestamp?.toDate?.() || new Date()
        }))

        // Client-side filtering
        if (filters.projectId) {
            results = results.filter(r => r.projectId === filters.projectId)
        }
        if (filters.userId) {
            results = results.filter(r => r.userId === filters.userId)
        }
        if (filters.action) {
            results = results.filter(r => r.action === filters.action)
        }

        return results

    } catch (error) {
        console.error('[Audit] Failed to get audit logs:', error)
        return []
    }
}

/**
 * Format action for display
 */
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
    }
    return labels[action] || action
}

/**
 * Format relative time (e.g., "2 hours ago")
 */
export function formatRelativeTime(date) {
    const now = new Date()
    const diff = now - date
    const minutes = Math.floor(diff / 60000)
    const hours = Math.floor(diff / 3600000)
    const days = Math.floor(diff / 86400000)

    if (minutes < 1) return 'just now'
    if (minutes < 60) return `${minutes}m ago`
    if (hours < 24) return `${hours}h ago`
    if (days < 7) return `${days}d ago`
    return date.toLocaleDateString()
}
