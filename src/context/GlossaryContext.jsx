// GlossaryContext - Centralized state management for glossary terms
// Now with Firebase persistence and Audit Trail
import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import * as dbService from '@/api/firebase'
import { logAction, AUDIT_ACTIONS } from '@/api/firebase'
import { toast } from "sonner"

import { useAuth } from '@/context/DevAuthContext'

// Safe auth hook - returns null user if auth context not ready
function useSafeAuth() {
    const auth = useAuth()
    return auth || { user: null }
}

// Feature flag - set to true to use Firestore


const GlossaryContext = createContext(null)

export function GlossaryProvider({ children }) {
    const { user } = useSafeAuth()
    const [terms, setTerms] = useState([])
    const [categories, setCategories] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [dataSource, setDataSource] = useState('loading')

    // Load glossary terms from Firestore
    const refreshGlossary = useCallback(async () => {
        setIsLoading(true)
        try {
            // Loading glossary terms from Firebase
            const firestoreTerms = await dbService.getGlossaryTerms()

            // Load categories
            const firestoreCategories = await dbService.getGlossaryCategories()
            let finalCategories = firestoreCategories

            // Seed default categories if none exist
            if (firestoreCategories.length === 0) {
                const defaultNames = ['Banner', 'Price', 'UI Labels']
                const seeded = []
                for (const name of defaultNames) {
                    const newCat = await dbService.createGlossaryCategory({ name })
                    seeded.push(newCat)
                }
                finalCategories = seeded
            }

            // Normalize terms to ensure consistent field names (handle legacy data)
            const normalizedTerms = firestoreTerms.map(t => {
                const tx = t.translations || {}

                // Helper to extract text from translation value (string or object with .text)
                const getText = (val) => {
                    if (!val) return ''
                    // Handle Firestore Timestamp or unexpected objects? No, just check .text
                    if (typeof val === 'object' && val.text) return val.text
                    if (typeof val === 'string') return val
                    return ''
                }

                return {
                    ...t,
                    // Check top-level first, then translations object (handling both string and object formats)
                    en: t.en || t.english || t.term || getText(tx.en) || getText(tx.english) || '',
                    my: t.my || t.malay || getText(tx.my) || getText(tx.malay) || '',
                    // Added 'zh' (from constants)
                    cn: t.cn || t.chinese || t.zh || getText(tx.cn) || getText(tx.chinese) || getText(tx.zh) || '',
                    // Check category and categoryId
                    category: t.category || t.categoryId || 'General',
                    remark: t.remark || t.remarks || '',
                    status: t.status || 'draft',
                    // Ensure translations object is populated for AI consumption
                    translations: {
                        en: t.en || t.english || t.term || getText(tx.en) || getText(tx.english) || '',
                        my: t.my || t.malay || getText(tx.my) || getText(tx.malay) || '',
                        cn: t.cn || t.chinese || t.zh || getText(tx.cn) || getText(tx.chinese) || getText(tx.zh) || ''
                    }
                }
            })

            setTerms(normalizedTerms)
            setCategories(finalCategories)
            setDataSource('firestore')
            // Glossary terms loaded

            // DEBUG: Check translations keys if still empty
            if (firestoreTerms.length > 0) {

            }

        } catch (error) {
            toast.error("Failed to load glossary")
            setDataSource('error')
        } finally {
            setIsLoading(false)
        }
    }, [setTerms, setCategories, setDataSource, setIsLoading])

    // Load only when user is authenticated (Firestore rules require auth)
    useEffect(() => {
        if (!user) {
            setTerms([])
            setCategories([])
            setDataSource('none')
            setIsLoading(false)
            return
        }
        refreshGlossary()
    }, [user, refreshGlossary])

    // Add a new term (with Firebase sync)
    const addTerm = useCallback(async (term) => {
        // Only pass valid Firebase fields
        const termData = {
            en: term.en || term.english || '',
            my: term.my || term.malay || '',
            cn: term.cn || term.chinese || '',
            category: term.category || 'General',
            remark: term.remark || '',
            status: term.status || 'draft',
            createdBy: user ? {
                uid: user.id || user.uid,
                email: user.email,
                name: user.displayName || user.name || user.email?.split('@')[0]
            } : null
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
            toast.error("Failed to create term")
            throw error
        }
    }, [])

    // Batch add terms
    const addTerms = useCallback(async (newTerms) => {
        // Firebase auto-generates created/updated timestamps
        // Only pass valid fields: en, my, cn, category, remark, status
        const termDataArray = newTerms.map(term => ({
            en: term.en || '',
            my: term.my || '',
            cn: term.cn || '',
            category: term.category || 'General',
            remark: term.remark || '',
            status: term.status || 'draft',
            createdBy: user ? {
                uid: user.id || user.uid,
                email: user.email,
                name: user.displayName || user.name || user.email?.split('@')[0]
            } : null
        }))

        try {
            const createdTerms = await dbService.createGlossaryTerms(termDataArray)
            setTerms(prev => [...createdTerms, ...prev])
            return createdTerms
        } catch (error) {
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

            // Add lastModifiedBy metadata
            if (user) {
                finalUpdates.lastModifiedBy = {
                    uid: user.id || user.uid,
                    email: user.email,
                    name: user.displayName || user.name || user.email?.split('@')[0]
                }
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
            toast.error("Failed to update term")
        }
    }, [terms, user])

    // Approve a term (Manager only)
    const approveTerm = useCallback(async (id) => {
        const existingTerm = terms.find(t => t.id === id)
        if (!user) return

        try {
            const approvalData = {
                status: 'approved',
                approvedBy: {
                    uid: user.id || user.uid,
                    email: user.email,
                    name: user.displayName || user.name || user.email?.split('@')[0]
                },
                approvedAt: new Date().toISOString()
            }

            await dbService.updateGlossaryTerm(id, approvalData)

            const updatedTerm = {
                ...existingTerm,
                ...approvalData
            }

            setTerms(prev => prev.map(t => t.id === id ? updatedTerm : t))

            // Audit log
            await logAction(user, AUDIT_ACTIONS.GLOSSARY_APPROVED || 'GLOSSARY_APPROVED', 'glossary', id, {
                content: { term: existingTerm.en }
            })

            toast.success("Term approved")
        } catch (error) {
            toast.error("Failed to approve term")
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
            toast.error("Failed to delete term")
        }
    }, [terms, user])

    // Bulk delete (with Firestore sync)
    const deleteTerms = useCallback(async (ids) => {
        try {
            await dbService.deleteGlossaryTerms(ids)
            setTerms(prev => prev.filter(t => !ids.includes(t.id)))
        } catch (error) {
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
            toast.error("Failed to delete category")
            throw error
        }
    }, [])

    // Get term by ID
    const getTerm = useCallback((id) => {
        return terms.find(t => t.id === id)
    }, [terms])



    // Filter approved terms for consumption by highlighter/AI
    const approvedTerms = terms.filter(t => t.status === 'approved' || t.status === 'published')

    const value = {
        terms,
        approvedTerms, // Expose approved terms
        isLoading,
        dataSource,
        addTerm,
        addTerms,
        refreshGlossary,
        updateTerm,
        approveTerm, // New
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
