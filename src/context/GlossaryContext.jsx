// GlossaryContext - Centralized state management for glossary terms
// Now with Firestore persistence
import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import * as firestoreService from '@/lib/firestore-service'
import { toast } from "sonner"

// Feature flag - set to true to use Firestore


const GlossaryContext = createContext(null)

export function GlossaryProvider({ children }) {
    const [terms, setTerms] = useState([])
    const [categories, setCategories] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [dataSource, setDataSource] = useState('loading')

    // Load glossary terms from Firestore on mount
    useEffect(() => {
        async function loadData() {
            try {
                console.log('🔄 [Firestore] Loading glossary terms...')
                const firestoreTerms = await firestoreService.getGlossaryTerms()

                // Load categories
                const firestoreCategories = await firestoreService.getGlossaryCategories()
                const finalCategories = firestoreCategories.length > 0
                    ? firestoreCategories
                    : [] // No fallback categories

                setTerms(firestoreTerms)
                setCategories(finalCategories)
                setDataSource('firestore')
                console.log('✅ [Firestore] Loaded', firestoreTerms.length, 'glossary terms')
            } catch (error) {
                console.error('❌ [Firestore] Error loading glossary:', error)
                toast.error("Failed to load glossary")
                setDataSource('error')
            } finally {
                setIsLoading(false)
            }
        }

        loadData()
    }, [])

    // Add a new term (with Firestore sync)
    const addTerm = useCallback(async (term) => {
        const termData = {
            ...term,
            dateModified: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        }

        try {
            const created = await firestoreService.createGlossaryTerm(termData)
            setTerms(prev => [created, ...prev])
            return created
        } catch (error) {
            console.error('Error creating glossary term:', error)
            toast.error("Failed to create term")
            throw error
        }
    }, [])

    // Batch add terms
    const addTerms = useCallback(async (newTerms) => {
        const termDataArray = newTerms.map(term => ({
            ...term,
            dateModified: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        }))

        try {
            const createdTerms = await firestoreService.createGlossaryTerms(termDataArray)
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
        try {
            await firestoreService.updateGlossaryTerm(id, updates)
            setTerms(prev => prev.map(t =>
                t.id === id ? {
                    ...t,
                    ...updates,
                    dateModified: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                } : t
            ))
        } catch (error) {
            console.error("Failed to update term", error)
            toast.error("Failed to update term")
        }
    }, [])

    // Delete a term (with Firestore sync)
    const deleteTerm = useCallback(async (id) => {
        try {
            await firestoreService.deleteGlossaryTerm(id)
            setTerms(prev => prev.filter(t => t.id !== id))
        } catch (error) {
            console.error("Failed to delete term", error)
            toast.error("Failed to delete term")
        }
    }, [])

    // Bulk delete (with Firestore sync)
    const deleteTerms = useCallback(async (ids) => {
        try {
            await firestoreService.deleteGlossaryTerms(ids)
            setTerms(prev => prev.filter(t => !ids.includes(t.id)))
        } catch (error) {
            console.error("Failed to delete terms", error)
            toast.error("Failed to delete terms")
        }
    }, [])

    // Add Category
    const addCategory = useCallback(async (categoryData) => {
        try {
            const newCat = await firestoreService.createGlossaryCategory(categoryData)
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
            await firestoreService.deleteGlossaryCategory(id)
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
