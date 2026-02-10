import { useState, useRef, useEffect } from "react"
import { FileSpreadsheet, Download, Square, CheckSquare, Loader2, X, Upload, Plus, Filter, Check, Search, Send, MoreHorizontal, Pencil, Trash2, FileText, Presentation } from "lucide-react"
import { PageHeader, SearchInput } from "@/components/ui/common"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { COLORS, PillButton, TableActionButton, PrimaryButton, PageContainer, Card, IconButton } from "@/components/ui/shared"
import { useProjects } from "@/context/ProjectContext"
import { usePrompts } from "@/context/PromptContext"
import { useGlossary } from "@/context/GlossaryContext"
import { useApprovalNotifications } from "@/hooks/useApprovalNotifications"
import { useAuth } from "@/App"
import * as XLSX from "xlsx"
import { parseExcelFile } from "@/lib/excel"
import { exportToDocx, exportToPptx } from "@/lib/document"
import { getAI } from "@/api/ai"
import { toast } from "sonner"
import { DataTable, TABLE_STYLES } from "@/components/ui/DataTable"
import { PromptCategoryDropdown } from "@/components/ui/PromptCategoryDropdown"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { StatusFilterDropdown } from "@/components/ui/StatusFilterDropdown"
import { getStatusConfig, LANGUAGES } from "@/lib/constants"

import { ConfirmDialog, ProjectSettingsDialog, SendForReviewDialog } from "@/components/dialogs"
import { getUsers } from "@/api/firebase"
import { GlossaryHighlighter } from "@/components/ui/GlossaryHighlighter"
import { ExportMenu } from "@/components/project"
import Pagination from "@/components/Pagination"


