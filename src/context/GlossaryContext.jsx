// GlossaryContext - Centralized state management for glossary terms
// Now with PocketBase persistence and Audit Trail
import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import * as dbService from '@/api/pocketbase'
import { logAction, AUDIT_ACTIONS } from '@/api/pocketbase'
import { toast } from "sonner"

// Safe auth hook - returns null user if auth context not ready
function useSafeAuth() {
    try {
        // Dynamic import to avoid circular dependency
        const { useAuth } = require('@/App')
        const auth = useAuth()
        return auth || { user: null }
    } catch {
        return { user: null }
    }
}

// Feature flag - set to true to use Firestore


const GlossaryContext = createContext(null)

export function GlossaryProvider({ children }) {
    const { user } = useSafeAuth()
    const [terms, setTerms] = useState([])
    const [categories, setCategories] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [dataSource, setDataSource] = useState('loading')

    // Load glossary terms from Firestore on mount
    useEffect(() => {
        async function loadData() {
            try {
                console.log('🔄 [PocketBase] Loading glossary terms...')
                const firestoreTerms = await dbService.getGlossaryTerms()

                // Load categories
                const firestoreCategories = await dbService.getGlossaryCategories()
                const finalCategories = firestoreCategories.length > 0
                    ? firestoreCategories
                    : [] // No fallback categories

                setTerms(firestoreTerms)
                setCategories(finalCategories)
                setDataSource('firestore')
                console.log('✅ [PocketBase] Loaded', firestoreTerms.length, 'glossary terms')
            } catch (error) {
                console.error('❌ [PocketBase] Error loading glossary:', error)
                toast.error("Failed to load glossary")
                setDataSource('error')
            } finally {
                setIsLoading(false)
            }
        }

        loadData()
    }, [])

    // Add a new term (with PocketBase sync)
    const addTerm = useCallback(async (term) => {
        // Only pass valid PocketBase fields
        const termData = {
            en: term.en || term.english || '',
            my: term.my || term.malay || '',
            cn: term.cn || term.chinese || '',
            category: term.category || 'General',
            remark: term.remark || '',
            status: term.status || 'draft'
        }

        try {
            const created = await dbService.createGlossaryTerm(termData)
            setTerms(prev => [created, ...prev])

            // Audit log
            await logAction(user, AUDIT_ACTIONS.GLOSSARY_ADDED, 'glossary', created.id, {
                content: { after: created }
            })

            return created
        } catch (error) {
            console.error('Error creating glossary term:', error)
            toast.error("Failed to create term")
            throw error
        }
    }, [])

    // Batch add terms
    const addTerms = useCallback(async (newTerms) => {
        // PocketBase auto-generates created/updated timestamps
        // Only pass valid fields: en, my, cn, category, remark, status
        const termDataArray = newTerms.map(term => ({
            en: term.en || '',
            my: term.my || '',
            cn: term.cn || '',
            category: term.category || 'General',
            remark: term.remark || '',
            status: term.status || 'draft'
        }))

        try {
            const createdTerms = await dbService.createGlossaryTerms(termDataArray)
            setTerms(prev => [...createdTerms, ...prev])
            return createdTerms
        } catch (error) {
            console.error('Error creating glossary terms:', error)
            toast.error("Failed to import terms")
            throw error
        }
    }, [])

    // Update a term (with Firestore sync)
    const updateTerm = useCallback(async (id, updates) => {
        const existingTerm = terms.find(t => t.id === id)
        try {
            // Logic: If editing content on Approved term, revert to Draft
            const isContentEdit = Object.keys(updates).some(k => ['en', 'english', 'my', 'malay', 'cn', 'chinese', 'category', 'remark'].includes(k))
            const isStatusChange = 'status' in updates
            const isApproved = existingTerm.status === 'approved' || existingTerm.status === 'published'

            let finalUpdates = { ...updates }
            if (isContentEdit && !isStatusChange && isApproved) {
                finalUpdates.status = 'draft'
            }

            await dbService.updateGlossaryTerm(id, finalUpdates)
            const updatedTerm = {
                ...existingTerm,
                ...finalUpdates,
                dateModified: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
            }
            setTerms(prev => prev.map(t => t.id === id ? updatedTerm : t))

            // Audit log
            await logAction(user, AUDIT_ACTIONS.GLOSSARY_EDITED, 'glossary', id, {
                content: { before: existingTerm, after: updatedTerm }
            })
        } catch (error) {
            console.error("Failed to update term", error)
            toast.error("Failed to update term")
        }
    }, [terms, user])

    // Delete a term (with Firestore sync)
    const deleteTerm = useCallback(async (id) => {
        const existingTerm = terms.find(t => t.id === id)
        try {
            await dbService.deleteGlossaryTerm(id)
            setTerms(prev => prev.filter(t => t.id !== id))

            // Audit log
            await logAction(user, AUDIT_ACTIONS.GLOSSARY_DELETED, 'glossary', id, {
                content: { before: existingTerm }
            })
        } catch (error) {
            console.error("Failed to delete term", error)
            toast.error("Failed to delete term")
        }
    }, [terms, user])

    // Bulk delete (with Firestore sync)
    const deleteTerms = useCallback(async (ids) => {
        try {
            await dbService.deleteGlossaryTerms(ids)
            setTerms(prev => prev.filter(t => !ids.includes(t.id)))
        } catch (error) {
            console.error("Failed to delete terms", error)
            toast.error("Failed to delete terms")
        }
    }, [])

    // Add Category
    const addCategory = useCallback(async (categoryData) => {
        try {
            const newCat = await dbService.createGlossaryCategory(categoryData)
            setCategories(prev => [...prev, newCat])
            return newCat
        } catch (error) {
            console.error("Failed to add category", error)
            toast.error("Failed to add category")
            throw error
        }
    }, [])

    // Delete Category
    const deleteCategory = useCallback(async (id) => {
        try {
            await dbService.deleteGlossaryCategory(id)
            setCategories(prev => prev.filter(c => c.id !== id))
        } catch (error) {
            console.error("Failed to delete category", error)
            toast.error("Failed to delete category")
            throw error
        }
    }, [])

    // Get term by ID
    const getTerm = useCallback((id) => {
        return terms.find(t => t.id === id)
    }, [terms])



    const value = {
        terms,
        isLoading,
        dataSource,
        addTerm,
        addTerms,
        updateTerm,
        deleteTerm,
        deleteTerms,
        getTerm,
        categories,
        addCategory,
        deleteCategory,
    }

    return (
        <GlossaryContext.Provider value={value}>
            {children}
        </GlossaryContext.Provider>
    )
}

export function useGlossary() {
    const context = useContext(GlossaryContext)
    if (!context) {
        throw new Error('useGlossary must be used within a GlossaryProvider')
    }
    return context
}
