// services/firebase/glossary.js - Glossary term CRUD operations
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
    serverTimestamp,
    writeBatch
} from './config'
import { defaultGlossaryTerms } from '@/data/defaults'

export async function getGlossaryTerms() {
    try {
        const q = query(collection(db, 'glossary'), orderBy('term', 'asc'))
        const snapshot = await getDocs(q)
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }))
    } catch (error) {
        console.error('Error fetching glossary terms:', error)
        return []
    }
}

/**
 * Get only approved glossary terms for use in translation API
 * Terms must have status === 'approved' to be included
 * @returns {Promise<Array>} Array of approved glossary terms
 */
export async function getApprovedGlossaryTerms() {
    try {
        const q = query(collection(db, 'glossary'), orderBy('term', 'asc'))
        const snapshot = await getDocs(q)
        const allTerms = snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }))
        // Filter for approved terms only
        const approvedTerms = allTerms.filter(term => term.status === 'approved')
        console.log(`📚 [Glossary] Fetched ${approvedTerms.length} approved terms (${allTerms.length} total)`)
        return approvedTerms
    } catch (error) {
        console.error('Error fetching approved glossary terms:', error)
        return []
    }
}

export async function createGlossaryTerm(termData) {
    try {
        const docRef = await addDoc(collection(db, 'glossary'), {
            ...termData,
            createdAt: serverTimestamp(),
            lastModified: serverTimestamp()
        })
        console.log('✅ [Firestore] Glossary term created:', docRef.id)
        return { id: docRef.id, ...termData }
    } catch (error) {
        console.error('Error creating glossary term:', error)
        throw error
    }
}

// Batch create multiple glossary terms (for Excel import)
export async function createGlossaryTerms(termsData) {
    try {
        const batch = writeBatch(db)
        const createdTerms = []

        termsData.forEach(termData => {
            const docRef = doc(collection(db, 'glossary'))
            batch.set(docRef, {
                ...termData,
                createdAt: serverTimestamp(),
                lastModified: serverTimestamp()
            })
            createdTerms.push({ id: docRef.id, ...termData })
        })

        await batch.commit()
        console.log('✅ [Firestore] Created', termsData.length, 'glossary terms')
        return createdTerms
    } catch (error) {
        console.error('Error creating glossary terms:', error)
        throw error
    }
}

export async function updateGlossaryTerm(termId, updates) {
    try {
        const docRef = doc(db, 'glossary', termId)
        await updateDoc(docRef, {
            ...updates,
            lastModified: serverTimestamp()
        })
        console.log('✅ [Firestore] Glossary term updated:', termId)
    } catch (error) {
        console.error('Error updating glossary term:', error)
        throw error
    }
}

export async function deleteGlossaryTerm(termId) {
    try {
        await deleteDoc(doc(db, 'glossary', termId))
        console.log('✅ [Firestore] Glossary term deleted:', termId)
    } catch (error) {
        console.error('Error deleting glossary term:', error)
        throw error
    }
}

export async function deleteGlossaryTerms(termIds) {
    try {
        const batch = writeBatch(db)
        termIds.forEach(id => {
            batch.delete(doc(db, 'glossary', id))
        })
        await batch.commit()
        console.log('✅ [Firestore] Deleted', termIds.length, 'glossary terms')
    } catch (error) {
        console.error('Error deleting glossary terms:', error)
        throw error
    }
}
// Seeding flag to prevent race conditions (React StrictMode runs effects twice)
let isSeedingGlossary = false

export async function seedDefaultGlossary() {
    // Prevent concurrent seeding (race condition from StrictMode)
    if (isSeedingGlossary) {
        console.log('⏳ [Firestore] Glossary seeding already in progress, skipping...')
        return
    }

    const existing = await getGlossaryTerms()
    if (existing.length > 0) return

    isSeedingGlossary = true
    console.log('📦 [Firestore] Seeding default glossary terms...')

    try {
        for (const term of defaultGlossaryTerms) {
            await createGlossaryTerm(term)
        }
        console.log('✅ [Firestore] Seeded default glossary terms')
    } finally {
        isSeedingGlossary = false
    }
}

// ==========================================
// CATEGORIES
// ==========================================

export async function getGlossaryCategories() {
    try {
        const q = query(collection(db, 'glossary_categories'), orderBy('name', 'asc'))
        const snapshot = await getDocs(q)
        return snapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
        }))
    } catch (error) {
        console.error('Error fetching categories:', error)
        return []
    }
}

export async function createGlossaryCategory(categoryData) {
    try {
        const docRef = await addDoc(collection(db, 'glossary_categories'), {
            ...categoryData,
            createdAt: serverTimestamp()
        })
        return { id: docRef.id, ...categoryData }
    } catch (error) {
        console.error('Error creating category:', error)
        throw error
    }
}

export async function deleteGlossaryCategory(id) {
    try {
        await deleteDoc(doc(db, 'glossary_categories', id))
    } catch (error) {
        console.error('Error deleting category:', error)
        throw error
    }
}
