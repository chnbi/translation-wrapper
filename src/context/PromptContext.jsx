// PromptContext - Centralized state management for prompt templates
// Now with Firestore persistence
import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { FileText, Megaphone, Code, Scale, MessageSquare } from 'lucide-react'
import * as firestoreService from '@/lib/firestore-service'
import { toast } from "sonner"

// Icon mapping for prompt templates
const iconMap = {
    'FileText': FileText,
    'Megaphone': Megaphone,
    'Code': Code,
    'Scale': Scale,
    'MessageSquare': MessageSquare,
}

// Feature flag - set to true to use Firestore


const PromptContext = createContext(null)

export function PromptProvider({ children }) {
    const [templates, setTemplates] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [dataSource, setDataSource] = useState('loading')

    // Load templates from Firestore on mount
    useEffect(() => {
        async function loadData() {
            try {
                console.log('🔄 [Firestore] Loading templates...')
                const firestoreTemplates = await firestoreService.getTemplates()

                // Enhance with icon components
                const enhanced = firestoreTemplates.map(t => ({
                    ...t,
                    icon: iconMap[t.iconName] || FileText,
                }))

                setTemplates(enhanced)
                setDataSource('firestore')
                console.log('✅ [Firestore] Loaded', firestoreTemplates.length, 'templates')
            } catch (error) {
                console.error('❌ [Firestore] Error loading templates:', error)
                toast.error("Failed to load templates")
                setDataSource('error')
            } finally {
                setIsLoading(false)
            }
        }

        loadData()
    }, [])

    // Add a new template (with Firestore sync)
    const addTemplate = useCallback(async (template) => {
        const templateData = {
            ...template,
            color: template.color || 'bg-zinc-50 dark:bg-zinc-900',
            iconBg: template.iconBg || 'bg-zinc-100 dark:bg-zinc-800',
            iconColor: template.iconColor || 'text-zinc-600 dark:text-zinc-400',
            iconName: template.iconName || 'FileText',
            author: template.author || 'You',
        }

        try {
            const created = await firestoreService.createTemplate(templateData)
            const enhanced = { ...created, icon: iconMap[created.iconName] || FileText }
            setTemplates(prev => [enhanced, ...prev])
            return enhanced
        } catch (error) {
            console.error('Error creating template:', error)
            toast.error("Failed to create template")
            throw error
        }
    }, [])

    // Update a template (with Firestore sync)
    const updateTemplate = useCallback(async (id, updates) => {
        try {
            await firestoreService.updateTemplate(id, updates)
            setTemplates(prev => prev.map(t =>
                t.id === id ? { ...t, ...updates } : t
            ))
        } catch (error) {
            console.error("Failed to update template", error)
            toast.error("Failed to update template")
        }
    }, [])

    // Delete a template (with Firestore sync)
    const deleteTemplate = useCallback(async (id) => {
        try {
            await firestoreService.deleteTemplate(id)
            setTemplates(prev => prev.filter(t => t.id !== id))
        } catch (error) {
            console.error("Failed to delete template", error)
            toast.error("Failed to delete template")
        }
    }, [])

    // Duplicate a template
    const duplicateTemplate = useCallback(async (id) => {
        const template = templates.find(t => t.id === id)
        if (template) {
            const { id: _, icon, ...rest } = template
            const newTemplate = await addTemplate({
                ...rest,
                name: `${template.name} (Copy)`,
                author: 'You',
            })
            return newTemplate
        }
        return null
    }, [templates, addTemplate])

    // Get template by ID
    const getTemplate = useCallback((id) => {
        return templates.find(t => t.id === id)
    }, [templates])

    // Get unique tags
    const allTags = [...new Set(templates.flatMap(t => t.tags || []))]

    const value = {
        templates,
        isLoading,
        dataSource,
        addTemplate,
        updateTemplate,
        deleteTemplate,
        duplicateTemplate,
        getTemplate,
        allTags,
    }

    return (
        <PromptContext.Provider value={value}>
            {children}
        </PromptContext.Provider>
    )
}

export function usePrompts() {
    const context = useContext(PromptContext)
    if (!context) {
        throw new Error('usePrompts must be used within a PromptProvider')
    }
    return context
}
