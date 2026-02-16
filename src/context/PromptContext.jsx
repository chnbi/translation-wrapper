// PromptContext - Centralized state management for prompt templates
// Now with Firebase persistence and Audit Trail
import { createContext, useContext, useState, useCallback, useEffect } from 'react'
import { FileText, Megaphone, Code, Scale, MessageSquare } from 'lucide-react'
import * as dbService from '@/api/firebase'
import { logAction, AUDIT_ACTIONS } from '@/api/firebase'
import { toast } from "sonner"

import { useAuth } from '@/context/DevAuthContext'

// Safe auth hook - returns null user if auth context not ready
function useSafeAuth() {
    const auth = useAuth()
    return auth || { user: null }
}

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
    const { user } = useSafeAuth()
    const [templates, setTemplates] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [dataSource, setDataSource] = useState('loading')

    // Load templates only when user is authenticated (Firestore rules require auth)
    useEffect(() => {
        if (!user) {
            setTemplates([])
            setDataSource('none')
            setIsLoading(false)
            return
        }

        async function loadData() {
            try {
                // Loading templates from Firebase

                // Ensure default template exists
                await dbService.getOrCreateDefaultTemplate()

                // Load all templates
                const pbTemplates = await dbService.getTemplates()

                // Enhance with icon components
                const enhanced = pbTemplates.map(t => ({
                    ...t,
                    icon: iconMap[t.iconName] || FileText,
                }))

                setTemplates(enhanced)
                setDataSource('firebase')
                // Templates loaded
            } catch (error) {
                toast.error("Failed to load templates")
                setDataSource('error')
            } finally {
                setIsLoading(false)
            }
        }

        loadData()
    }, [user])

    // Add a new template (with Firestore sync)
    const addTemplate = useCallback(async (template) => {
        const templateData = {
            ...template,
            color: template.color || 'bg-zinc-50 dark:bg-zinc-900',
            iconBg: template.iconBg || 'bg-zinc-100 dark:bg-zinc-800',
            iconColor: template.iconColor || 'text-zinc-600 dark:text-zinc-400',
            iconName: template.iconName || 'FileText',
            author: template.author || 'You',
            createdBy: user ? {
                uid: user.id || user.uid,
                email: user.email,
                name: user.displayName || user.name || user.email?.split('@')[0]
            } : null
        }

        try {
            const created = await dbService.createTemplate(templateData)
            const enhanced = { ...created, icon: iconMap[created.iconName] || FileText }
            setTemplates(prev => [enhanced, ...prev])

            // Audit log
            await logAction(user, AUDIT_ACTIONS.PROMPT_CREATED, 'prompt', created.id, {
                content: { after: { name: created.name, prompt: created.prompt } }
            })

            return enhanced
        } catch (error) {
            toast.error("Failed to create template")
            throw error
        }
    }, [])

    // Update a template (with Firestore sync)
    const updateTemplate = useCallback(async (id, updates) => {
        const existingTemplate = templates.find(t => t.id === id)
        try {
            // Add lastModifiedBy metadata
            const updatesWithMeta = {
                ...updates,
                ...(user ? {
                    lastModifiedBy: {
                        uid: user.id || user.uid,
                        email: user.email,
                        name: user.displayName || user.name || user.email?.split('@')[0]
                    }
                } : {})
            }

            await dbService.updateTemplate(id, updatesWithMeta)
            const updatedTemplate = { ...existingTemplate, ...updatesWithMeta }
            setTemplates(prev => prev.map(t => t.id === id ? updatedTemplate : t))

            // Audit log - check if this is a publish action
            const action = updates.status === 'published' ? AUDIT_ACTIONS.PROMPT_PUBLISHED : AUDIT_ACTIONS.PROMPT_EDITED
            await logAction(user, action, 'prompt', id, {
                content: {
                    before: { name: existingTemplate?.name, prompt: existingTemplate?.prompt },
                    after: { name: updatedTemplate.name, prompt: updatedTemplate.prompt }
                }
            })
        } catch (error) {
            toast.error("Failed to update template")
        }
    }, [templates, user])

    // Delete a template (with Firestore sync)
    const deleteTemplate = useCallback(async (id) => {
        try {
            await dbService.deleteTemplate(id)
            setTemplates(prev => prev.filter(t => t.id !== id))
        } catch (error) {
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
