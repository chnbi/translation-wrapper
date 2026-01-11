// Firestore Hooks for Projects, Sheets, and Entries
import { useState, useEffect } from 'react'
import {
    collection,
    doc,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    query,
    orderBy,
    onSnapshot,
    serverTimestamp
} from 'firebase/firestore'
import { db } from '../services/firebase/client'

// ============ PROJECTS ============

export function useProjects() {
    const [projects, setProjects] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)

    useEffect(() => {
        const q = query(collection(db, 'projects'), orderBy('updatedAt', 'desc'))

        const unsubscribe = onSnapshot(q,
            (snapshot) => {
                const projectList = snapshot.docs.map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }))
                setProjects(projectList)
                setLoading(false)
            },
            (err) => {
                console.error('Error fetching projects:', err)
                setError(err)
                setLoading(false)
            }
        )

        return () => unsubscribe()
    }, [])

    const createProject = async (name) => {
        const docRef = await addDoc(collection(db, 'projects'), {
            name,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            sheetCount: 0
        })
        return docRef.id
    }

    const deleteProject = async (projectId) => {
        await deleteDoc(doc(db, 'projects', projectId))
    }

    return { projects, loading, error, createProject, deleteProject }
}

// ============ SHEETS ============

export function useSheets(projectId) {
    const [sheets, setSheets] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!projectId) {
            setSheets([])
            setLoading(false)
            return
        }

        const q = query(
            collection(db, 'projects', projectId, 'sheets'),
            orderBy('createdAt', 'asc')
        )

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const sheetList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            setSheets(sheetList)
            setLoading(false)
        })

        return () => unsubscribe()
    }, [projectId])

    const createSheet = async (name, category = 'general', sourceUrl = '') => {
        const docRef = await addDoc(collection(db, 'projects', projectId, 'sheets'), {
            name,
            category,
            sourceUrl,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
            entryCount: 0
        })

        await updateDoc(doc(db, 'projects', projectId), {
            updatedAt: serverTimestamp()
        })

        return docRef.id
    }

    return { sheets, loading, createSheet }
}

// ============ ENTRIES ============

export function useEntries(projectId, sheetId) {
    const [entries, setEntries] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        if (!projectId || !sheetId) {
            setEntries([])
            setLoading(false)
            return
        }

        const q = query(
            collection(db, 'projects', projectId, 'sheets', sheetId, 'entries'),
            orderBy('createdAt', 'asc')
        )

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const entryList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            setEntries(entryList)
            setLoading(false)
        })

        return () => unsubscribe()
    }, [projectId, sheetId])

    const createEntry = async (entryData) => {
        const docRef = await addDoc(
            collection(db, 'projects', projectId, 'sheets', sheetId, 'entries'),
            {
                english: entryData.english || '',
                malay: entryData.malay || '',
                chinese: entryData.chinese || '',
                status: 'draft',
                category: entryData.category || 'general',
                version: 1,
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            }
        )
        return docRef.id
    }

    const updateEntry = async (entryId, updates, userId) => {
        const entryRef = doc(db, 'projects', projectId, 'sheets', sheetId, 'entries', entryId)
        const currentDoc = await getDoc(entryRef)
        const currentData = currentDoc.data()

        // Save to history
        await addDoc(
            collection(db, 'projects', projectId, 'sheets', sheetId, 'entries', entryId, 'history'),
            {
                ...currentData,
                editedBy: userId,
                editedAt: serverTimestamp()
            }
        )

        // Update entry
        await updateDoc(entryRef, {
            ...updates,
            version: (currentData.version || 1) + 1,
            updatedAt: serverTimestamp(),
            lastEditedBy: userId
        })
    }

    const bulkCreateEntries = async (entriesData) => {
        const promises = entriesData.map(entry => createEntry(entry))
        return Promise.all(promises)
    }

    const bulkUpdateStatus = async (entryIds, status) => {
        const promises = entryIds.map(id =>
            updateDoc(
                doc(db, 'projects', projectId, 'sheets', sheetId, 'entries', id),
                { status, updatedAt: serverTimestamp() }
            )
        )
        return Promise.all(promises)
    }

    return {
        entries,
        loading,
        createEntry,
        updateEntry,
        bulkCreateEntries,
        bulkUpdateStatus
    }
}

// ============ GLOSSARY ============

export function useGlossary() {
    const [terms, setTerms] = useState([])
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        const q = query(collection(db, 'glossary'), orderBy('english', 'asc'))

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const termList = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }))
            setTerms(termList)
            setLoading(false)
        })

        return () => unsubscribe()
    }, [])

    const addTerm = async (termData) => {
        await addDoc(collection(db, 'glossary'), {
            english: termData.english,
            malay: termData.malay,
            chinese: termData.chinese,
            notes: termData.notes || '',
            createdAt: serverTimestamp()
        })
    }

    const updateTerm = async (termId, updates) => {
        await updateDoc(doc(db, 'glossary', termId), {
            ...updates,
            updatedAt: serverTimestamp()
        })
    }

    const deleteTerm = async (termId) => {
        await deleteDoc(doc(db, 'glossary', termId))
    }

    const searchTerms = (query) => {
        if (!query || query.length < 2) return []
        const lowerQuery = query.toLowerCase()
        return terms.filter(term =>
            term.english.toLowerCase().includes(lowerQuery)
        ).slice(0, 5)
    }

    return { terms, loading, addTerm, updateTerm, deleteTerm, searchTerms }
}
