// ProjectContext - Centralized state management (Thin Wrapper)
// Composes useProjectData, useTranslation, and useRowSelection hooks
import { createContext, useContext, useCallback } from 'react'
import { useProjectData } from '@/hooks/useProjectData'
import { useTranslation } from '@/hooks/useTranslation'
import { useRowSelection } from '@/hooks/useRowSelection'
import * as firestoreService from '@/services/firebase'

const ProjectContext = createContext(null)

export function ProjectProvider({ children }) {
    // Data hook - handles all Firebase CRUD
    const data = useProjectData()

    // Fetch only APPROVED glossary terms for translation
    // This ensures unapproved/pending terms are not used in AI translations
    const fetchGlossaryTerms = useCallback(async () => {
        try {
            const terms = await firestoreService.getApprovedGlossaryTerms()
            return terms
        } catch (error) {
            console.warn('[Translation] Failed to fetch glossary:', error)
            return []
        }
    }, [])

    // Translation hook - handles queue and Gemini API
    const translation = useTranslation(data.updateProjectRows, fetchGlossaryTerms)

    // Selection hook - handles row checkboxes
    const selection = useRowSelection()

    // Helper: Get rows for current project (handles pages vs legacy)
    const getRowsForProject = useCallback((projectId) => {
        const pageId = data.getSelectedPageId(projectId)
        if (pageId) {
            return data.getPageRows(projectId, pageId)
        }
        return data.getProjectRows(projectId)
    }, [data])

    // Wrapper: Select all rows (needs current rows)
    const selectAllRows = useCallback((projectId) => {
        const rows = getRowsForProject(projectId)
        selection.selectAllRows(projectId, rows)
    }, [getRowsForProject, selection])

    // Wrapper: Select by status (needs current rows)
    const selectRowsByStatus = useCallback((projectId, status) => {
        const rows = getRowsForProject(projectId)
        selection.selectRowsByStatus(projectId, rows, status)
    }, [getRowsForProject, selection])

    // Wrapper: Queue translation for selected rows
    // Groups rows by promptId for optimized batch processing
    const translateSelectedRows = useCallback((projectId, fallbackTemplate, getTemplateById) => {
        const selectedIds = selection.getSelectedRowIds(projectId)
        if (!selectedIds || selectedIds.size === 0) return

        const rows = getRowsForProject(projectId).filter(r => selectedIds.has(r.id))

        // Group rows by promptId
        const grouped = {}
        rows.forEach(row => {
            const promptId = row.promptId || 'default'
            if (!grouped[promptId]) grouped[promptId] = []
            grouped[promptId].push(row)
        })

        // Queue each group with its respective template
        Object.entries(grouped).forEach(([promptId, groupRows]) => {
            let template = fallbackTemplate
            if (promptId !== 'default' && getTemplateById) {
                const assignedTemplate = getTemplateById(promptId)
                if (assignedTemplate) template = assignedTemplate
            }
            translation.queueTranslation(projectId, groupRows, template)
        })

        selection.deselectAllRows(projectId)
    }, [selection, getRowsForProject, translation])

    // Wrapper: Delete rows (clears selection too)
    const deleteRows = useCallback(async (projectId, rowIds) => {
        const pageId = data.getSelectedPageId(projectId)
        await data.deleteRows(projectId, rowIds, pageId)
        selection.clearRowsFromSelection(projectId, rowIds)
    }, [data, selection])

    const value = {
        // Loading state
        isLoading: data.isLoading,
        dataSource: data.dataSource,

        // Projects
        projects: data.projects,
        selectedProjectId: null, // Deprecated - use URL param
        setSelectedProjectId: () => { }, // Deprecated
        getProject: data.getProject,
        addProject: data.addProject,
        updateProject: data.updateProject,
        deleteProject: data.deleteProject,
        stats: data.stats,

        // Rows (legacy)
        getProjectRows: data.getProjectRows,
        updateProjectRow: data.updateProjectRow,
        updateProjectRows: data.updateProjectRows,
        addProjectRows: data.addProjectRows,
        recomputeProjectStats: data.recomputeProjectStats,

        // Pages
        getProjectPages: data.getProjectPages,
        getPageRows: data.getPageRows,
        getSelectedPageId: data.getSelectedPageId,
        selectPage: data.selectPage,
        addPageRows: data.addPageRows,
        addProjectPage: data.addProjectPage,

        // Selection
        getSelectedRowIds: selection.getSelectedRowIds,
        toggleRowSelection: selection.toggleRowSelection,
        selectAllRows,
        deselectAllRows: selection.deselectAllRows,
        selectRowsByStatus,
        deleteRows,

        // Translation
        translateSelectedRows,
        queueTranslation: translation.queueTranslation,
        cancelTranslationQueue: translation.cancelTranslationQueue,
        isProcessing: translation.isProcessing,
        queueProgress: translation.queueProgress,
        translationQueue: translation.translationQueue,
    }

    return (
        <ProjectContext.Provider value={value}>
            {children}
        </ProjectContext.Provider>
    )
}

export function useProjects() {
    const context = useContext(ProjectContext)
    if (!context) {
        throw new Error('useProjects must be used within a ProjectProvider')
    }
    return context
}
