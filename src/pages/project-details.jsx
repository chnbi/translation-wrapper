
import { useState, useRef, useEffect } from "react"
import { FileSpreadsheet, Download, Square, CheckSquare, Loader2, X, Upload, Plus, Filter, Check, Search, Send, MoreHorizontal, Pencil, Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { COLORS, PillButton, TableActionButton, PrimaryButton } from "@/components/ui/shared"
import { useProjects } from "@/context/ProjectContext"
import { usePrompts } from "@/context/PromptContext"
import { useGlossary } from "@/context/GlossaryContext"
import { useAuth } from "@/App"
import * as XLSX from "xlsx"
import { parseExcelFile } from "@/lib/excel"
import { translateBatch } from "@/services/gemini/text"
import { toast } from "sonner"
import { DataTable } from "@/components/ui/DataTable"
import { PromptCategoryDropdown } from "@/components/ui/PromptCategoryDropdown"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { StatusFilterDropdown } from "@/components/ui/StatusFilterDropdown"
import { getStatusConfig } from "@/lib/constants"


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
        isLoading,
    } = useProjects()

    const { templates } = usePrompts()
    const { terms: glossaryTerms } = useGlossary()
    const { canDo } = useAuth()

    const [isAddingRow, setIsAddingRow] = useState(false)
    const [newRowData, setNewRowData] = useState({ en: '', my: '', zh: '' })
    const newRowInputRef = useRef(null)
    const [isImporting, setIsImporting] = useState(false)
    const [isTranslating, setIsTranslating] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")
    const [statusFilter, setStatusFilter] = useState([]) // Multi-selectable status filter

    const fileInputRef = useRef(null)

    // Parse project ID and page ID from URL
    const hashParts = window.location.hash.split('?')
    const id = projectId || hashParts[0].split('/')[1]
    const urlParams = new URLSearchParams(hashParts[1] || '')
    const pageIdFromUrl = urlParams.get('page')

    const project = getProject(id)
    const pages = getProjectPages(id)
    const currentPageId = getSelectedPageId(id)

    // Sync page selection from URL
    useEffect(() => {
        if (pageIdFromUrl && pages.length > 0 && pageIdFromUrl !== currentPageId) {
            const pageExists = pages.some(p => p.id === pageIdFromUrl)
            if (pageExists) {
                selectPage(id, pageIdFromUrl)
            }
        }
    }, [pageIdFromUrl, pages, id, currentPageId, selectPage])

    const legacyRows = getProjectRows(id)

    const allRows = pages.length > 0 && currentPageId
        ? getPageRows(id, currentPageId)
        : legacyRows

    // Apply search and status filters
    const rows = (allRows || []).filter(row => {
        if (!row) return false
        const matchesSearch = !searchQuery ||
            (row.en || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (row.my || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (row.zh || '').toLowerCase().includes(searchQuery.toLowerCase())

        // Status filter - if no selection, show all
        const matchesStatus = statusFilter.length === 0 || statusFilter.includes(row.status || 'draft')

        return matchesSearch && matchesStatus
    })

    const selectedRowIds = getSelectedRowIds(id)
    const selectedCount = selectedRowIds.size
    const hasSelection = selectedCount > 0

    // Compute button state conditions based on requirementss.txt
    const hasRows = rows.length > 0
    const relevantRows = hasSelection
        ? rows.filter(row => selectedRowIds.has(row.id))
        : rows
    const hasEmptyTranslations = relevantRows.some(row => !row.my?.trim() || !row.zh?.trim())
    const allTranslated = hasRows && !relevantRows.some(row => !row.my?.trim() || !row.zh?.trim())
    const allApproved = hasRows && rows.every(row => row.status === 'approved')

    // Show loading state while Firestore data is being fetched
    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
                <p className="text-muted-foreground">Loading project...</p>
            </div>
        )
    }

    // Only show "not found" error after loading completes
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
        const exportData = allRows.map(row => ({
            'English': row.en,
            'Bahasa Malaysia': row.my,
            '中文': row.zh,
            'Status': row.status,
        }))
        const ws = XLSX.utils.json_to_sheet(exportData)

        // Apply grey background to header row (A1, B1, C1, D1)
        const headerRange = ['A1', 'B1', 'C1', 'D1']
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

    const handleImportSheet = async (event) => {
        const file = event.target.files?.[0]
        if (!file) return

        setIsImporting(true)
        try {
            const parsedData = await parseExcelFile(file)
            for (const [sheetName, sheetData] of Object.entries(parsedData)) {
                const newRows = sheetData.entries.map((entry, idx) => ({
                    key: `row_${Date.now()}_${idx}`,
                    en: entry.english || '',
                    my: entry.malay || '',
                    zh: entry.chinese || '',
                    status: 'pending',
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
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    // Handle inline row addition
    const handleStartAddRow = () => {
        setIsAddingRow(true)
        setNewRowData({ en: '', my: '', zh: '' })
        // Focus the input after render
        setTimeout(() => newRowInputRef.current?.focus(), 50)
    }

    const handleSaveNewRow = async () => {
        if (!newRowData.en.trim()) {
            setIsAddingRow(false)
            return
        }
        const newRow = {
            key: `row_${Date.now()}`,
            en: newRowData.en.trim(),
            my: newRowData.my.trim(),
            zh: newRowData.zh.trim(),
            status: 'draft',  // New rows start as draft
            promptId: 'default',  // Default prompt assignment
        }
        if (pages.length > 0 && currentPageId) {
            await addPageRows(id, currentPageId, [newRow])
        } else {
            await addProjectRows(id, [newRow])
        }
        setNewRowData({ en: '', my: '', zh: '' })
        setIsAddingRow(false)
    }

    const handleCancelAddRow = () => {
        setIsAddingRow(false)
        setNewRowData({ en: '', my: '', zh: '' })
    }

    // Handle Enter key to save, Escape to cancel
    const handleNewRowKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSaveNewRow()
        } else if (e.key === 'Escape') {
            handleCancelAddRow()
        }
    }

    const getPromptName = (promptId) => {
        if (!promptId) return null
        const prompt = templates.find(t => t.id === promptId)
        return prompt?.name || null
    }

    // Send selected rows for review
    const handleSendForReview = async () => {
        if (selectedCount === 0) {
            toast.error('No rows selected')
            return
        }

        const selectedRows = rows.filter(row => selectedRowIds.has(row.id))
        let successCount = 0

        for (const row of selectedRows) {
            await updateProjectRow(id, row.id, { status: 'review' })
            successCount++
        }

        deselectAllRows(id)
        toast.success(`Sent ${successCount} rows for review`)
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
                console.log(`🎯 [Translate] Translating ${rowsToTranslate.length} selected rows (override mode)`)
                toast.info(`Translating ${rowsToTranslate.length} selected rows...`)
            } else {
                // No selection - translate only empty cells
                rowsToTranslate = rows.filter(row => !row.my?.trim() || !row.zh?.trim())
                console.log(`🎯 [Translate] Translating ${rowsToTranslate.length} rows with empty translations`)
                if (rowsToTranslate.length === 0) {
                    toast.info('All rows already have translations!')
                    setIsTranslating(false)
                    return
                }
                toast.info(`Translating ${rowsToTranslate.length} empty rows...`)
            }

            // Get the default template or first available
            const defaultTemplate = templates.find(t => t.isDefault) || templates[0] || {
                name: 'Default',
                prompt: 'Translate accurately while maintaining the original meaning and tone.'
            }

            console.log(`📝 [Translate] Using template: ${defaultTemplate.name}`)

            // Call translation API
            const results = await translateBatch(
                rowsToTranslate.map(row => ({ id: row.id, en: row.en })),
                defaultTemplate,
                {
                    targetLanguages: ['my', 'zh'],
                    glossaryTerms: glossaryTerms.map(t => ({
                        english: t.english,
                        malay: t.malay,
                        chinese: t.chinese
                    }))
                }
            )

            // Update rows with translations
            let successCount = 0
            for (const result of results) {
                if (result.status !== 'error') {
                    await updateProjectRow(id, result.id, {
                        my: result.my,
                        zh: result.zh,
                        translatedAt: new Date().toISOString()
                    })
                    successCount++
                }
            }

            toast.success(`Successfully translated ${successCount} rows!`)
            console.log(`✅ [Translate] Completed: ${successCount}/${rowsToTranslate.length} rows`)

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
        }
    }

    // Column Definitions - widths aligned with Glossary, scrollable for dynamic languages
    const columns = [
        { header: "English", accessor: "en", width: "220px", minWidth: "180px", color: 'hsl(222, 47%, 11%)' },
        { header: "Bahasa Malaysia", accessor: "my", width: "200px", minWidth: "160px", color: 'hsl(220, 9%, 46%)', render: row => row.my || '—' },
        { header: "Chinese", accessor: "zh", width: "180px", minWidth: "140px", color: 'hsl(220, 9%, 46%)', render: row => row.zh || '—' },
        {
            header: "Status",
            accessor: "status",
            width: "100px",
            render: (row) => {
                const config = getStatusConfig(row.status)
                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: config.color
                        }} />
                        <span style={{ fontSize: '14px', color: 'hsl(220, 9%, 46%)' }}>
                            {config.label}
                        </span>
                    </div>
                )
            }
        },
        {
            header: "Prompt Category",
            accessor: "promptId",
            width: "120px",
            render: (row) => (
                <PromptCategoryDropdown
                    currentPromptId={row.promptId}
                    templates={templates}
                    onSelect={(promptId) => {
                        updateProjectRow(id, row.id, { promptId })
                        console.log(`📝 [Prompt] Row ${row.id} → ${promptId || 'default'}`)
                    }}
                />
            )
        },
        {
            header: "",
            accessor: "actions",
            width: "50px",
            render: (row) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '24px',
                                height: '24px',
                                border: 'none',
                                backgroundColor: 'transparent',
                                cursor: 'pointer',
                                borderRadius: '4px'
                            }}
                        >
                            <MoreHorizontal style={{ width: '16px', height: '16px', color: 'hsl(220, 9%, 46%)' }} />
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" style={{ minWidth: '120px' }}>
                        <DropdownMenuItem
                            onClick={() => console.log('Edit row', row.id)}
                            style={{ cursor: 'pointer' }}
                        >
                            <Pencil style={{ width: '14px', height: '14px', marginRight: '8px' }} />
                            Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => {
                                if (confirm('Delete this row?')) {
                                    deleteRows(id, [row.id])
                                }
                            }}
                            style={{ cursor: 'pointer', color: 'hsl(0, 84%, 60%)' }}
                        >
                            <Trash2 style={{ width: '14px', height: '14px', marginRight: '8px' }} />
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )
        }
    ]

    return (
        <div className="w-full pb-10">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleImportSheet}
                accept=".xlsx,.xls,.csv"
                className="hidden"
            />

            {/* Page Title */}
            <h1 style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '4px', color: 'hsl(222, 47%, 11%)' }}>
                {pages.length > 1 && currentPageId
                    ? pages.find(p => p.id === currentPageId)?.name || project.name
                    : project.name
                }
            </h1>

            {/* Action Bar */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0' }}>
                <span style={{ fontSize: '14px', color: 'hsl(220, 9%, 46%)' }}>
                    {selectedCount > 0 ? `${selectedCount} row(s) selected` : `${rows.length} row(s)`}
                </span>

                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {/* Search */}
                    <div style={{ position: 'relative' }}>
                        <input
                            type="text"
                            placeholder="Search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                borderRadius: '12px',
                                height: '32px',
                                width: '140px',
                                fontSize: '14px',
                                padding: '0 12px 0 32px',
                                border: '1px solid hsl(220, 13%, 91%)',
                                outline: 'none',
                                backgroundColor: 'white'
                            }}
                        />
                        <Search style={{
                            position: 'absolute',
                            left: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '14px',
                            height: '14px',
                            color: 'hsl(220, 9%, 46%)'
                        }} />
                    </div>

                    {/* Filter - only show if there are rows */}
                    {hasRows && (
                        <StatusFilterDropdown
                            selectedStatuses={statusFilter}
                            onStatusChange={setStatusFilter}
                        />
                    )}

                    {/* Import - always shown */}
                    <PillButton
                        variant="outline"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isImporting}
                    >
                        <Upload style={{ width: '16px', height: '16px' }} /> Import
                    </PillButton>

                    {/* Export - only show when all rows are approved */}
                    {allApproved && (
                        <PillButton
                            variant="outline"
                            onClick={handleExport}
                        >
                            <Download style={{ width: '16px', height: '16px' }} /> Export
                        </PillButton>
                    )}

                    {/* Translate Again - show when selecting already-translated rows */}
                    {hasSelection && allTranslated && !allApproved && (
                        <PillButton
                            variant="outline"
                            onClick={handleTranslateAll}
                            disabled={isTranslating}
                        >
                            <span style={{ fontSize: '14px' }}>✦</span> Translate Again
                        </PillButton>
                    )}

                    {/* Primary Action Button - conditional based on state */}
                    {!allApproved && hasRows && (
                        <PrimaryButton
                            style={{ height: '32px', fontSize: '12px', padding: '0 16px' }}
                            onClick={allTranslated ? handleSendForReview : handleTranslateAll}
                            disabled={isTranslating}
                        >
                            {isTranslating ? (
                                <><Loader2 style={{ width: '14px', height: '14px', marginRight: '4px', animation: 'spin 1s linear infinite' }} /> Translating...</>
                            ) : allTranslated ? (
                                <><Send style={{ width: '14px', height: '14px' }} /> Send for Review</>
                            ) : hasSelection ? (
                                <><span style={{ fontSize: '14px' }}>✦</span> Translate {selectedCount} selected</>
                            ) : (
                                <><span style={{ fontSize: '14px' }}>✦</span> Translate empty rows</>
                            )}
                        </PrimaryButton>
                    )}
                </div>
            </div>

            {/* DataTable with appended "Add Row" support */}
            <DataTable
                columns={columns}
                data={rows}
                selectedIds={selectedRowIds}
                onToggleSelect={(id) => toggleRowSelection(project.id, id)}
                onToggleSelectAll={handleSelectAll}
                onRowClick={(row) => console.log('Row clicked', row)}
                scrollable={true}
            >
                {/* Inline Add Row */}
                {isAddingRow && (
                    <tr style={{ borderBottom: '1px solid hsl(220, 13%, 91%)', backgroundColor: 'hsl(340, 82%, 59%, 0.03)' }}>
                        <td style={{ width: '52px', padding: '14px 16px' }}>
                            <Plus style={{ width: '16px', height: '16px', color: '#FF0084' }} />
                        </td>
                        <td style={{ padding: '8px 16px' }}>
                            <input
                                ref={newRowInputRef}
                                type="text"
                                placeholder="Enter English text..."
                                value={newRowData.en}
                                onChange={(e) => setNewRowData(prev => ({ ...prev, en: e.target.value }))}
                                onKeyDown={handleNewRowKeyDown}
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    fontSize: '14px',
                                    border: '1px solid hsl(340, 82%, 59%, 0.3)',
                                    borderRadius: '6px',
                                    outline: 'none',
                                    backgroundColor: 'white'
                                }}
                            />
                        </td>
                        <td style={{ padding: '8px 16px' }}>
                            <input
                                type="text"
                                placeholder="Bahasa Malaysia (optional)"
                                value={newRowData.my}
                                onChange={(e) => setNewRowData(prev => ({ ...prev, my: e.target.value }))}
                                onKeyDown={handleNewRowKeyDown}
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    fontSize: '14px',
                                    border: '1px solid hsl(220, 13%, 91%)',
                                    borderRadius: '6px',
                                    outline: 'none',
                                    backgroundColor: 'white'
                                }}
                            />
                        </td>
                        <td style={{ padding: '8px 16px' }}>
                            <input
                                type="text"
                                placeholder="Chinese (optional)"
                                value={newRowData.zh}
                                onChange={(e) => setNewRowData(prev => ({ ...prev, zh: e.target.value }))}
                                onKeyDown={handleNewRowKeyDown}
                                style={{
                                    width: '100%',
                                    padding: '8px 12px',
                                    fontSize: '14px',
                                    border: '1px solid hsl(220, 13%, 91%)',
                                    borderRadius: '6px',
                                    outline: 'none',
                                    backgroundColor: 'white'
                                }}
                            />
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                            <span style={{ fontSize: '12px', color: 'hsl(220, 9%, 46%)' }}>New</span>
                        </td>
                        <td style={{ padding: '12px 16px' }}>
                            <span style={{ fontSize: '12px', color: 'hsl(220, 9%, 46%)' }}>—</span>
                        </td>
                    </tr>
                )}
                {/* Save/Cancel buttons for Add Row - Rendered as a row but might look better as actions. 
                    Wait, Figma showing "Add new row" as a button logic. 
                    Actually, the inputs row replaces the button, and should have save/cancel. 
                    The previous design put Save/Cancel in the last column. 
                    The DataTable has 6 columns (Checkbox + 5 data). 
                    My inputs above cover 4 columns (Checkbox, En, My, Zh). 
                    Status and Prompt Category are cols 5 and 6. 
                    I should add cells for them to align.
                */}
                {isAddingRow && (
                    <tr style={{ borderBottom: '1px solid hsl(220, 13%, 91%)', backgroundColor: 'transparent' }}>
                        <td colSpan={6} style={{ padding: '8px 16px', textAlign: 'right' }}>
                            <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', width: '100%' }}>
                                <button
                                    onClick={handleSaveNewRow}
                                    disabled={!newRowData.en.trim()}
                                    style={{
                                        padding: '6px 12px',
                                        fontSize: '12px',
                                        fontWeight: 500,
                                        borderRadius: '6px',
                                        border: 'none',
                                        backgroundColor: newRowData.en.trim() ? '#FF0084' : 'hsl(220, 13%, 91%)',
                                        color: newRowData.en.trim() ? 'white' : 'hsl(220, 9%, 46%)',
                                        cursor: newRowData.en.trim() ? 'pointer' : 'not-allowed'
                                    }}
                                >
                                    Save
                                </button>
                                <button
                                    onClick={handleCancelAddRow}
                                    style={{
                                        padding: '6px 12px',
                                        fontSize: '12px',
                                        borderRadius: '6px',
                                        border: '1px solid hsl(220, 13%, 91%)',
                                        backgroundColor: 'white',
                                        cursor: 'pointer'
                                    }}
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
                        <td colSpan={6} style={{ padding: 0 }}>
                            <button
                                onClick={handleStartAddRow}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    padding: '14px 16px',
                                    width: '100%',
                                    fontSize: '14px',
                                    color: 'hsl(220, 9%, 46%)',
                                    backgroundColor: 'transparent',
                                    border: 'none',
                                    cursor: 'pointer',
                                    textAlign: 'left'
                                }}
                            >
                                <Plus style={{ width: '16px', height: '16px' }} /> Add new row
                            </button>
                        </td>
                    </tr>
                )}
            </DataTable>
        </div>
    )
}
