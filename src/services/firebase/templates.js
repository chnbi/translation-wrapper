// services/firebase/templates.js - Prompt template CRUD operations
import {
    db,
    collection,
    doc,
    getDocs,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    serverTimestamp
} from './config'
import { defaultPromptTemplates } from '@/data/defaults'

export async function getTemplates() {
    try {
        const q = query(collection(db, 'templates'), orderBy('createdAt', 'desc'))
        const snapshot = await getDocs(q)
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }))
    } catch (error) {
        console.error('Error fetching templates:', error)
        return []
    }
}

export async function createTemplate(templateData) {
    try {
        const docRef = await addDoc(collection(db, 'templates'), {
            ...templateData,
            createdAt: serverTimestamp(),
            lastModified: serverTimestamp()
        })
        console.log('✅ [Firestore] Template created:', docRef.id)
        return { id: docRef.id, ...templateData }
    } catch (error) {
        console.error('Error creating template:', error)
        throw error
    }
}

export async function updateTemplate(templateId, updates) {
    try {
        const docRef = doc(db, 'templates', templateId)
        await updateDoc(docRef, {
            ...updates,
            lastModified: serverTimestamp()
        })
        console.log('✅ [Firestore] Template updated:', templateId)
    } catch (error) {
        console.error('Error updating template:', error)
        throw error
    }
}

export async function deleteTemplate(templateId) {
    try {
        await deleteDoc(doc(db, 'templates', templateId))
        console.log('✅ [Firestore] Template deleted:', templateId)
    } catch (error) {
        console.error('Error deleting template:', error)
        throw error
    }
}

// Seeding flag to prevent race conditions (React StrictMode runs effects twice)
let isSeedingTemplates = false

export async function seedDefaultTemplates() {
    // Prevent concurrent seeding (race condition from StrictMode)
    if (isSeedingTemplates) {
        console.log('⏳ [Firestore] Seeding already in progress, skipping...')
        return
    }

    const existing = await getTemplates()
    if (existing.length > 0) return

    isSeedingTemplates = true
    console.log('📦 [Firestore] Seeding default templates...')

    try {
        for (const template of defaultPromptTemplates) {
            await createTemplate(template)
        }
        console.log('✅ [Firestore] Seeded default templates')
    } finally {
        isSeedingTemplates = false
    }
}