export default function ProjectView({ projectId }) {
    const {
        getProject,
        getProjectRows,
        updateProjectRow,
        addProjectRows,
        getProjectPages,
        getPageRows,
        getSelectedPageId,
        selectPage,
        addProjectPage,
        addPageRows,
        getSelectedRowIds,
        toggleRowSelection,
        selectAllRows,
        deselectAllRows,
        deleteRows,
        renameProjectPage,
        updateProject,
        isLoading,
    } = useProjects()

    const { templates } = usePrompts()
    const { approvedTerms: glossaryTerms } = useGlossary() // Use APPOVED terms for highlighting
    const { canDo } = useAuth()
    const { markAsViewed, isRowNew } = useApprovalNotifications()

    const [isAddingRow, setIsAddingRow] = useState(false)
    const [newRowData, setNewRowData] = useState({ en: '', my: '', zh: '' })
    const newRowInputRef = useRef(null)
    const [isImporting, setIsImporting] = useState(false)
    const [isTranslating, setIsTranslating] = useState(false)
    const [isSettingsOpen, setIsSettingsOpen] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState([]) // Multi-selectable status filter
    const [waitTimeout, setWaitTimeout] = useState(false) // Timeout for waiting for project
    const [deleteConfirm, setDeleteConfirm] = useState(null) // { type: 'bulk' | 'single', data: any }
    const [duplicateConfirm, setDuplicateConfirm] = useState(null) // { row: object, duplicate: object }
    const [editingRowId, setEditingRowId] = useState(null) // Row being edited inline
    const [editingRowData, setEditingRowData] = useState(null) // Data for row being edited

    const [editWarning, setEditWarning] = useState(null) // { open: boolean, row: object }

    // Manager Assignment
    const [sendForReviewOpen, setSendForReviewOpen] = useState(false)
    const [managers, setManagers] = useState([])
    const [rowsToSend, setRowsToSend] = useState([]) // Store rows to send temporarily

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(25)



    // Prompt Selection State
    const [selectedPromptId, setSelectedPromptId] = useState(null)

    // Set default prompt when templates load
    useEffect(() => {
        if (!selectedPromptId && templates.length > 0) {
            const defaultT = templates.find(t => t.isDefault)
            if (defaultT) setSelectedPromptId(defaultT.id)
        }
    }, [templates, selectedPromptId])

    const fileInputRef = useRef(null)

    // Parse project ID and page ID from URL
    // Parse project ID and page ID from URL
    const hashParts = window.location.hash.split('?')
    const pathPart = hashParts[0].replace(/^#/, '')
    const idFromUrl = pathPart.startsWith('project/') ? pathPart.split('/')[1] : null
    const id = projectId || idFromUrl

    const urlParams = new URLSearchParams(hashParts[1] || '')
    const pageIdFromUrl = urlParams.get('page')

    const project = getProject(id)
    const targetLanguages = project?.targetLanguages || ['my', 'zh'] // Get early for use in filters
    const pages = getProjectPages(id)
    const currentPageId = getSelectedPageId(id)

    // Title is now static (read-only) - derived from page or project
    const currentTitle = currentPageId
        ? pages.find(p => p.id === currentPageId)?.name || project?.name || ''
        : project?.name || ''

    // Sync page selection from URL
    useEffect(() => {
        if (pageIdFromUrl && pages.length > 0 && pageIdFromUrl !== currentPageId) {
            const pageExists = pages.some(p => p.id === pageIdFromUrl)
            if (pageExists) {
                selectPage(id, pageIdFromUrl)
            }
        }
    }, [pageIdFromUrl, pages, id, currentPageId, selectPage])

    // Track view for approval notifications
    useEffect(() => {
        if (id && currentPageId) {
            markAsViewed(id, currentPageId)
        }
    }, [id, currentPageId, markAsViewed])

    // Timeout for waiting for newly created project (race condition)
    useEffect(() => {
        if (!project && id && id.length > 10) {
            const timer = setTimeout(() => setWaitTimeout(true), 3000)
            return () => clearTimeout(timer)
        } else {
            setWaitTimeout(false)
        }
    }, [project, id])

    const legacyRows = getProjectRows(id)

    const allRows = pages.length > 0 && currentPageId
        ? getPageRows(id, currentPageId)
        : legacyRows

    // Helper to get translation text (from JSON or legacy field)
    const getTranslationText = (row, langCode) => {
        return row.translations?.[langCode]?.text || row[langCode] || ''
    }

    // Apply search and status filters - search across source + target languages
    const rows = (allRows || []).filter(row => {
        if (!row) return false
        const searchLower = searchQuery.toLowerCase()
        const sourceText = row.source_text || row.en || ''
        const matchesSearch = !searchQuery ||
            sourceText.toLowerCase().includes(searchLower) ||
            targetLanguages.some(lang => getTranslationText(row, lang).toLowerCase().includes(searchLower))

        // Status filter - if no selection, show all
        const matchesStatus = statusFilter.length === 0 || statusFilter.includes(row.status || 'draft')

        return matchesSearch && matchesStatus
    })

    // Pagination: Slice rows for current page
    const totalRows = rows.length
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paginatedRows = rows.slice(startIndex, endIndex)

    const selectedRowIds = getSelectedRowIds(id)
    const selectedCount = selectedRowIds.size
    const hasSelection = selectedCount > 0

    // Reset to page 1 when filters change or items per page changes
    useEffect(() => {
        setCurrentPage(1)
    }, [searchQuery, statusFilter.length, currentPageId, itemsPerPage])

    // targetLanguages is already declared above near project fetch

    // Helper: Check if row has all target translations filled
    const isRowFilled = (row) => {
        return targetLanguages.every(lang => row[lang]?.trim())
    }

    // Helper variables for Action Bar Logic
    // hasRows uses ORIGINAL data - for UI elements that should always show (like Filter button)
    // hasFilteredRows uses filtered data - for action buttons that operate on visible data
    const hasRows = (allRows || []).length > 0
    const hasFilteredRows = rows.length > 0

    // Check if ALL filtered rows have translations filled (only for selected target languages)
    const allFilled = hasFilteredRows && rows.every(isRowFilled)

    // Check if SELECTED rows have translations filled
    const selectionFilled = hasSelection && rows
        .filter(r => selectedRowIds.has(r.id))
        .every(isRowFilled)

    // 'review' or 'approved' counts as translated for button logic
    const allTranslated = hasFilteredRows && rows.every(r =>
        (r.status === 'review' || r.status === 'approved') ||
        isRowFilled(r)
    )
    const allApproved = hasFilteredRows && rows.every(r => r.status === 'approved')

    // Show loading state while Firestore data is being fetched
    const projectIdValid = id && id.length > 10
    const isWaitingForProject = !isLoading && !project && projectIdValid && !waitTimeout

    if (isLoading || isWaitingForProject) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Loading project...</p>
            </div>
        )
    }

    if (!project) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mb-4">
                    <FileSpreadsheet className="w-8 h-8 text-muted-foreground" />
                </div>
                <h2 className="text-xl font-semibold mb-2">Project Not Found</h2>
                <p className="text-muted-foreground mb-4">The project you're looking for doesn't exist.</p>
                <Button variant="outline" onClick={() => window.location.hash = '#projects'}>
                    Back to Projects
                </Button>
            </div>
        )
    }

    // Handlers
    const handleSelectAll = () => {
        if (selectedCount === rows.length) {
            deselectAllRows(id)
        } else {
            selectAllRows(id)
        }
    }

    const handleExport = () => {
        // Build export data dynamically based on target languages
        const exportData = allRows.map(row => {
            const rowData = { 'English': row.en || row.text || '' }
            // Add only selected target languages
            targetLanguages.forEach(lang => {
                const label = LANGUAGES[lang]?.nativeLabel || LANGUAGES[lang]?.label || lang
                rowData[label] = row[lang] || ''
            })
            rowData['Status'] = row.status
            return rowData
        })
        const ws = XLSX.utils.json_to_sheet(exportData)

        // Apply grey background to header row dynamically
        const numCols = 2 + targetLanguages.length // English + targets + Status
        const headerRange = Array.from({ length: numCols }, (_, i) =>
            String.fromCharCode(65 + i) + '1'
        )
        headerRange.forEach(cell => {
            if (ws[cell]) {
                ws[cell].s = {
                    fill: { fgColor: { rgb: 'E5E7EB' } }, // Grey-200
                    font: { bold: true }
                }
            }
        })

        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Translations")
        XLSX.writeFile(wb, `${project.name}_export.xlsx`)
    }

    const handleExportDocx = async (targetLang) => {
        // Export as bilingual Word document for a specific target language
        const exportRows = allRows.map(row => ({
            en: row.en || row.text || '',
            translations: {
                [targetLang]: {
                    text: row[targetLang] || row.translations?.[targetLang]?.text || ''
                }
            }
        }))

        try {
            await exportToDocx(exportRows, `${project.name}_${targetLang}`, {
                targetLanguage: targetLang,
                format: 'bilingual',
                title: `${project.name} - Translations`
            })
            toast.success(`Exported to ${project.name}_${targetLang}.docx`)
        } catch (error) {
            console.error('DOCX export error:', error)
            toast.error('Failed to export Word document')
        }
    }

    const handleExportPptx = async (targetLang) => {
        // Export as bilingual PowerPoint presentation
        const exportRows = allRows.map(row => ({
            en: row.en || row.text || '',
            translations: {
                [targetLang]: {
                    text: row[targetLang] || row.translations?.[targetLang]?.text || ''
                }
            }
        }))

        try {
            await exportToPptx(exportRows, `${project.name}_${targetLang}`, {
                targetLanguage: targetLang
            })
            toast.success(`Exported to ${project.name}_${targetLang}.pptx`)
        } catch (error) {
            console.error('PPTX export error:', error)
            toast.error('Failed to export PowerPoint')
        }
    }

    const handleImportSheet = async (event) => {
        const file = event.target.files?.[0]
        if (!file) return

        setIsImporting(true)
        try {
            const parsedData = await parseExcelFile(file)
            for (const [sheetName, sheetData] of Object.entries(parsedData)) {
                const newRows = sheetData.entries.map((entry, idx) => ({
                    en: entry.english || entry.en || '',
                    my: entry.malay || entry.my || '',
                    zh: entry.chinese || entry.zh || '',
                    status: 'draft',
                })).filter(row => row.en)

                if (newRows.length > 0) {
                    if (typeof addProjectPage === 'function') {
                        await addProjectPage(id, { name: sheetName }, newRows)
                    } else {
                        await addProjectRows(id, newRows)
                    }
                }
            }
        } catch (error) {
            console.error('Error importing file:', error)
        } finally {
            setIsImporting(false)
            fileInputRef.current.value = ''
        }
    }

    // Handle inline row addition
    const handleStartAddRow = () => {
        setIsAddingRow(true)
        // Initialize with only en and the project's target languages
        const initialRow = { en: '' }
        targetLanguages.forEach(lang => initialRow[lang] = '')
        setNewRowData(initialRow)
        setTimeout(() => newRowInputRef.current?.focus(), 50)
    }

    const findDuplicateRow = (newRow, existingRows) => {
        return existingRows.find(existing => {
            // Check English (source) for duplicates
            if (newRow.en && existing.en &&
                newRow.en.toLowerCase().trim() === existing.en.toLowerCase().trim()) {
                return true
            }
            // Check target languages for duplicates
            for (const lang of targetLanguages) {
                if (newRow[lang] && existing[lang] &&
                    newRow[lang].toLowerCase().trim() === existing[lang].toLowerCase().trim()) {
                    return true
                }
            }
            return false
        })
    }

    const handleSaveNewRow = async () => {
        if (!newRowData.en.trim()) {
            setIsAddingRow(false)
            return
        }
        // Build translations JSON structure
        const translations = {}
        targetLanguages.forEach(lang => {
            translations[lang] = {
                text: (newRowData[lang] || '').trim(),
                status: 'draft'
            }
        })

        // Build row with JSON translations AND legacy fields for compatibility
        const newRow = {
            source_text: newRowData.en.trim(),
            en: newRowData.en.trim(), // Legacy
            status: 'draft',
            promptId: 'default',
            translations: translations,
        }
        // Legacy field writes
        targetLanguages.forEach(lang => {
            newRow[lang] = (newRowData[lang] || '').trim()
        })

        const duplicate = findDuplicateRow(newRow, rows)
        if (duplicate) {
            setDuplicateConfirm({ row: newRow, duplicate })
            return
        }

        await addRowToProject(newRow)
    }

    const handleCancelAddRow = () => {
        setIsAddingRow(false)
        const initialRow = { en: '' }
        targetLanguages.forEach(lang => initialRow[lang] = '')
        setNewRowData(initialRow)
    }

    const handleNewRowKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSaveNewRow()
        } else if (e.key === 'Escape') {
            handleCancelAddRow()
        }
    }

    const handleBulkDelete = async () => {
        if (selectedCount === 0) return
        setDeleteConfirm({ type: 'bulk', count: selectedCount })
    }

    const performDelete = async () => {
        try {
            const idsToDelete = deleteConfirm.type === 'single' ? [deleteConfirm.id] : Array.from(selectedRowIds)
            await deleteRows(id, idsToDelete)

            if (deleteConfirm.type === 'bulk') {
                deselectAllRows(id)
            }

            toast.success(`Deleted ${idsToDelete.length} rows`)
        } catch (error) {
            console.error('Delete failed:', error)
            toast.error('Failed to delete rows')
        }
        setDeleteConfirm(null)
    }

    // Helper function to add row (used after duplicate confirmation too)
    const addRowToProject = async (newRow) => {
        if (pages.length > 0 && currentPageId) {
            await addPageRows(id, currentPageId, [newRow])
        } else {
            await addProjectRows(id, [newRow])
        }
        setNewRowData({ en: '', my: '', zh: '' })
        setIsAddingRow(false)
        setDuplicateConfirm(null)
    }

    const getPromptName = (promptId) => {
        if (!promptId) return null
        const prompt = templates.find(t => t.id === promptId)
        return prompt?.name || null
    }

    // Edit Row Handlers
    const startEditing = (row) => {
        setEditingRowId(row.id)
        setEditingRowData({ ...row })
    }

    const handleStartEdit = (row) => {
        if (row.status === 'approved') {
            setEditWarning({ open: true, row })
            return
        }
        startEditing(row)
    }

    const handleCancelEdit = () => {
        setEditingRowId(null)
        setEditingRowData(null)
    }

    const handleSaveEdit = async () => {
        if (!editingRowId || !editingRowData) return

        try {
            // Build translations JSON from edited data
            const updatedTranslations = { ...(editingRowData.translations || {}) }
            targetLanguages.forEach(lang => {
                updatedTranslations[lang] = {
                    ...(updatedTranslations[lang] || {}),
                    text: editingRowData[lang] || '',
                    // Reset to draft if edited
                    status: 'draft'
                }
            })

            await updateProjectRow(id, editingRowId, {
                source_text: editingRowData.en,
                en: editingRowData.en, // Legacy field
                translations: updatedTranslations,
                status: 'draft', // Reset row status
                // Also write legacy fields for compatibility
                ...Object.fromEntries(targetLanguages.map(lang => [lang, editingRowData[lang] || '']))
            })
            toast.success('Row updated')
            setEditingRowId(null)
            setEditingRowData(null)
        } catch (error) {
            console.error('Update failed:', error)
            toast.error('Failed to update row')
        }
    }

    const handleEditKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSaveEdit()
        } else if (e.key === 'Escape') {
            handleCancelEdit()
        }
    }

    // Send selected rows for review
    // Send rows for review
    const handleSendForReview = async () => {
        let candidates = []

        if (selectedCount > 0) {
            candidates = rows.filter(row => selectedRowIds.has(row.id))
        } else {
            candidates = rows.filter(r => r.status !== 'review' && r.status !== 'approved')
            if (candidates.length === 0) {
                candidates = rows.filter(r => r.status !== 'approved')
            }
        }

        if (candidates.length === 0) {
            toast.error('No eligible rows to send for review')
            return
        }

        // Store rows and fetch managers, then open dialog
        setRowsToSend(candidates)

        // Fetch managers if not loaded
        if (managers.length === 0) {
            try {
                const allUsers = await getUsers()
                const mgrs = allUsers.filter(u => u.role === 'manager')
                setManagers(mgrs)
            } catch (error) {
                console.error("Failed to load managers", error)
                toast.error("Failed to load managers checklist")
            }
        }

        setSendForReviewOpen(true)
    }

    const handleConfirmSendForReview = async (assignments) => {
        let successCount = 0
        const loadingToast = toast.loading("Assigning managers...")

        try {
            for (const row of rowsToSend) {
                const updates = {
                    status: 'review',
                    translations: row.translations || {}
                }

                // Apply assignment to each target language
                targetLanguages.forEach(lang => {
                    const managerId = assignments[lang]
                    if (managerId) {
                        if (!updates.translations[lang]) updates.translations[lang] = {}

                        updates.translations[lang] = {
                            ...(updates.translations[lang] || {}),
                            text: updates.translations[lang].text || row[lang] || '', // Ensure text is preserved if object created
                            status: 'review',
                            assignedManagerId: managerId,
                            assignedAt: new Date().toISOString()
                        }
                    }
                })

                await updateProjectRow(id, row.id, updates)
                successCount++
            }

            deselectAllRows(id)
            setSendForReviewOpen(false)
            toast.dismiss(loadingToast)
            toast.success(`Sent ${successCount} rows for review with assignments`)
        } catch (error) {
            console.error(error)
            toast.dismiss(loadingToast)
            toast.error("Failed to send for review")
        }
    }

    // Translation handler
    const handleTranslateAll = async () => {
        setIsTranslating(true)
        try {
            // Determine which rows to translate
            let rowsToTranslate
            const hasSelection = selectedCount > 0

            if (hasSelection) {
                // Selected rows - override existing translations
                rowsToTranslate = rows.filter(row => selectedRowIds.has(row.id))
                console.log(`[Translate] Translating ${rowsToTranslate.length} selected rows (override mode)`)
                toast.info(`Translating ${rowsToTranslate.length} selected rows...`)
            } else {
                // No selection - translate only empty cells
                rowsToTranslate = rows.filter(row => !row.my?.trim() || !row.zh?.trim())
                console.log(`[Translate] Translating ${rowsToTranslate.length} rows with empty translations`)
                if (rowsToTranslate.length === 0) {
                    toast.info('All rows already have translations!')
                    setIsTranslating(false)
                    return
                }
                toast.info(`Translating ${rowsToTranslate.length} empty rows...`)
            }

            // Get templates - published templates + always include default (even if draft)
            const defaultTemplate = templates.find(t => t.isDefault)
            const publishedTemplates = templates.filter(t => t.status !== 'draft' || t.isDefault)

            // Determine which prompt to use:
            // 1. If selected rows have a promptId set, use that (per-row selection)
            // 2. Otherwise use Action Bar dropdown selection
            // 3. Fallback to default template
            let effectivePromptId = selectedPromptId

            // Check if selected rows have a specific promptId assigned
            if (hasSelection && rowsToTranslate.length > 0) {
                const rowPromptIds = rowsToTranslate.map(r => r.promptId).filter(Boolean)
                if (rowPromptIds.length > 0) {
                    // Use the first row's promptId (all selected rows should ideally have the same)
                    const firstRowPromptId = rowPromptIds[0]
                    // Check if all selected rows have the same promptId
                    const allSame = rowPromptIds.every(id => id === firstRowPromptId)
                    if (allSame) {
                        effectivePromptId = firstRowPromptId
                        console.log('[DEBUG] Using per-row promptId:', effectivePromptId)
                    } else {
                        console.log('[DEBUG] Selected rows have different promptIds, using first:', firstRowPromptId)
                        effectivePromptId = firstRowPromptId
                    }
                }
            }

            console.log('[DEBUG] Effective promptId:', effectivePromptId)
            console.log('[DEBUG] All templates:', templates.map(t => ({ id: t.id, name: t.name, isDefault: t.isDefault, status: t.status })))

            // Get base default template (MANDATORY - no fallback)
            const baseDefaultTemplate = defaultTemplate || publishedTemplates[0]

            if (!baseDefaultTemplate) {
                toast.error("No default template found. Please create one in Prompt Library.")
                setIsTranslating(false)
                return
            }

            // Group rows by their promptId for separate translation batches
            const rowsByPromptId = {}
            for (const row of rowsToTranslate) {
                const promptKey = row.promptId || 'default'
                if (!rowsByPromptId[promptKey]) {
                    rowsByPromptId[promptKey] = []
                }
                rowsByPromptId[promptKey].push(row)
            }

            console.log('[DEBUG] Row groups by promptId:', Object.keys(rowsByPromptId).map(k => `${k}: ${rowsByPromptId[k].length} rows`))

            // Translate each group with its respective prompt
            let totalSuccessCount = 0

            for (const [promptKey, groupRows] of Object.entries(rowsByPromptId)) {
                const effectivePromptId = promptKey === 'default' ? null : promptKey

                // Get user-selected template for this group
                const selectedTemplate = effectivePromptId ? publishedTemplates.find(t => t.id === effectivePromptId) : null
                console.log(`[DEBUG] Group "${promptKey}": ${groupRows.length} rows, template:`, selectedTemplate?.name || 'Default only')

                // Merge prompts: Default base (ALWAYS) + Custom additions (if selected and different)
                let mergedPrompt = baseDefaultTemplate.prompt || ''
                let templateName = baseDefaultTemplate.name

                if (selectedTemplate && selectedTemplate.id !== baseDefaultTemplate.id) {
                    // Custom template - append its instructions to default
                    mergedPrompt = `${baseDefaultTemplate.prompt}\n\n## Additional Custom Instructions (${selectedTemplate.name})\n${selectedTemplate.prompt}`
                    templateName = `${baseDefaultTemplate.name} + ${selectedTemplate.name}`
                }

                const templateToUse = {
                    ...baseDefaultTemplate,
                    name: templateName,
                    prompt: mergedPrompt
                }

                console.log(`[Translate] Group "${promptKey}" using template: ${templateToUse.name}`)

                // Call translation API for this group - use project's target languages
                const ai = getAI();
                const results = await ai.generateBatch(
                    groupRows.map(row => ({ id: row.id, text: row.en || row.text || row.source_text || '', context: row.context })),
                    {
                        template: templateToUse,
                        targetLanguages: targetLanguages,
                        glossaryTerms: glossaryTerms.map(t => ({
                            english: t.en || t.english,
                            translations: {
                                ms: t.my || t.malay,
                                zh: t.cn || t.zh || t.chinese
                            }
                        }))
                    }
                )

                // Update rows with translations - dynamically handle target languages
                for (const result of results) {
                    if (!result.id) continue; // Skip invalid results

                    // Result format: { id, translations: { my: { text, status }, zh: { text, status } } }
                    const updates = {
                        translatedAt: new Date().toISOString(),
                        translations: result.translations // V2: Save the whole object
                    }

                    // V1 Fallback (optional, keep for safety if schema not fully migrated)
                    targetLanguages.forEach(lang => {
                        const tData = result.translations?.[lang];
                        if (tData) {
                            updates[lang] = tData.text; // Legacy Flattening
                        }
                    })

                    try {
                        await updateProjectRow(id, result.id, updates)
                        totalSuccessCount++
                    } catch (err) {
                        // Silent fail for individual row update to allow others to proceed
                    }
                }
            }

            toast.success(`Successfully translated ${totalSuccessCount} rows!`)
            console.log(`[Translate] Completed: ${totalSuccessCount}/${rowsToTranslate.length} rows`)

        } catch (error) {
            console.error('❌ [Translate] Error:', error)
            if (error.message === 'API_NOT_CONFIGURED') {
                toast.error('Gemini API key not configured. Add VITE_GEMINI_API_KEY to .env')
            } else if (error.message === 'RATE_LIMIT') {
                toast.error('Rate limited. Please wait a moment and try again.')
            } else {
                toast.error('Translation failed: ' + error.message)
            }
        } finally {
            setIsTranslating(false)
            deselectAllRows(id)
        }
    }



    // Column Definitions - dynamic based on project.targetLanguages
    // Build language columns dynamically
    const languageColumns = [
        // English source column (always shown)
        {
            header: "English",
            accessor: "en",
            width: "220px",
            minWidth: "180px",
            color: 'hsl(220, 9%, 46%)',
            render: row => {
                if (row.id === editingRowId) {
                    return (
                        <div className="relative w-full h-full min-h-[80px]">
                            <Textarea
                                value={editingRowData?.en || editingRowData?.text || ''}
                                onChange={(e) => setEditingRowData(prev => ({ ...prev, en: e.target.value }))}
                                onKeyDown={handleEditKeyDown}
                                className="w-full h-full min-h-[80px] bg-white resize-y p-3 rounded-lg border border-primary/40 focus:border-primary focus:ring-4 focus:ring-primary/10 shadow-sm transition-all text-[13px] leading-relaxed"
                                placeholder="Enter source text..."
                                autoFocus
                            />
                        </div>
                    )
                }
                return (
                    <div className="whitespace-pre-wrap leading-relaxed">
                        <GlossaryHighlighter
                            text={row.source_text || row.en || row.text || ''}
                            language="en"
                            glossaryTerms={glossaryTerms}
                        />
                    </div>
                )
            }
        },
        // Dynamic target language columns - reads from translations JSON or legacy field
        ...targetLanguages.map(langCode => ({
            header: LANGUAGES[langCode]?.label || langCode,
            accessor: langCode,
            width: langCode === 'my' ? "200px" : "180px",
            minWidth: langCode === 'my' ? "160px" : "140px",
            color: 'hsl(220, 9%, 46%)',
            render: row => {
                // For editing, use flat data structure
                if (row.id === editingRowId) {
                    return (
                        <div className="relative w-full h-full min-h-[80px]">
                            <Textarea
                                value={editingRowData?.[langCode] || ''}
                                onChange={(e) => setEditingRowData(prev => ({ ...prev, [langCode]: e.target.value }))}
                                onKeyDown={handleEditKeyDown}
                                className="w-full h-full min-h-[80px] bg-white resize-y p-3 rounded-lg border border-primary/40 focus:border-primary focus:ring-4 focus:ring-primary/10 shadow-sm transition-all text-sm leading-relaxed"
                                placeholder="Enter translation..."
                                autoFocus
                            />
                        </div>
                    )
                }
                // Read from translations JSON first, fallback to legacy field
                const displayText = row.translations?.[langCode]?.text || row[langCode] || ''
                return (
                    <div className="whitespace-pre-wrap leading-relaxed">
                        <GlossaryHighlighter
                            text={displayText || '—'}
                            language={langCode}
                            glossaryTerms={glossaryTerms}
                        />
                    </div>
                )
            }
        }))
    ]

    // Check if any row has remarks to decide whether to show the column
    // Use all rows (not filtered) to keep column structure stable
    const hasRemarks = rows.some(row => {
        const remarkText = row.remarks || row.remark || ''
        return String(remarkText).trim().length > 0
    })

    const columns = [
        ...languageColumns,
        {
            header: "Status",
            accessor: "status",
            width: "140px",
            minWidth: "140px",
            render: (row) => {
                const config = getStatusConfig(row.status)
                return (
                    <div className="flex items-center gap-2">
                        <span
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: config.color }}
                        />
                        <span className="font-medium text-muted-foreground">
                            {config.label}
                        </span>
                    </div>
                )
            }
        },
        // Remarks column - only present if hasRemarks
        ...(hasRemarks ? [{
            header: "Remarks",
            accessor: "remarks",
            width: "200px",
            minWidth: "150px",
            render: (row) => {
                // Safely convert to string
                const remarkText = row.remarks ? String(row.remarks) : ''
                if (!remarkText.trim()) return <span style={{ color: 'hsl(220, 13%, 91%)' }}>—</span>

                return (
                    <div className="text-muted-foreground italic truncate max-w-[200px]" title={remarkText}>
                        {remarkText}
                    </div>
                )
            }
        }] : []),
        {
            header: "Template",
            accessor: "promptId",
            width: "150px",
            minWidth: "150px",
            render: (row) => (
                <PromptCategoryDropdown
                    currentPromptId={row.promptId}
                    templates={templates}
                    onSelect={(promptId) => {
                        updateProjectRow(id, row.id, { promptId })
                        console.log(`[Prompt] Row ${row.id} → ${promptId || 'default'}`)
                    }}
                />
            )
        },

        {
            header: "",
            accessor: "actions",
            width: "80px",
            minWidth: "80px",
            align: "center",
            render: (row) => {
                if (row.id === editingRowId) {
                    return (
                        <div className="flex flex-col gap-3 items-center justify-center">
                            <button
                                onClick={handleSaveEdit}
                                className="text-xs bg-emerald-500 text-white px-2 py-1 rounded hover:bg-emerald-600"
                            >
                                Save
                            </button>
                            <button
                                onClick={handleCancelEdit}
                                className="text-xs text-muted-foreground hover:text-foreground"
                            >
                                Cancel
                            </button>
                        </div>
                    )
                }
                return (
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <IconButton>
                                <MoreHorizontal className="w-4 h-4 text-slate-500" />
                            </IconButton>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="min-w-[140px]">
                            <DropdownMenuItem
                                onClick={() => handleStartEdit(row)}
                                className="cursor-pointer"
                            >
                                <Pencil className="w-3.5 h-3.5 mr-2 text-slate-500" />
                                Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={() => {
                                    setDeleteConfirm({ type: 'single', id: row.id, count: 1 })
                                }}
                                className="cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50"
                            >
                                <Trash2 className="w-3.5 h-3.5 mr-2" />
                                Delete
                            </DropdownMenuItem>
                        </DropdownMenuContent>
                    </DropdownMenu>
                )
            }
        }
    ]

    return (
        <PageContainer>
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleImportSheet}
                accept=".xlsx,.xls,.csv,.docx,.pptx"
                className="hidden"
            />

            {/* Page Title - Static */}
            <PageHeader description={project?.description || "Manage your project translations and pages"}>{currentTitle}</PageHeader>

            {/* Action Bar */}
            <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 py-4 min-h-[80px]">
                <span className="text-sm font-medium text-slate-500">
                    {selectedCount > 0 ? `${selectedCount} row(s) selected` : `${rows.length} row(s)`}
                </span>

                <div className="flex flex-wrap items-center gap-2">
                    {/* Search */}
                    <SearchInput
                        value={searchQuery}
                        onChange={(val) => {
                            setSearchQuery(val)
                            setCurrentPage(1)
                        }}
                        placeholder="Search translations..."
                        className="w-[200px]"
                    />

                    {/* Filter - Available when rows exist and NO selection */}
                    {hasRows && !hasSelection && (
                        <>
                            <PromptCategoryDropdown
                                currentPromptId={selectedPromptId}
                                templates={templates.filter(t => t.status !== 'draft')}
                                onSelect={setSelectedPromptId}
                            />
                            <StatusFilterDropdown
                                selectedStatuses={statusFilter}
                                onStatusChange={setStatusFilter}
                            />
                        </>
                    )}

                    {/* Import */}
                    {!hasSelection && (
                        <PillButton
                            variant="outline"
                            onClick={() => fileInputRef.current?.click()}
                            disabled={isImporting}
                        >
                            <Upload className="w-3.5 h-3.5 mr-2" /> Import
                        </PillButton>
                    )}



                    {/* Selection Actions */}
                    {hasSelection && (
                        <>
                            <PillButton
                                variant="outline"
                                onClick={handleBulkDelete}
                                className="text-red-600 hover:bg-red-50 border-red-200"
                            >
                                <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete {selectedCount}
                            </PillButton>

                            {/* Translate - Always available when selected (not all approved) */}
                            {!allApproved && (
                                <PrimaryButton
                                    className="h-8 text-xs px-4 bg-blue-600 hover:bg-blue-700"
                                    onClick={handleTranslateAll}
                                    disabled={isTranslating}
                                >
                                    <span className="text-sm mr-1">✦</span> Translate {selectedCount}
                                </PrimaryButton>
                            )}

                            {/* Send to Review - Only if selected rows are filled (RIGHTMOST) */}
                            {selectionFilled && (
                                <PrimaryButton
                                    className="h-8 text-xs px-4 ml-2"
                                    onClick={handleSendForReview}
                                >
                                    <Send className="w-3.5 h-3.5 mr-2" /> Send {selectedCount} to Review
                                </PrimaryButton>
                            )}
                        </>
                    )}

                    {/* Export - Available when NO selection and ALL FILLED (but NOT all Approved, avoid duplicate) */}
                    {hasFilteredRows && !hasSelection && allFilled && !allApproved && (
                        <ExportMenu
                            targetLanguages={targetLanguages}
                            onExportExcel={handleExport}
                            onExportDocx={handleExportDocx}
                            onExportPptx={handleExportPptx}
                            className="ml-2"
                        />
                    )}

                    {/* Check if we need Translate button (No Selection, Not all translated) */}
                    {hasFilteredRows && !hasSelection && !allFilled && (
                        <PrimaryButton
                            className="h-8 text-xs px-4 bg-blue-600 hover:bg-blue-700"
                            onClick={handleTranslateAll}
                            disabled={isTranslating}
                        >
                            {isTranslating ? (
                                <><Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> Translating...</>
                            ) : (
                                <><span className="text-sm mr-1">✦</span> Translate</>
                            )}
                        </PrimaryButton>
                    )}

                    {/* Send for Review (No Selection) - if translated but not approved */}
                    {hasFilteredRows && !hasSelection && allTranslated && !allApproved && (
                        <PrimaryButton
                            className="h-8 text-xs px-4"
                            onClick={handleSendForReview}
                            disabled={isTranslating}
                        >
                            <Send className="w-3.5 h-3.5 mr-2" /> Send for Review
                        </PrimaryButton>
                    )}

                    {/* Case 6: Approved (All Approved) -> Export */}
                    {allApproved && (
                        <ExportMenu
                            targetLanguages={targetLanguages}
                            onExportExcel={handleExport}
                            onExportDocx={handleExportDocx}
                            onExportPptx={handleExportPptx}
                        />
                    )}
                </div>
            </div>

            {/* DataTable with appended "Add Row" support */}
            <DataTable
                columns={columns}
                data={paginatedRows}
                selectedIds={selectedRowIds}
                onToggleSelect={(id) => toggleRowSelection(project.id, id)}
                onToggleSelectAll={handleSelectAll}
                onRowClick={(row) => toggleRowSelection(project.id, row.id)}
                scrollable={true}
                getRowStyle={(row) => isRowNew(id, currentPageId, row) ? { backgroundColor: COLORS.primaryLightest } : {}}
            >
                {/* Inline Add Row */}
                {isAddingRow && (
                    <tr className="border-b border-border bg-primary/5">
                        <td className="w-[52px] px-4 py-3 align-top">
                            <Plus className="w-4 h-4 text-primary mx-auto" />
                        </td>
                        <td className="px-4 py-2 align-top">
                            <Textarea
                                ref={newRowInputRef}
                                placeholder="Enter English text..."
                                value={newRowData.en}
                                onChange={(e) => setNewRowData(prev => ({ ...prev, en: e.target.value }))}
                                onKeyDown={handleNewRowKeyDown}
                                className="min-h-[60px] bg-white resize-y"
                            />
                        </td>
                        {/* Dynamic target language inputs based on project settings */}
                        {targetLanguages.map(langCode => (
                            <td key={langCode} className="px-4 py-2 align-top">
                                <Textarea
                                    placeholder={`${LANGUAGES[langCode]?.label || langCode} (optional)`}
                                    value={newRowData[langCode] || ''}
                                    onChange={(e) => setNewRowData(prev => ({ ...prev, [langCode]: e.target.value }))}
                                    onKeyDown={handleNewRowKeyDown}
                                    className="min-h-[60px] bg-white resize-y"
                                />
                            </td>
                        ))}
                        <td className="px-4 py-3 align-top">
                            <span className="text-xs text-muted-foreground font-medium">New</span>
                        </td>
                        <td className="px-4 py-3 align-top">
                            <span className="text-xs text-slate-300">—</span>
                        </td>
                    </tr>
                )}

                {isAddingRow && (
                    <tr className="border-b border-border bg-transparent">
                        <td colSpan={columns.length + 1} className="px-4 py-2 text-right">
                            <div className="flex gap-2 justify-end w-full">
                                <button
                                    onClick={handleSaveNewRow}
                                    disabled={!newRowData.en.trim()}
                                    className={`px-3 py-1.5 text-xs font-medium rounded-md border transition-colors ${newRowData.en.trim()
                                        ? 'bg-primary text-white border-primary hover:bg-primary/90'
                                        : 'bg-slate-100 text-slate-400 border-transparent cursor-not-allowed'
                                        }`}
                                >
                                    Save
                                </button>
                                <button
                                    onClick={handleCancelAddRow}
                                    className="px-3 py-1.5 text-xs font-medium rounded-md border border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
                                >
                                    Cancel
                                </button>
                            </div>
                        </td>
                    </tr>
                )}
                {/* Add new row button - inside table as a row */}
                {!isAddingRow && (
                    <tr>
                        <td colSpan={columns.length + 1} className="p-0">
                            <button
                                onClick={handleStartAddRow}
                                className="flex items-center gap-2 px-4 py-3.5 w-full text-sm text-slate-500 hover:text-primary hover:bg-slate-50 transition-colors text-left"
                            >
                                <Plus className="w-4 h-4" /> Add new row
                            </button>
                        </td>
                    </tr>
                )}
            </DataTable>

            {/* Project Settings Dialog */}
            <ProjectSettingsDialog
                open={isSettingsOpen}
                onOpenChange={setIsSettingsOpen}
                project={project}
            />

            {/* Pagination */}
            {
                totalRows > 0 && (
                    <Pagination
                        currentPage={currentPage}
                        totalItems={totalRows}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setCurrentPage}
                        onItemsPerPageChange={setItemsPerPage}
                    />
                )
            }

            {/* Delete Confirmation Dialog */}
            {/* Delete Confirmation Dialog */}
            <ConfirmDialog
                open={!!deleteConfirm}
                onClose={() => setDeleteConfirm(null)}
                onConfirm={performDelete}
                title="Delete Rows?"
                message={deleteConfirm?.type === 'single'
                    ? "Are you sure you want to delete this row? This action cannot be undone."
                    : `Are you sure you want to delete ${deleteConfirm?.count || 0} selected rows? This action cannot be undone.`
                }
                confirmLabel="Delete"
                variant="destructive"
            />

            {/* Duplicate Confirmation Dialog */}
            <ConfirmDialog
                open={!!duplicateConfirm}
                onClose={() => setDuplicateConfirm(null)}
                onConfirm={() => addRowToProject(duplicateConfirm?.row)}
                title="Duplicate Detected"
                message={`A row with similar content already exists: "${duplicateConfirm?.duplicate?.en?.substring(0, 50)}..."\n\nDo you want to add this row anyway?`}
                confirmLabel="Add Anyway"
                variant="default"
            />

            <SendForReviewDialog
                open={sendForReviewOpen}
                onOpenChange={setSendForReviewOpen}
                onConfirm={handleConfirmSendForReview}
                targetLanguages={targetLanguages}
                managers={managers}
            />
        </PageContainer>
    )
}
