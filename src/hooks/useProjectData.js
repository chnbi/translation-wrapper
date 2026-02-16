// useProjectData - Hook for managing project data with Firebase
import { useState, useCallback, useEffect } from 'react'
import * as dbService from '@/api/firebase'
import { logAction, AUDIT_ACTIONS } from '@/api/firebase'
import { toast } from 'sonner'
import { useAuth } from '@/context/DevAuthContext'
import { LANGUAGES } from '@/lib/constants'
import { ROLES } from '@/lib/permissions'

/**
 * Manages project data loading and CRUD operations with Firebase
 * @returns Project data state and handlers
 */
export function useProjectData() {
    const { user, role } = useAuth()

    // Helper to check if approval can be bypassed
    const canBypassApproval = (project) => {
        if (!user) return false
        // 1. Manager/Admin can always bypass
        if (role === ROLES.MANAGER || role === ROLES.ADMIN) return true
        // 2. Project Owner can always bypass
        if (project?.ownerId === (user?.id || user?.uid)) return true
        return false
    }
    const [projects, setProjects] = useState([])
    const [projectRows, setProjectRows] = useState({})  // { projectId: rows[] }
    const [projectPages, setProjectPages] = useState({}) // { projectId: { pages: [], pageRows: { pageId: rows[] } } }
    const [selectedPageId, setSelectedPageId] = useState({}) // { projectId: pageId }
    const [isLoading, setIsLoading] = useState(true)
    const [dataSource, setDataSource] = useState('loading')

    // Load data only when user is authenticated (Firestore rules require auth)
    useEffect(() => {
        if (!user) {
            setProjects([])
            setProjectRows({})
            setProjectPages({})
            setSelectedPageId({})
            setDataSource('none')
            setIsLoading(false)
            return
        }

        setIsLoading(true)
        setDataSource('loading')

        async function loadData() {
            try {
                // Loading projects
                const firestoreProjects = await dbService.getProjects()

                if (firestoreProjects.length === 0) {
                    // No projects
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
                                // Migration: Legacy rows need to be moved to Page 1
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
                                    // Migrated rows to Page 1
                                } catch (migrationErr) {
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
                        }
                    }

                    setProjects(projectsWithStats)
                    setProjectRows(allRows)
                    setProjectPages(allPagesData)
                    setDataSource('firestore')
                    // Projects loaded successfully
                }
            } catch (error) {
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
            // Auto-refresh polling
            loadData()
        }, 30000)

        return () => clearInterval(intervalId)
    }, [user])

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

    // Update a project
    const updateProject = useCallback((id, updates) => {
        setProjects(prev => prev.map(p =>
            p.id === id ? { ...p, ...updates } : p
        ))

        if (dataSource === 'firestore') {
            dbService.updateProject(id, updates).catch(() => { })
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
            dbService.deleteProject(id).catch(() => { })
        }
    }, [dataSource])

    // Update a single row
    const updateProjectRow = useCallback(async (projectId, rowId, updates) => {
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

        // Smart Approval Logic
        // If sending for review, check if user is Manager, Admin or Project Owner
        if (updates.status === 'review') {
            const project = projects.find(p => p.id === projectId)
            if (canBypassApproval(project)) {
                updates.status = 'approved'
                updates.approvedBy = {
                    uid: user?.id || user?.uid,
                    email: user?.email,
                    name: user?.displayName || user?.name || user?.email?.split('@')[0]
                }
                updates.approvedAt = new Date().toISOString()
                toast.success("Approval process bypassed (Auto-approved)")
            }
        }

        // Metadata Logic
        updates.lastModifiedBy = {
            uid: user?.id || user?.uid,
            email: user?.email,
            name: user?.displayName || user?.name || user?.email?.split('@')[0]
        }
        updates.lastModifiedAt = new Date().toISOString()

        // Sync Project Metadata (for Dashboard)
        updateProject(projectId, {
            lastModifiedBy: updates.lastModifiedBy,
            lastUpdated: new Date().toISOString() // Force dashboard sort update
        })

        // Update legacy flat rows
        setProjectRows(prev => ({
            ...prev,
            [projectId]: (prev[projectId] || []).map(row => {
                if (row.id !== rowId) return row

                // Logic: If editing content on Approved row, revert to Draft
                const isContentEdit = Object.keys(updates).some(k => ['en', 'my', 'zh', 'remark', 'remarks', 'translations'].includes(k))
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
                                const isContentEdit = Object.keys(updates).some(k => ['en', 'my', 'zh', 'remark', 'remarks', 'translations'].includes(k))
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
                // Update page row
                await dbService.updatePageRow(projectId, pageIdForRow, rowId, updates)
            } else {
                // Row is in legacy flat structure
                // Update legacy row
                await dbService.updateProjectRow(projectId, rowId, updates)
            }
        }
    }, [dataSource, projectPages, projects, user, role, updateProject])

    // Update multiple rows at once
    const updateProjectRows = useCallback((projectId, rowUpdates) => {
        // Enriched updates with Smart Approval and Metadata
        const enrichedUpdates = rowUpdates.map(u => {
            const changes = { ...u.changes }

            // Smart Approval
            if (changes.status === 'review') {
                const project = projects.find(p => p.id === projectId)
                if (canBypassApproval(project)) {
                    changes.status = 'approved'
                    changes.approvedBy = {
                        uid: user?.id || user?.uid,
                        email: user?.email,
                        name: user?.displayName || user?.name || user?.email?.split('@')[0]
                    }
                    changes.approvedAt = new Date().toISOString()
                }
            }

            // Metadata
            changes.lastModifiedBy = {
                uid: user?.id || user?.uid,
                email: user?.email,
                name: user?.displayName || user?.name || user?.email?.split('@')[0]
            }
            changes.lastModifiedAt = new Date().toISOString()

            return { ...u, changes }
        })

        // Check for auto-approval toast
        const autoApprovedCount = enrichedUpdates.filter(u => u.changes.status === 'approved' && rowUpdates.find(orig => orig.id === u.id)?.changes?.status === 'review').length
        if (autoApprovedCount > 0) {
            toast.success(`Approval bypassed for ${autoApprovedCount} row(s)`)
        }

        // Sync Project Metadata (for Dashboard)
        // We take the user info from the current user
        updateProject(projectId, {
            lastModifiedBy: {
                uid: user?.id || user?.uid,
                email: user?.email,
                name: user?.displayName || user?.name || user?.email?.split('@')[0]
            },
            lastUpdated: new Date().toISOString()
        })

        // Update legacy flat rows
        setProjectRows(prev => ({
            ...prev,
            [projectId]: (prev[projectId] || []).map(row => {
                const update = enrichedUpdates.find(u => u.id === row.id)
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
                    const update = enrichedUpdates.find(u => u.id === row.id)
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
            dbService.updateProjectRows(projectId, enrichedUpdates).catch(() => { })
        }
    }, [dataSource, projects, user, role, updateProject])

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
                const savedRows = await dbService.addProjectRows(projectId, rowsWithIds)

                // Replace temp rows with real rows from Firestore
                setProjectRows(prev => {
                    const current = prev[projectId] || []
                    const tempIds = new Set(rowsWithIds.map(r => r.id))
                    const kept = current.filter(r => !tempIds.has(r.id))
                    return {
                        ...prev,
                        [projectId]: [...kept, ...savedRows]
                    }
                })
            } catch (error) {
                // Optionally revert optimistic update here
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
                const savedRows = await dbService.addPageRows(projectId, pageId, rowsWithIds)

                // Replace temp rows with real rows from Firestore
                setProjectPages(prev => {
                    const projData = prev[projectId]
                    if (!projData) return prev

                    const currentRows = projData.pageRows?.[pageId] || []
                    const tempIds = new Set(rowsWithIds.map(r => r.id))
                    const kept = currentRows.filter(r => !tempIds.has(r.id))

                    return {
                        ...prev,
                        [projectId]: {
                            ...projData,
                            pageRows: {
                                ...(projData.pageRows || {}),
                                [pageId]: [...kept, ...savedRows]
                            }
                        }
                    }
                })

                // Audit log
                if (user) {
                    await logAction(user, AUDIT_ACTIONS.ROWS_IMPORTED, 'project_rows', pageId, {
                        projectId,
                        content: `Added ${rowsWithIds.length} row(s) to page`
                    })
                }

                toast.success(`Added ${rowsWithIds.length} row(s)`)
            } catch (error) {
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
                toast.error('Failed to delete rows')
            }
        }
    }, [dataSource, user])

    // Add a new project
    const addProject = useCallback(async (project) => {
        const { sheets, ...projectMeta } = project

        const projectData = {
            ...projectMeta,
            ownerId: user?.id, // Pass current user as owner
            createdBy: {
                uid: user?.id || user?.uid,
                email: user?.email,
                name: user?.displayName || user?.name || user?.email?.split('@')[0]
            },
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

                        // Add Rows - map import columns to schema
                        const cleanRows = rows.map((row) => {
                            const translations = {}
                            // Detect standard languages from constants
                            Object.keys(LANGUAGES).forEach(code => {
                                if (code === 'en') return // Source
                                if (row[code]) {
                                    translations[code] = {
                                        text: row[code],
                                        status: 'draft',
                                        remark: ''
                                    }
                                }
                            })

                            // Map source text
                            const source_text = row.en || row.source_text || ""

                            return {
                                source_text,
                                translations,
                                status: 'draft',
                                context: row.context || "",
                                promptId: row.promptId || ""
                            }
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
