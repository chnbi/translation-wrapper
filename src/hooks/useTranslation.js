// useTranslation - Hook for managing translation queue and Gemini API calls
import { useState, useCallback, useRef, useEffect } from 'react'
import { toast } from 'sonner'

// Queue configuration
const BATCH_SIZE = 10
const THROTTLE_MS = 500

/**
 * Manages translation queue, Gemini API calls, and retry logic
 * @param {Function} updateRowsFn - Function to update rows after translation
 * @param {Function} fetchGlossaryFn - Function to fetch glossary terms
 * @returns Translation queue state and handlers
 */
export function useTranslation(updateRowsFn, fetchGlossaryFn) {
    const [translationQueue, setTranslationQueue] = useState([])
    const [isProcessing, setIsProcessing] = useState(false)
    const [queueProgress, setQueueProgress] = useState({ current: 0, total: 0 })
    const processingRef = useRef(false)
    const isCancelledRef = useRef(false)

    // Check if Gemini API is configured
    const isApiConfigured = useCallback(() => {
        return !!(import.meta.env.VITE_GEMINI_API_KEY || import.meta.env.GEMINI_API_KEY)
    }, [])

    // Perform translation using Gemini API
    const performTranslation = useCallback(async (rows, template, targetLanguages = ['my', 'zh'], retryCount = 0) => {
        const MAX_RETRIES = 3
        const BASE_BACKOFF_MS = 5000

        if (!isApiConfigured()) {
            console.error('[Translation] No API key configured')
            toast.error("Gemini API Key is missing")
            throw new Error("API_KEY_MISSING")
        }

        try {
            const glossaryTerms = fetchGlossaryFn ? await fetchGlossaryFn() : []
            // Use new AI Service
            const { getAI, AIService } = await import('@/api/ai')

            // Apply user-specific API key before translation
            try {
                const { useAuth } = await import('@/App')
                // We can't use hooks here, but we can try to get user from context via a different approach
                // For now, we'll rely on the Settings page to have saved keys, which AIService can retrieve
            } catch { }

            // Get the AI instance (will use cached instance with applied API key if set)
            const ai = getAI()

            // Map rows to generic input format
            // Assuming rows are full objects, we extract text and context
            const inputs = rows.map(r => ({
                id: r.id,
                text: r.en || r.source_text || '',
                context: r.context
            }))

            // We need target languages. 
            // In strict V2, this should come from Project config, but this hook is generic.
            // We'll fallback to ['my', 'zh'] if not provided in args (hook signature update might be needed later, keeping 'my','zh' for now as safe default based on previous code)

            const results = await ai.generateBatch(inputs, {
                template,
                targetLanguages, // Now dynamic
                glossaryTerms: glossaryTerms.map(t => ({
                    english: t.en || t.english,
                    translations: {
                        ms: t.my || t.malay,
                        zh: t.cn || t.zh || t.chinese
                    }
                }))
            })

            // Format results for row update (V2 Schema)
            return results.map(r => ({
                id: r.id,
                translations: r.translations,
                templateUsed: template?.name || 'Default',
                translatedAt: new Date().toISOString()
            }))

        } catch (error) {
            console.error('[Translation] API error:', error)

            if (error.message === 'RATE_LIMIT' && retryCount < MAX_RETRIES) {
                const backoffMs = BASE_BACKOFF_MS * Math.pow(2, retryCount)
                console.log(`[Translation] Rate limited, retrying in ${backoffMs}ms...`)
                await new Promise(resolve => setTimeout(resolve, backoffMs))
                return performTranslation(rows, template, retryCount + 1)
            }

            toast.error("Translation failed: " + (error.message || "Unknown error"))
            throw error
        }
    }, [isApiConfigured, fetchGlossaryFn])

    // Add rows to translation queue
    const queueTranslation = useCallback((projectId, rows, template, targetLanguages = ['my', 'zh']) => {
        if (rows.length === 0) return

        // Mark rows as "queued"
        const queuedUpdates = rows.map(r => ({ id: r.id, changes: { status: 'queued' } }))
        updateRowsFn(projectId, queuedUpdates)

        // Create batches
        const batches = []
        for (let i = 0; i < rows.length; i += BATCH_SIZE) {
            batches.push({
                projectId,
                rows: rows.slice(i, i + BATCH_SIZE),
                template,
                targetLanguages,
            })
        }

        setTranslationQueue(prev => [...prev, ...batches])
        setQueueProgress({ current: 0, total: batches.length })
    }, [updateRowsFn])

    // Cancel the translation queue
    const cancelTranslationQueue = useCallback(() => {
        // Cancellation requested
        isCancelledRef.current = true

        // Mark all queued rows back to pending
        translationQueue.forEach(batch => {
            const pendingUpdates = batch.rows.map(r => ({
                id: r.id,
                changes: { status: 'pending' }
            }))
            updateRowsFn(batch.projectId, pendingUpdates)
        })

        setTranslationQueue([])
        setQueueProgress({ current: 0, total: 0 })
        setIsProcessing(false)
        processingRef.current = false
    }, [translationQueue, updateRowsFn])

    // Process translation queue - ONE batch at a time
    useEffect(() => {
        if (translationQueue.length === 0) {
            if (isProcessing) {
                setIsProcessing(false)
                processingRef.current = false
                setQueueProgress(prev => ({ ...prev, current: 0 }))
            }
            return
        }

        if (processingRef.current) return

        const processBatch = async () => {
            processingRef.current = true
            isCancelledRef.current = false
            if (!isProcessing) setIsProcessing(true)

            const batch = translationQueue[0]

            // Mark batch rows as "translating"
            const translatingUpdates = batch.rows.map(r => ({ id: r.id, changes: { status: 'translating' } }))
            updateRowsFn(batch.projectId, translatingUpdates)

            try {
                const results = await performTranslation(batch.rows, batch.template, batch.targetLanguages)

                if (isCancelledRef.current) {
                    // Cancelled during batch
                    return
                }

                const resultUpdates = results.map(r => ({ id: r.id, changes: r }))
                updateRowsFn(batch.projectId, resultUpdates)

            } catch (error) {
                console.error('Translation error:', error)
                const errorUpdates = batch.rows.map(r => ({ id: r.id, changes: { status: 'error' } }))
                updateRowsFn(batch.projectId, errorUpdates)
            }

            // Remove processed batch
            setTranslationQueue(prev => prev.slice(1))
            setQueueProgress(prev => ({ ...prev, current: prev.current + 1 }))
            processingRef.current = false
        }

        processBatch()
    }, [translationQueue, updateRowsFn, performTranslation, isProcessing])

    return {
        queueTranslation,
        cancelTranslationQueue,
        isProcessing,
        queueProgress,
        translationQueue,
        isApiConfigured,
    }
}
