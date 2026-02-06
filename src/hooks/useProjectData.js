// useProjectData - Hook for managing project data with PocketBase
import { useState, useCallback, useEffect } from 'react'
import * as dbService from '@/api/pocketbase'
import { logAction, AUDIT_ACTIONS } from '@/api/pocketbase'
import { toast } from 'sonner'
import { useAuth } from '@/App'

/**
 * Manages project data loading and CRUD operations with PocketBase
 * @returns Project data state and handlers
 */
export function useProjectData() {
    const { user } = useAuth()
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
                console.log('🔄 [PocketBase] Loading projects...')
                const firestoreProjects = await dbService.getProjects()

                if (firestoreProjects.length === 0) {
                    console.log('📦 [PocketBase] No projects found')
                    setProjects([])
                    setDataSource('firestore')
                } else {
                    const allRows = {}
                    const allPagesData = {}

                    // Projects with calculated stats
                    const projectsWithStats = []

                    for (const project of firestoreProjects) {
                        try {
                            const unpagedRows = await dbService.getProjectRows(project.id)
                            allRows[project.id] = unpagedRows || []

                            let pages = await dbService.getProjectPages(project.id)
                            let pageRows = {}
                            let allProjectRows = [...(unpagedRows || [])]

                            // Auto-migrate legacy projects: if has rows but no pages, create Page 1
                            if (pages.length === 0 && unpagedRows && unpagedRows.length > 0) {
                                console.log(`🔄 [Migration] Project ${project.id} has ${unpagedRows.length} legacy rows, migrating to Page 1...`)
                                try {
                                    const page = await dbService.addProjectPage(project.id, { name: 'Page 1' })
                                    // Move rows to the new page
                                    for (const row of unpagedRows) {
                                        await dbService.addPageRows(project.id, page.id, [row])
                                    }
                                    pages = [page]
                                    pageRows[page.id] = unpagedRows
                                    // Update our local reference since they are now paged
                                    allProjectRows = unpagedRows // Content is same, just location changed
                                    console.log(`✅ [Migration] Successfully migrated ${unpagedRows.length} rows to Page 1`)
                                } catch (migrationErr) {
                                    console.error(`❌ [Migration] Failed to migrate project ${project.id}:`, migrationErr)
                                }
                            } else {
                                // Load page rows normally
                                for (const page of pages) {
                                    const pRows = await dbService.getPageRows(project.id, page.id)
                                    pageRows[page.id] = pRows || []
                                    allProjectRows = [...allProjectRows, ...pRows]
                                }
                            }

                            // Calculate Progress based on ALL rows (paged + unpaged)
                            const totalRows = allProjectRows.length
                            const approvedRows = allProjectRows.filter(r => r.status === 'approved' || r.status === 'completed').length
                            const reviewRows = allProjectRows.filter(r => r.status === 'review').length

                            const progress = totalRows > 0 ? Math.round((approvedRows / totalRows) * 100) : 0

                            // Determine dynamic status
                            let calculatedStatus = project.status || 'draft'

                            if (totalRows > 0) {
                                if (reviewRows > 0) {
                                    calculatedStatus = 'review'
                                } else if (approvedRows === totalRows) {
                                    calculatedStatus = 'approved'
                                } else if (approvedRows > 0) {
                                    // Partially approved but no active reviews -> could be draft or just in progress
                                    // Let's default to 'review' if it's not fully approved but has progress
                                    // Or keep existing status. User asked: "if it is sent for review, even partially, should it be changed to in review?"
                                    // So if reviewRows > 0 -> Review.
                                    // User also said "only show approved when fully done".
                                    calculatedStatus = 'draft' // Default back to draft if partially done but nothing explicitly in review?
                                    // Actually, if it's partially done, it's usually "In Progress" or "Review" in many systems.
                                    // But based on "only show approved when fully done", anything else is not approved.
                                    // If reviewRows > 0, it's Review.
                                }
                            }

                            // Attach calculated progress and status to project
                            // detailed status logic override
                            const projectWithStats = {
                                ...project,
                                progress,
                                status: (reviewRows > 0) ? 'review' : (totalRows > 0 && approvedRows === totalRows) ? 'approved' : 'draft'
                            }
                            projectsWithStats.push(projectWithStats)

                            allPagesData[project.id] = { pages, pageRows }

                            if (pages.length > 0) {
                                setSelectedPageId(prev => ({ ...prev, [project.id]: pages[0].id }))
                            }
                        } catch (err) {
                            console.error(`Failed to load details for project ${project.id}`, err)
                        }
                    }

                    setProjects(projectsWithStats)
                    setProjectRows(allRows)
                    setProjectPages(allPagesData)
                    setDataSource('firestore')
                    console.log('✅ [PocketBase] Loaded', projectsWithStats.length, 'projects')
                }
            } catch (error) {
                console.error('❌ [PocketBase] Error loading data:', error)
                toast.error("Failed to load projects from database")
                setDataSource('error')
                setProjects([])
            } finally {
                setIsLoading(false)
            }
        }

        loadData()

        // Poll for updates every 30 seconds (Auto-refresh)
        const intervalId = setInterval(() => {
            console.log('🔄 [Auto-Refresh] Polling for updates...')
            loadData()
        }, 30000)

        return () => clearInterval(intervalId)
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
            [projectId]: (prev[projectId] || []).map(row => {
                if (row.id !== rowId) return row

                // Logic: If editing content on Approved row, revert to Draft
                const isContentEdit = Object.keys(updates).some(k => ['en', 'my', 'zh', 'remark', 'remarks'].includes(k))
                const isStatusChange = 'status' in updates
                const isApprovedOrReview = ['approved', 'review', 'published'].includes(row.status)

                let finalUpdates = { ...updates }
                if (isContentEdit && !isStatusChange && isApprovedOrReview) {
                    finalUpdates.status = 'draft'
                }

                return { ...row, ...finalUpdates }
            })
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
                            [pageIdForRow]: (projData.pageRows[pageIdForRow] || []).map(row => {
                                if (row.id !== rowId) return row

                                // Logic: If editing content (en/my/zh) on an Approved/Review row, revert to Draft
                                // Unless the update itself explicitly sets the status (e.g. approval action)
                                const isContentEdit = Object.keys(updates).some(k => ['en', 'my', 'zh', 'remark', 'remarks'].includes(k))
                                const isStatusChange = 'status' in updates
                                const isApprovedOrReview = ['approved', 'review', 'published'].includes(row.status)

                                let finalUpdates = { ...updates }
                                if (isContentEdit && !isStatusChange && isApprovedOrReview) {
                                    finalUpdates.status = 'draft'
                                    // Also toast to inform user? Maybe too noisy.
                                }

                                return { ...row, ...finalUpdates }
                            })
                        }
                    }
                }
            })
        }

        // Sync to Firestore - use the pageId we already determined
        if (dataSource === 'firestore') {
            if (pageIdForRow) {
                // Row is in a page - use page-specific update
                console.log(`✏️ [PocketBase] Updating page row: project=${projectId}, page=${pageIdForRow}, row=${rowId}`)
                dbService.updatePageRow(projectId, pageIdForRow, rowId, updates).catch(console.error)
            } else {
                // Row is in legacy flat structure
                console.log(`✏️ [PocketBase] Updating legacy row: project=${projectId}, row=${rowId}`)
                dbService.updateProjectRow(projectId, rowId, updates).catch(console.error)
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
            dbService.updateProjectRows(projectId, rowUpdates).catch(console.error)
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
                await dbService.addProjectRows(projectId, rowsWithIds)
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
                await dbService.addPageRows(projectId, pageId, rowsWithIds)

                // Audit log
                if (user) {
                    await logAction(user, AUDIT_ACTIONS.ROWS_IMPORTED, 'project_rows', pageId, {
                        projectId,
                        content: `Added ${rowsWithIds.length} row(s) to page`
                    })
                }

                toast.success(`Added ${rowsWithIds.length} row(s)`)
            } catch (error) {
                console.error('Error adding rows to page:', error)
                toast.error('Failed to add rows')
            }
        }

        return rowsWithIds
    }, [dataSource, user])

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
                    await dbService.deletePageRows(projectId, currentPageId, rowIds)
                } else {
                    await dbService.deleteProjectRows(projectId, rowIds)
                }

                // Audit log
                if (user) {
                    await logAction(user, AUDIT_ACTIONS.ROWS_EXPORTED, 'project_rows', currentPageId || projectId, {
                        projectId,
                        content: `Deleted ${rowIds.length} row(s)`
                    })
                }

                toast.success(`Deleted ${rowIds.length} row(s)`)
            } catch (error) {
                console.error('Error deleting rows:', error)
                toast.error('Failed to delete rows')
            }
        }
    }, [dataSource, user])

    // Add a new project
    const addProject = useCallback(async (project) => {
        const { sheets, ...projectMeta } = project

        const projectData = {
            ...projectMeta,
            status: 'draft',
            progress: 0,
            translatedRows: 0,
            pendingReview: 0,
            lastUpdated: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
        }

        let createdProjectId
        let firstPageId = null

        if (dataSource === 'firestore') {
            try {
                // 1. Create Project
                const created = await dbService.createProject(projectData)
                createdProjectId = created.id

                const newProject = { ...projectData, id: createdProjectId }
                setProjects(prev => [newProject, ...prev])
                setProjectRows(prev => ({ ...prev, [createdProjectId]: [] }))
                setProjectPages(prev => ({
                    ...prev,
                    [createdProjectId]: { pages: [], pageRows: {} }
                }))

                // Audit log for project creation
                if (user) {
                    await logAction(user, AUDIT_ACTIONS.PROJECT_CREATED, 'projects', createdProjectId, {
                        projectId: createdProjectId,
                        content: `Created project: ${projectData.name || 'Untitled'}`
                    })
                }

                // 2. Process Sheets (if any) or Default Page
                if (sheets && Object.keys(sheets).length > 0) {
                    const sheetNames = Object.keys(sheets)
                    for (const [index, sheetName] of sheetNames.entries()) {
                        const rows = sheets[sheetName]

                        // Create Page
                        const page = await dbService.addProjectPage(createdProjectId, { name: sheetName })
                        if (index === 0) firstPageId = page.id

                        // Add Rows - only include valid fields for PocketBase
                        const validFields = ['en', 'my', 'zh', 'status', 'promptId', 'context']
                        const cleanRows = rows.map((row) => {
                            const cleaned = { status: 'draft' }
                            validFields.forEach(field => {
                                if (row[field] !== undefined) cleaned[field] = row[field]
                            })
                            return cleaned
                        })
                        const createdRows = await dbService.addPageRows(createdProjectId, page.id, cleanRows)

                        // Update Local State for Page with PocketBase-generated records
                        setProjectPages(prev => ({
                            ...prev,
                            [createdProjectId]: {
                                ...prev[createdProjectId],
                                pages: [...(prev[createdProjectId]?.pages || []), page],
                                pageRows: {
                                    ...(prev[createdProjectId]?.pageRows || {}),
                                    [page.id]: createdRows
                                }
                            }
                        }))
                    }
                } else {
                    // Create default "Page 1" for new empty projects
                    const page = await dbService.addProjectPage(createdProjectId, { name: 'Page 1' })
                    firstPageId = page.id

                    setProjectPages(prev => ({
                        ...prev,
                        [createdProjectId]: {
                            ...prev[createdProjectId],
                            pages: [page],
                            pageRows: { [page.id]: [] }
                        }
                    }))
                }

                return { ...newProject, firstPageId }

            } catch (error) {
                console.error('Error creating project in Firestore:', error)
                throw error
            }
        } else {
            // Mock Implementation checks...
            const newProject = { ...projectData, id: String(Date.now()) }
            setProjects(prev => [newProject, ...prev])
            setProjectRows(prev => ({ ...prev, [newProject.id]: [] }))
            setProjectPages(prev => ({
                ...prev,
                [newProject.id]: { pages: [], pageRows: {} }
            }))
            return { ...newProject, firstPageId: null }
        }
    }, [dataSource])

    // Update a project
    const updateProject = useCallback((id, updates) => {
        setProjects(prev => prev.map(p =>
            p.id === id ? { ...p, ...updates } : p
        ))

        if (dataSource === 'firestore') {
            dbService.updateProject(id, updates).catch(console.error)
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
            dbService.deleteProject(id).catch(console.error)
        }
    }, [dataSource])

    // Add a project page
    const addProjectPage = useCallback(async (projectId, pageData, rows = []) => {
        if (dataSource === 'firestore') {
            const page = await dbService.addProjectPage(projectId, pageData)
            if (rows.length > 0) {
                await dbService.addPageRows(projectId, page.id, rows)
            }

            // Audit log
            if (user) {
                await logAction(user, AUDIT_ACTIONS.PAGE_ADDED, 'project_pages', page.id, {
                    projectId,
                    content: `Added page: ${pageData.name}`
                })
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
    }, [dataSource, user])

    // Delete a project page
    const deleteProjectPage = useCallback(async (projectId, pageId) => {
        if (dataSource === 'firestore') {
            // Get page name before deletion for audit log
            const page = projectPages[projectId]?.pages.find(p => p.id === pageId)

            await dbService.deleteProjectPage(projectId, pageId)

            // Audit log
            if (user && page) {
                await logAction(user, AUDIT_ACTIONS.PAGE_DELETED, 'project_pages', pageId, {
                    projectId,
                    content: `Deleted page: ${page.name}`
                })
            }

            setProjectPages(prev => {
                const projectData = prev[projectId] || { pages: [], pageRows: {} }
                const newPages = projectData.pages.filter(p => p.id !== pageId)
                const newPageRows = { ...projectData.pageRows }
                delete newPageRows[pageId]
                return {
                    ...prev,
                    [projectId]: { pages: newPages, pageRows: newPageRows }
                }
            })
            // Clear selected page if it was deleted
            setSelectedPageId(prev => {
                if (prev[projectId] === pageId) {
                    return { ...prev, [projectId]: null }
                }
                return prev
            })
        }
    }, [dataSource, user, projectPages])

    // Rename a project page
    const renameProjectPage = useCallback(async (projectId, pageId, newName) => {
        if (dataSource === 'firestore') {
            await dbService.renameProjectPage(projectId, pageId, newName)
            setProjectPages(prev => {
                const projectData = prev[projectId] || { pages: [], pageRows: {} }
                const newPages = projectData.pages.map(p =>
                    p.id === pageId ? { ...p, name: newName } : p
                )
                return {
                    ...prev,
                    [projectId]: { ...projectData, pages: newPages }
                }
            })
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
        const completedRows = allRows.filter(r => r.status === 'completed' || r.status === 'approved').length
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
        deleteProjectPage,
        renameProjectPage,
        selectedPageId,
    }
}
