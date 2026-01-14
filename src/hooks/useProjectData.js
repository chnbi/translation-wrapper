// useProjectData - Hook for managing project data and Firebase CRUD
import { useState, useCallback, useEffect } from 'react'
import * as firestoreService from '@/services/firebase'
import { toast } from 'sonner'

/**
 * Manages project data loading and CRUD operations with Firebase
 * @returns Project data state and handlers
 */
export function useProjectData() {
    const [projects, setProjects] = useState([])
    const [projectRows, setProjectRows] = useState({})  // { projectId: rows[] }
    const [projectPages, setProjectPages] = useState({}) // { projectId: { pages: [], pageRows: { pageId: rows[] } } }
    const [selectedPageId, setSelectedPageId] = useState({}) // { projectId: pageId }
    const [isLoading, setIsLoading] = useState(true)
    const [dataSource, setDataSource] = useState('loading')

    // Load all data on mount
    useEffect(() => {
        async function loadData() {
            try {
                console.log('🔄 [Firestore] Loading projects...')
                const firestoreProjects = await firestoreService.getProjects()

                if (firestoreProjects.length === 0) {
                    console.log('📦 [Firestore] No projects found')
                    setProjects([])
                    setDataSource('firestore')
                } else {
                    const allRows = {}
                    const allPagesData = {}

                    for (const project of firestoreProjects) {
                        try {
                            const rows = await firestoreService.getProjectRows(project.id)
                            allRows[project.id] = rows || []

                            const pages = await firestoreService.getProjectPages(project.id)
                            const pageRows = {}
                            for (const page of pages) {
                                const pRows = await firestoreService.getPageRows(project.id, page.id)
                                pageRows[page.id] = pRows || []
                            }
                            allPagesData[project.id] = { pages, pageRows }

                            if (pages.length > 0) {
                                setSelectedPageId(prev => ({ ...prev, [project.id]: pages[0].id }))
                            }
                        } catch (err) {
                            console.error(`Failed to load details for project ${project.id}`, err)
                        }
                    }

                    setProjects(firestoreProjects)
                    setProjectRows(allRows)
                    setProjectPages(allPagesData)
                    setDataSource('firestore')
                    console.log('✅ [Firestore] Loaded', firestoreProjects.length, 'projects')
                }
            } catch (error) {
                console.error('❌ [Firestore] Error loading data:', error)
                toast.error("Failed to load projects from database")
                setDataSource('error')
                setProjects([])
            } finally {
                setIsLoading(false)
            }
        }

        loadData()
    }, [])

    // Get a project by ID
    const getProject = useCallback((id) => {
        return projects.find(p => p.id === id)
    }, [projects])

    // Get project rows by project ID
    const getProjectRows = useCallback((projectId) => {
        return projectRows[projectId] || []
    }, [projectRows])

    // Get pages for a project
    const getProjectPages = useCallback((projectId) => {
        return projectPages[projectId]?.pages || []
    }, [projectPages])

    // Get rows for a specific page
    const getPageRows = useCallback((projectId, pageId) => {
        return projectPages[projectId]?.pageRows?.[pageId] || []
    }, [projectPages])

    // Get currently selected page for a project
    const getSelectedPageId = useCallback((projectId) => {
        return selectedPageId[projectId] || null
    }, [selectedPageId])

    // Set selected page
    const selectPage = useCallback((projectId, pageId) => {
        setSelectedPageId(prev => ({ ...prev, [projectId]: pageId }))
    }, [])

    // Update a single row
    const updateProjectRow = useCallback((projectId, rowId, updates) => {
        // First, determine which page contains this row (BEFORE any state updates)
        let pageIdForRow = null
        const projectData = projectPages[projectId]
        if (projectData?.pageRows) {
            for (const pageId in projectData.pageRows) {
                const hasRow = (projectData.pageRows[pageId] || []).some(r => r.id === rowId)
                if (hasRow) {
                    pageIdForRow = pageId
                    break
                }
            }
        }

        // Update legacy flat rows
        setProjectRows(prev => ({
            ...prev,
            [projectId]: (prev[projectId] || []).map(row =>
                row.id === rowId ? { ...row, ...updates } : row
            )
        }))

        // Also update page-specific rows
        if (pageIdForRow) {
            setProjectPages(prev => {
                const projData = prev[projectId]
                if (!projData) return prev

                return {
                    ...prev,
                    [projectId]: {
                        ...projData,
                        pageRows: {
                            ...projData.pageRows,
                            [pageIdForRow]: (projData.pageRows[pageIdForRow] || []).map(row =>
                                row.id === rowId ? { ...row, ...updates } : row
                            )
                        }
                    }
                }
            })
        }

        // Sync to Firestore - use the pageId we already determined
        if (dataSource === 'firestore') {
            if (pageIdForRow) {
                // Row is in a page - use page-specific update
                console.log(`✏️ [Firestore] Updating page row: project=${projectId}, page=${pageIdForRow}, row=${rowId}`)
                firestoreService.updatePageRow(projectId, pageIdForRow, rowId, updates).catch(console.error)
            } else {
                // Row is in legacy flat structure
                console.log(`✏️ [Firestore] Updating legacy row: project=${projectId}, row=${rowId}`)
                firestoreService.updateProjectRow(projectId, rowId, updates).catch(console.error)
            }
        }
    }, [dataSource, projectPages])

    // Update multiple rows at once
    const updateProjectRows = useCallback((projectId, rowUpdates) => {
        // Update legacy flat rows
        setProjectRows(prev => ({
            ...prev,
            [projectId]: (prev[projectId] || []).map(row => {
                const update = rowUpdates.find(u => u.id === row.id)
                return update ? { ...row, ...update.changes } : row
            })
        }))

        // Also update page-specific rows
        setProjectPages(prev => {
            const projectData = prev[projectId]
            if (!projectData) return prev

            const updatedPageRows = {}
            for (const pageId in projectData.pageRows) {
                updatedPageRows[pageId] = (projectData.pageRows[pageId] || []).map(row => {
                    const update = rowUpdates.find(u => u.id === row.id)
                    return update ? { ...row, ...update.changes } : row
                })
            }
            return {
                ...prev,
                [projectId]: { ...projectData, pageRows: updatedPageRows }
            }
        })

        // Sync to Firestore
        if (dataSource === 'firestore') {
            firestoreService.updateProjectRows(projectId, rowUpdates).catch(console.error)
        }
    }, [dataSource])

    // Add rows to a project
    const addProjectRows = useCallback(async (projectId, newRows) => {
        const rowsWithIds = newRows.map((row, idx) => ({
            ...row,
            id: row.id || `row_${Date.now()}_${idx}`,
            status: row.status || 'pending'
        }))

        setProjectRows(prev => ({
            ...prev,
            [projectId]: [...(prev[projectId] || []), ...rowsWithIds]
        }))

        if (dataSource === 'firestore') {
            try {
                await firestoreService.addProjectRows(projectId, rowsWithIds)
            } catch (error) {
                console.error('Error adding rows to Firestore:', error)
            }
        }

        return rowsWithIds
    }, [dataSource])

    // Add rows to a specific page
    const addPageRows = useCallback(async (projectId, pageId, newRows) => {
        const rowsWithIds = newRows.map((row, idx) => ({
            ...row,
            id: row.id || `row_${Date.now()}_${idx}`,
            status: row.status || 'pending'
        }))

        setProjectPages(prev => ({
            ...prev,
            [projectId]: {
                ...prev[projectId],
                pageRows: {
                    ...(prev[projectId]?.pageRows || {}),
                    [pageId]: [...(prev[projectId]?.pageRows?.[pageId] || []), ...rowsWithIds]
                }
            }
        }))

        if (dataSource === 'firestore') {
            try {
                await firestoreService.addPageRows(projectId, pageId, rowsWithIds)
                toast.success(`Added ${rowsWithIds.length} row(s)`)
            } catch (error) {
                console.error('Error adding rows to page:', error)
                toast.error('Failed to add rows')
            }
        }

        return rowsWithIds
    }, [dataSource])

    // Delete rows
    const deleteRows = useCallback(async (projectId, rowIds, currentPageId) => {
        // Optimistic update
        if (currentPageId) {
            setProjectPages(prev => ({
                ...prev,
                [projectId]: {
                    ...prev[projectId],
                    pageRows: {
                        ...(prev[projectId]?.pageRows || {}),
                        [currentPageId]: (prev[projectId]?.pageRows?.[currentPageId] || []).filter(r => !rowIds.includes(r.id))
                    }
                }
            }))
        } else {
            setProjectRows(prev => ({
                ...prev,
                [projectId]: (prev[projectId] || []).filter(r => !rowIds.includes(r.id))
            }))
        }

        // Sync to Firestore
        if (dataSource === 'firestore') {
            try {
                if (currentPageId) {
                    await firestoreService.deletePageRows(projectId, currentPageId, rowIds)
                } else {
                    await firestoreService.deleteProjectRows(projectId, rowIds)
                }
                toast.success(`Deleted ${rowIds.length} row(s)`)
            } catch (error) {
                console.error('Error deleting rows:', error)
                toast.error('Failed to delete rows')
            }
        }
    }, [dataSource])

    // Add a new project
    const addProject = useCallback(async (project) => {
        const projectData = {
            ...project,
            status: 'draft',
            progress: 0,
            translatedRows: 0,
            pendingReview: 0,
            lastUpdated: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        }

        if (dataSource === 'firestore') {
            try {
                const created = await firestoreService.createProject(projectData)
                const newProject = { ...projectData, id: created.id }
                setProjects(prev => [newProject, ...prev])
                setProjectRows(prev => ({ ...prev, [created.id]: [] }))
                return newProject
            } catch (error) {
                console.error('Error creating project in Firestore:', error)
                throw error
            }
        } else {
            const newProject = { ...projectData, id: String(Date.now()) }
            setProjects(prev => [newProject, ...prev])
            setProjectRows(prev => ({ ...prev, [newProject.id]: [] }))
            return newProject
        }
    }, [dataSource])

    // Update a project
    const updateProject = useCallback((id, updates) => {
        setProjects(prev => prev.map(p =>
            p.id === id ? { ...p, ...updates } : p
        ))

        if (dataSource === 'firestore') {
            firestoreService.updateProject(id, updates).catch(console.error)
        }
    }, [dataSource])

    // Delete a project
    const deleteProject = useCallback((id) => {
        setProjects(prev => prev.filter(p => p.id !== id))
        setProjectRows(prev => {
            const { [id]: removed, ...rest } = prev
            return rest
        })

        if (dataSource === 'firestore') {
            firestoreService.deleteProject(id).catch(console.error)
        }
    }, [dataSource])

    // Add a project page
    const addProjectPage = useCallback(async (projectId, pageData, rows = []) => {
        if (dataSource === 'firestore') {
            const page = await firestoreService.addProjectPage(projectId, pageData)
            if (rows.length > 0) {
                await firestoreService.addPageRows(projectId, page.id, rows)
            }
            setProjectPages(prev => ({
                ...prev,
                [projectId]: {
                    pages: [...(prev[projectId]?.pages || []), page],
                    pageRows: {
                        ...(prev[projectId]?.pageRows || {}),
                        [page.id]: rows
                    }
                }
            }))
            setSelectedPageId(prev => ({ ...prev, [projectId]: page.id }))
            return page
        }
    }, [dataSource])

    // Recompute project stats
    const recomputeProjectStats = useCallback((projectId) => {
        const legacy = projectRows[projectId] || []
        let pageRowsArr = []
        if (projectPages[projectId]?.pageRows) {
            pageRowsArr = Object.values(projectPages[projectId].pageRows).flat()
        }

        const allRows = [...legacy, ...pageRowsArr]
        if (allRows.length === 0) return

        const totalRows = allRows.length
        const completedRows = allRows.filter(r => r.status === 'completed').length
        const pendingReview = allRows.filter(r => r.status === 'review').length
        const progress = Math.round((completedRows / totalRows) * 100)

        let newStatus = 'draft'
        if (progress === 100) {
            newStatus = 'completed'
        } else if (completedRows > 0 || pendingReview > 0) {
            newStatus = 'in-progress'
        }

        updateProject(projectId, {
            progress,
            totalRows,
            translatedRows: completedRows,
            pendingReview,
            status: newStatus
        })
    }, [projectRows, projectPages, updateProject])

    // Computed stats
    const stats = {
        totalProjects: projects.length,
        inProgress: projects.filter(p => p.status === 'in-progress').length,
        completed: projects.filter(p => p.status === 'completed').length,
        draft: projects.filter(p => p.status === 'draft').length,
        totalRows: Object.values(projectRows).flat().length,
        totalPendingReview: Object.values(projectRows).flat().filter(r => r.status === 'review').length,
    }

    return {
        // Loading state
        isLoading,
        dataSource,

        // Projects
        projects,
        getProject,
        addProject,
        updateProject,
        deleteProject,
        stats,

        // Rows (legacy)
        getProjectRows,
        updateProjectRow,
        updateProjectRows,
        addProjectRows,
        deleteRows,
        recomputeProjectStats,

        // Pages
        getProjectPages,
        getPageRows,
        getSelectedPageId,
        selectPage,
        addPageRows,
        addProjectPage,
        selectedPageId,
    }
}
