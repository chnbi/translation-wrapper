import { useState, useRef, useEffect } from "react"
import { FileSpreadsheet, Download, Square, CheckSquare, Loader2, X, Upload, Plus, Filter, Check, Search } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { COLORS, PillButton, TableActionButton } from "@/components/ui/shared"
import { useProjects } from "@/context/ProjectContext"
import { usePrompts } from "@/context/PromptContext"
import { useAuth } from "@/App"
import * as XLSX from "xlsx"
import { parseExcelFile } from "@/lib/excel"

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
    } = useProjects()

    const { templates } = usePrompts()
    const { canDo } = useAuth()

    const [isAddingRow, setIsAddingRow] = useState(false)
    const [newRowData, setNewRowData] = useState({ en: '', my: '', zh: '' })
    const newRowInputRef = useRef(null)
    const [isImporting, setIsImporting] = useState(false)
    const [searchQuery, setSearchQuery] = useState("")

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

    // Apply search filter only
    const rows = allRows.filter(row => {
        const matchesSearch = !searchQuery ||
            (row.en || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (row.my || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (row.zh || '').toLowerCase().includes(searchQuery.toLowerCase())
        return matchesSearch
    })

    const selectedRowIds = getSelectedRowIds(id)
    const selectedCount = selectedRowIds.size

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

    return (
        <div className="w-full">
            <input
                type="file"
                ref={fileInputRef}
                onChange={handleImportSheet}
                accept=".xlsx,.xls,.csv"
                className="hidden"
            />

            {/* Page Title - Figma Exact: Shows page name when project has multiple sheets */}
            <h1 style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '4px', color: 'hsl(222, 47%, 11%)' }}>
                {pages.length > 1 && currentPageId
                    ? pages.find(p => p.id === currentPageId)?.name || project.name
                    : project.name
                }
            </h1>

            {/* Action Bar - Figma Exact Order: Search, Filters, Import, Export, Translate all */}
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
                                borderRadius: '9999px',
                                height: '32px',
                                width: '140px',
                                fontSize: '14px',
                                padding: '0 12px 0 32px',
                                border: '1px solid hsl(220, 13%, 91%)',
                                outline: 'none',
                                backgroundColor: 'white'
                            }}
                        />
                        <Filter style={{
                            position: 'absolute',
                            left: '10px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '14px',
                            height: '14px',
                            color: 'hsl(220, 9%, 46%)'
                        }} />
                    </div>

                    {/* Filters Button */}
                    <button
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            borderRadius: '9999px',
                            height: '32px',
                            padding: '0 16px',
                            fontSize: '14px',
                            fontWeight: 400,
                            border: '1px solid hsl(220, 13%, 91%)',
                            backgroundColor: 'white',
                            cursor: 'pointer'
                        }}
                    >
                        <Filter style={{ width: '16px', height: '16px' }} /> Filters
                    </button>

                    {/* Import Button */}
                    <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={isImporting}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            borderRadius: '9999px',
                            height: '32px',
                            padding: '0 16px',
                            fontSize: '14px',
                            fontWeight: 400,
                            border: '1px solid hsl(220, 13%, 91%)',
                            backgroundColor: 'white',
                            cursor: 'pointer'
                        }}
                    >
                        <Upload style={{ width: '16px', height: '16px' }} /> Import
                    </button>

                    {/* Export Button */}
                    <button
                        onClick={handleExport}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            borderRadius: '9999px',
                            height: '32px',
                            padding: '0 16px',
                            fontSize: '14px',
                            fontWeight: 400,
                            border: '1px solid hsl(220, 13%, 91%)',
                            backgroundColor: 'white',
                            cursor: 'pointer'
                        }}
                    >
                        <Download style={{ width: '16px', height: '16px' }} /> Export
                    </button>

                    {/* Translate all - Pink CTA */}
                    <button
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            borderRadius: '9999px',
                            height: '32px',
                            padding: '0 16px',
                            fontSize: '12px',
                            fontWeight: 600,
                            border: 'none',
                            backgroundColor: 'hsl(340, 82%, 59%)',
                            color: 'white',
                            cursor: 'pointer'
                        }}
                    >
                        <span style={{ fontSize: '14px' }}>✦</span> Translate all
                    </button>
                </div>
            </div>

            {/* Table - Figma Exact */}
            <div style={{ borderRadius: '8px', border: '1px solid hsl(220, 13%, 91%)', overflow: 'hidden', backgroundColor: 'white' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                        <tr style={{ borderBottom: '1px solid hsl(220, 13%, 91%)', backgroundColor: 'hsl(220, 14%, 96%, 0.3)' }}>
                            <th style={{ width: '48px', padding: '16px', textAlign: 'left' }}>
                                <button onClick={handleSelectAll} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    {selectedCount === rows.length && rows.length > 0 ? (
                                        <CheckSquare style={{ width: '16px', height: '16px', color: 'hsl(340, 82%, 59%)' }} />
                                    ) : (
                                        <Square style={{ width: '16px', height: '16px', color: 'hsl(220, 9%, 46%, 0.4)' }} />
                                    )}
                                </button>
                            </th>
                            <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: 400, color: 'hsl(220, 9%, 46%)', width: '25%' }}>
                                English <span style={{ color: 'hsl(220, 9%, 46%, 0.4)', marginLeft: '4px' }}>↕</span>
                            </th>
                            <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: 400, color: 'hsl(220, 9%, 46%)', width: '20%' }}>
                                Bahasa Malaysia <span style={{ color: 'hsl(220, 9%, 46%, 0.4)', marginLeft: '4px' }}>↕</span>
                            </th>
                            <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: 400, color: 'hsl(220, 9%, 46%)', width: '15%' }}>
                                Chinese
                            </th>
                            <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: 400, color: 'hsl(220, 9%, 46%)', width: '10%' }}>
                                Status
                            </th>
                            <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: 400, color: 'hsl(220, 9%, 46%)', width: '15%' }}>
                                Prompt Category
                            </th>
                            <th style={{ padding: '16px', textAlign: 'left', fontSize: '14px', fontWeight: 400, color: 'hsl(220, 9%, 46%)', width: '10%' }}>
                                Action
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows.map((row) => (
                            <tr
                                key={row.id}
                                style={{
                                    borderBottom: '1px solid hsl(220, 13%, 91%)',
                                    backgroundColor: selectedRowIds.has(row.id) ? 'hsl(340, 82%, 59%, 0.05)' : 'transparent'
                                }}
                            >
                                <td style={{ width: '48px', padding: '16px' }}>
                                    <button onClick={() => toggleRowSelection(id, row.id)} style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        {selectedRowIds.has(row.id) ? (
                                            <CheckSquare style={{ width: '16px', height: '16px', color: 'hsl(340, 82%, 59%)' }} />
                                        ) : (
                                            <Square style={{ width: '16px', height: '16px', color: 'hsl(220, 9%, 46%, 0.4)' }} />
                                        )}
                                    </button>
                                </td>
                                <td style={{ padding: '16px', fontSize: '14px', color: 'hsl(222, 47%, 11%)' }}>
                                    {row.en || ''}
                                </td>
                                <td style={{ padding: '16px', fontSize: '14px', color: 'hsl(220, 9%, 46%)' }}>
                                    {row.my || '—'}
                                </td>
                                <td style={{ padding: '16px', fontSize: '14px', color: 'hsl(220, 9%, 46%)' }}>
                                    {row.zh || '—'}
                                </td>
                                <td style={{ padding: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                        <span style={{
                                            width: '6px',
                                            height: '6px',
                                            borderRadius: '50%',
                                            backgroundColor: row.status === 'completed' ? '#10b981' :
                                                row.status === 'review' ? '#f59e0b' :
                                                    row.status === 'error' ? '#ef4444' : '#a1a1aa'
                                        }} />
                                        <span style={{ fontSize: '14px', color: 'hsl(220, 9%, 46%)' }}>
                                            {row.status === 'pending' ? 'Draft' :
                                                row.status === 'completed' ? 'Done' :
                                                    row.status || 'Draft'}
                                        </span>
                                    </div>
                                </td>
                                {/* Prompt Category - Plain text style per Figma */}
                                <td style={{ padding: '16px', fontSize: '14px', color: 'hsl(220, 9%, 46%)' }}>
                                    {getPromptName(row.promptId) || 'Default'}
                                </td>
                                {/* Action icons - AI, Check, X per Figma */}
                                <td style={{ padding: '16px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <button
                                            title="Translate with AI"
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: '24px',
                                                height: '24px',
                                                borderRadius: '4px',
                                                border: 'none',
                                                backgroundColor: 'transparent',
                                                cursor: 'pointer',
                                                color: 'hsl(220, 9%, 46%)'
                                            }}
                                        >
                                            <span style={{ fontSize: '14px' }}>✦</span>
                                        </button>
                                        <button
                                            title="Approve"
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: '24px',
                                                height: '24px',
                                                borderRadius: '4px',
                                                border: 'none',
                                                backgroundColor: 'transparent',
                                                cursor: 'pointer',
                                                color: 'hsl(220, 9%, 46%)'
                                            }}
                                        >
                                            ✓
                                        </button>
                                        <button
                                            title="Reject"
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                justifyContent: 'center',
                                                width: '24px',
                                                height: '24px',
                                                borderRadius: '4px',
                                                border: 'none',
                                                backgroundColor: 'transparent',
                                                cursor: 'pointer',
                                                color: 'hsl(220, 9%, 46%)'
                                            }}
                                        >
                                            ×
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}

                        {/* Inline Add Row */}
                        {isAddingRow && (
                            <tr style={{ borderBottom: '1px solid hsl(220, 13%, 91%)', backgroundColor: 'hsl(340, 82%, 59%, 0.03)' }}>
                                <td style={{ width: '48px', padding: '16px' }}>
                                    <Plus style={{ width: '16px', height: '16px', color: 'hsl(340, 82%, 59%)' }} />
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
                                <td style={{ padding: '16px' }}>
                                    <span style={{ fontSize: '12px', color: 'hsl(220, 9%, 46%)' }}>New</span>
                                </td>
                                <td style={{ padding: '16px' }}>
                                    <span style={{ fontSize: '12px', color: 'hsl(220, 9%, 46%)' }}>—</span>
                                </td>
                                <td style={{ padding: '8px 16px' }}>
                                    <div style={{ display: 'flex', gap: '4px' }}>
                                        <button
                                            onClick={handleSaveNewRow}
                                            disabled={!newRowData.en.trim()}
                                            style={{
                                                padding: '6px 12px',
                                                fontSize: '12px',
                                                fontWeight: 500,
                                                borderRadius: '6px',
                                                border: 'none',
                                                backgroundColor: newRowData.en.trim() ? 'hsl(340, 82%, 59%)' : 'hsl(220, 13%, 91%)',
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
                    </tbody>
                </table>

                {/* + Add new row - at bottom of table per Figma */}
                {!isAddingRow && (
                    <button
                        onClick={handleStartAddRow}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            padding: '12px 16px',
                            width: '100%',
                            fontSize: '14px',
                            color: 'hsl(220, 9%, 46%)',
                            backgroundColor: 'transparent',
                            border: 'none',
                            borderTop: '1px solid hsl(220, 13%, 91%)',
                            cursor: 'pointer',
                            textAlign: 'left'
                        }}
                    >
                        <Plus style={{ width: '16px', height: '16px' }} /> Add new row
                    </button>
                )}
            </div>

            {/* Empty State - Matches Figma Image 2 */}
            {rows.length === 0 && !isAddingRow && (
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '80px 20px',
                    textAlign: 'center'
                }}>
                    <div style={{
                        width: '64px',
                        height: '64px',
                        backgroundColor: 'hsl(220, 14%, 96%)',
                        borderRadius: '12px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        marginBottom: '16px'
                    }}>
                        <FileSpreadsheet style={{ width: '28px', height: '28px', color: 'hsl(220, 9%, 46%)' }} />
                    </div>
                    <h3 style={{ fontSize: '16px', fontWeight: 600, color: 'hsl(222, 47%, 11%)', marginBottom: '4px' }}>
                        No content found.
                    </h3>
                    <p style={{ fontSize: '14px', color: 'hsl(220, 9%, 46%)' }}>
                        Add a new row or import a existing file.
                    </p>
                </div>
            )}




        </div>
    )
}
