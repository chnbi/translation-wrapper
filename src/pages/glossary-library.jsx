
// Glossary - Manage translation terms with status workflow (Project-page style UI)
import { useState, useRef } from "react"
import { Plus, Search, Download, Filter, ArrowUpDown, CheckCircle2, Clock, XCircle, Check, Trash2, Upload, MoreHorizontal, Loader2, Pencil, Send } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger,
} from "@/components/ui/tooltip"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { GlossaryTermDialog } from "@/components/dialogs"
import { useAuth, ACTIONS } from "@/App"
import { useGlossary } from "@/context/GlossaryContext"
import { usePrompts } from "@/context/PromptContext"
import { COLORS, PillButton, PrimaryButton } from "@/components/ui/shared"
import { DataTable } from "@/components/ui/DataTable"
import { PageHeader, SearchInput, StatusDot } from "@/components/ui/common"
import { exportGlossaryToExcel } from "@/lib/export"
import * as XLSX from "xlsx"
import ImportGlossaryDialog from "@/components/dialogs/ImportGlossaryDialog"
import { toast } from "sonner"
import { translateBatch } from "@/services/gemini/text"
import { PromptCategoryDropdown } from "@/components/ui/PromptCategoryDropdown"
import { StatusFilterDropdown } from "@/components/ui/StatusFilterDropdown"
import { DuplicateGlossaryDialog } from "@/components/dialogs/DuplicateGlossaryDialog"
import { getStatusConfig } from "@/lib/constants"


// Using centralized STATUS_CONFIG from @/lib/constants

export default function Glossary() {
    const { canDo } = useAuth()
    const { terms, addTerm, addTerms, updateTerm, deleteTerm, deleteTerms, categories: dynamicCategories } = useGlossary()
    const { templates } = usePrompts()
    const [searchQuery, setSearchQuery] = useState("")
    const [activeCategory, setActiveCategory] = useState("All")
    const [selectedIds, setSelectedIds] = useState([])
    const [sortField, setSortField] = useState("dateModified")
    const [sortDirection, setSortDirection] = useState("desc")
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingTerm, setEditingTerm] = useState(null)
    const [deleteConfirm, setDeleteConfirm] = useState(null)
    const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false)
    const [isImportOpen, setIsImportOpen] = useState(false)
    const [isTranslating, setIsTranslating] = useState(false)
    const [statusFilter, setStatusFilter] = useState([]) // Multi-selectable status filter
    const fileInputRef = useRef(null)

    // Duplicate detection state
    const [pendingNewTerms, setPendingNewTerms] = useState([])
    const [duplicates, setDuplicates] = useState([])
    const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false)

    // Translation handler - same logic as project page
    const handleTranslateAll = async () => {
        setIsTranslating(true)
        try {
            // Determine which terms to translate
            let termsToTranslate
            const hasSelection = selectedIds.length > 0

            if (hasSelection) {
                // Selected terms - override existing translations
                termsToTranslate = terms.filter(term => selectedIds.includes(term.id))
                console.log(`🎯 [Translate] Translating ${termsToTranslate.length} selected glossary terms (override mode)`)
                toast.info(`Translating ${termsToTranslate.length} selected terms...`)
            } else {
                // No selection - translate only terms with empty malay or chinese
                termsToTranslate = terms.filter(term => !term.malay?.trim() || !term.chinese?.trim())
                console.log(`🎯 [Translate] Translating ${termsToTranslate.length} terms with empty translations`)
                if (termsToTranslate.length === 0) {
                    toast.info('All terms already have translations!')
                    setIsTranslating(false)
                    return
                }
                toast.info(`Translating ${termsToTranslate.length} empty terms...`)
            }

            // Get the default template or first available
            const defaultTemplate = templates.find(t => t.isDefault) || templates[0] || {
                name: 'Default',
                prompt: 'Translate accurately while maintaining the original meaning and tone.'
            }

            console.log(`📝 [Translate] Using template: ${defaultTemplate.name}`)

            // Call translation API
            const results = await translateBatch(
                termsToTranslate.map(term => ({ id: term.id, en: term.english })),
                defaultTemplate,
                {
                    targetLanguages: ['my', 'zh'],
                    glossaryTerms: [] // Don't use glossary for glossary translation
                }
            )

            // Update terms with translations
            let successCount = 0
            for (const result of results) {
                if (result.status !== 'error') {
                    await updateTerm(result.id, {
                        malay: result.my,
                        chinese: result.zh,
                        status: 'draft', // Keep as draft for review
                        dateModified: new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
                    })
                    successCount++
                }
            }

            toast.success(`Successfully translated ${successCount} terms!`)
            console.log(`✅ [Translate] Completed: ${successCount}/${termsToTranslate.length} terms`)
            setSelectedIds([]) // Clear selection after translation

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

    // Send for review - change status of terms with complete translations
    const handleSendForReview = async () => {
        // Get terms that have all translations filled and are still in draft
        const termsToSend = terms.filter(term =>
            term.malay?.trim() &&
            term.chinese?.trim() &&
            term.status === 'draft'
        )

        if (termsToSend.length === 0) {
            toast.info('No terms ready for review')
            return
        }

        try {
            for (const term of termsToSend) {
                await updateTerm(term.id, { status: 'review' })
            }
            toast.success(`Sent ${termsToSend.length} terms for review`)
        } catch (error) {
            toast.error('Failed to send for review')
        }
    }

    const handleImportFromFile = (e) => {
        const file = e.target.files?.[0]
        if (file) {
            setIsImportOpen(true)
        }
    }

    // Filter and sort logic
    const filteredTerms = (terms || [])
        .filter(term => {
            if (!term) return false

            const matchesSearch =
                (term.english || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (term.malay || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (term.chinese || '').includes(searchQuery)

            // Status filter - if no selection, show all
            const matchesStatus = statusFilter.length === 0 || statusFilter.includes(term.status || 'draft')

            if (activeCategory === "All") return matchesSearch && matchesStatus
            return matchesSearch && matchesStatus && term.category === activeCategory
        })
        .sort((a, b) => {
            if (!a || !b) return 0
            // Handle date sorting specially (for "Just now" and date strings)
            if (sortField === "dateModified") {
                // "Just now" always comes first when sorting desc
                if (a.dateModified === "Just now") return sortDirection === "desc" ? -1 : 1
                if (b.dateModified === "Just now") return sortDirection === "desc" ? 1 : -1
                // Otherwise compare by id (higher id = newer)
                return sortDirection === "desc" ? b.id - a.id : a.id - b.id
            }
            // Regular string comparison for other fields
            const aVal = a[sortField]?.toLowerCase?.() || a[sortField] || ''
            const bVal = b[sortField]?.toLowerCase?.() || b[sortField] || ''
            if (sortDirection === "asc") return aVal > bVal ? 1 : -1
            return aVal < bVal ? 1 : -1
        })

    // Compute button state conditions based on requirementss.txt
    // MUST be after filteredTerms is defined
    const hasTerms = filteredTerms.length > 0
    const hasSelection = selectedIds.length > 0
    const relevantTerms = hasSelection
        ? terms.filter(term => selectedIds.includes(term.id))
        : terms
    const hasEmptyTranslations = relevantTerms.some(term => !term.malay?.trim() || !term.chinese?.trim())
    const allTranslated = hasTerms && !relevantTerms.some(term => !term.malay?.trim() || !term.chinese?.trim())
    const allApproved = hasTerms && terms.every(term => term.status === 'approved')

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === "asc" ? "desc" : "asc")
        } else {
            setSortField(field)
            // Default direction based on field
            setSortDirection(field === "dateModified" ? "desc" : "asc")
        }
    }

    const toggleSelect = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        )
    }

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredTerms.length) {
            setSelectedIds([])
        } else {
            setSelectedIds(filteredTerms.map(t => t.id))
        }
    }

    // Inline row editing state
    const [isAddingRow, setIsAddingRow] = useState(false)
    const [newRow, setNewRow] = useState({ english: '', malay: '', chinese: '', category: 'General' })

    const handleCreate = () => {
        setIsAddingRow(true)
        setNewRow({ english: '', malay: '', chinese: '', category: 'General' })
    }

    const handleSaveNewRow = async () => {
        if (!newRow.english.trim()) {
            toast.error('English term is required')
            return
        }
        try {
            await addTerm({
                english: newRow.english.trim(),
                malay: newRow.malay.trim(),
                chinese: newRow.chinese.trim(),
                category: newRow.category || 'General',
                status: 'draft',
                remark: ''
            })
            toast.success('Term added successfully')
            setIsAddingRow(false)
            setNewRow({ english: '', malay: '', chinese: '', category: 'General' })
        } catch (error) {
            toast.error('Failed to add term')
        }
    }

    const handleCancelAddRow = () => {
        setIsAddingRow(false)
        setNewRow({ english: '', malay: '', chinese: '', category: 'General' })
    }

    const handleNewRowKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSaveNewRow()
        } else if (e.key === 'Escape') {
            handleCancelAddRow()
        }
    }

    const handleEdit = (term) => {
        setEditingTerm(term)
        setIsDialogOpen(true)
    }

    const handleSave = (data) => {
        if (editingTerm) {
            updateTerm(editingTerm.id, data)
        } else {
            addTerm(data)
        }
    }

    const handleDelete = (id) => {
        deleteTerm(id)
        setSelectedIds(selectedIds.filter(i => i !== id))
        setDeleteConfirm(null)
    }

    const handleBulkDelete = () => {
        deleteTerms(selectedIds)
        setSelectedIds([])
        setBulkDeleteConfirm(false)
    }

    // Export to Excel
    const handleExport = () => {
        const exportData = terms.map(t => ({
            'English': t.english,
            'Bahasa Malaysia': t.malay,
            '中文': t.chinese,
            'Category': t.category,
            'Status': t.status,
            'Remark': t.remark || ''
        }))
        const ws = XLSX.utils.json_to_sheet(exportData)

        // Apply grey background to header row (A1, B1, C1, D1, E1, F1)
        const headerRange = ['A1', 'B1', 'C1', 'D1', 'E1', 'F1']
        headerRange.forEach(cell => {
            if (ws[cell]) {
                ws[cell].s = {
                    fill: { fgColor: { rgb: 'E5E7EB' } }, // Grey-200
                    font: { bold: true }
                }
            }
        })

        const wb = XLSX.utils.book_new()
        XLSX.utils.book_append_sheet(wb, ws, "Glossary")
        XLSX.writeFile(wb, "glossary_export.xlsx")
    }

    // Check for duplicates in new terms against existing terms
    const findDuplicates = (newTerms) => {
        const duplicateList = []
        const uniqueTerms = []

        newTerms.forEach(newTerm => {
            // Check against all existing terms
            const existingMatch = terms.find(existing => {
                // Check English
                if (newTerm.english && existing.english &&
                    newTerm.english.toLowerCase().trim() === existing.english.toLowerCase().trim()) {
                    return true
                }
                // Check Malay
                if (newTerm.malay && existing.malay &&
                    newTerm.malay.toLowerCase().trim() === existing.malay.toLowerCase().trim()) {
                    return true
                }
                // Check Chinese
                if (newTerm.chinese && existing.chinese &&
                    newTerm.chinese.trim() === existing.chinese.trim()) {
                    return true
                }
                return false
            })

            if (existingMatch) {
                // Determine which field matched
                let matchedField = 'english'
                if (newTerm.malay && existingMatch.malay &&
                    newTerm.malay.toLowerCase().trim() === existingMatch.malay.toLowerCase().trim()) {
                    matchedField = 'malay'
                } else if (newTerm.chinese && existingMatch.chinese &&
                    newTerm.chinese.trim() === existingMatch.chinese.trim()) {
                    matchedField = 'chinese'
                }

                duplicateList.push({
                    new: newTerm,
                    existing: existingMatch,
                    matchedField
                })
            } else {
                uniqueTerms.push(newTerm)
            }
        })

        return { duplicates: duplicateList, uniqueTerms }
    }

    const handleImport = async (newTerms) => {
        try {
            // Check for duplicates
            const { duplicates: foundDuplicates, uniqueTerms } = findDuplicates(newTerms)

            if (foundDuplicates.length > 0) {
                // Store pending terms and show dialog
                setPendingNewTerms(newTerms)
                setDuplicates(foundDuplicates)
                setIsDuplicateDialogOpen(true)
            } else {
                // No duplicates, import all
                await addTerms(newTerms)
                toast.success(`Successfully imported ${newTerms.length} terms`)
                setIsImportOpen(false)
            }
        } catch (error) {
            console.error('Import failed:', error)
            toast.error("Failed to import terms")
        }
    }

    const handleDuplicateResolve = async ({ overrides, ignores }) => {
        try {
            // Get unique terms (not duplicates)
            const { uniqueTerms } = findDuplicates(pendingNewTerms)

            // Handle overrides - update existing terms
            const overridePromises = duplicates
                .filter(d => overrides.includes(d.existing.id))
                .map(d => updateTerm(d.existing.id, {
                    english: d.new.english || d.existing.english,
                    malay: d.new.malay || d.existing.malay,
                    chinese: d.new.chinese || d.existing.chinese,
                    category: d.new.category || d.existing.category,
                    remark: d.new.remark || d.existing.remark,
                }))

            await Promise.all(overridePromises)

            // Add unique terms
            if (uniqueTerms.length > 0) {
                await addTerms(uniqueTerms)
            }

            const overrideCount = overrides.length
            const ignoreCount = ignores.length
            const newCount = uniqueTerms.length

            toast.success(`Import complete: ${newCount} new, ${overrideCount} updated, ${ignoreCount} ignored`)

            // Reset state
            setPendingNewTerms([])
            setDuplicates([])
            setIsImportOpen(false)
        } catch (error) {
            console.error('Duplicate resolution failed:', error)
            toast.error("Failed to resolve duplicates")
        }
    }

    // Column Definitions for DataTable - widths adjusted for Prompt Category
    const columns = [
        { header: "English", accessor: "english", width: "22%", sortable: true, color: 'hsl(222, 47%, 11%)' },
        { header: "Bahasa Malaysia", accessor: "malay", width: "20%", color: 'hsl(220, 9%, 46%)' },
        { header: "Chinese", accessor: "chinese", width: "18%", color: 'hsl(220, 9%, 46%)' },
        {
            header: "Status",
            accessor: "status",
            width: "10%",
            render: (row) => {
                const config = getStatusConfig(row.status)
                return (
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '6px',
                        fontSize: '13px',
                        color: 'hsl(220, 9%, 46%)'
                    }}>
                        <span style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: config.color
                        }} />
                        {config.label}
                    </span>
                )
            }
        },
        {
            header: "Category",
            accessor: "category",
            width: "10%",
            render: (row) => (
                <span style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    fontSize: '12px',
                    fontWeight: 500,
                    backgroundColor: 'hsl(220, 14%, 96%)',
                    color: 'hsl(220, 9%, 46%)'
                }}>
                    {row.category || 'Default'}
                </span>
            )
        },
        {
            header: "Prompt",
            accessor: "promptId",
            width: "12%",
            render: (row) => (
                <PromptCategoryDropdown
                    currentPromptId={row.promptId}
                    templates={templates}
                    onSelect={(promptId) => {
                        updateTerm(row.id, { promptId })
                        toast.success('Prompt updated')
                    }}
                />
            )
        },
        {
            header: "",
            accessor: "actions",
            width: "5%",
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
                        <DropdownMenuItem onClick={() => handleEdit(row)} style={{ cursor: 'pointer' }}>
                            <Pencil style={{ width: '14px', height: '14px', marginRight: '8px' }} />
                            Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => setDeleteConfirm(row.id)}
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
        <TooltipProvider>
            <div className="w-full pb-10">
                <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleImportFromFile}
                    accept=".xlsx,.xls,.csv"
                    className="hidden"
                />

                {/* Page Title */}
                <h1 style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '4px', color: 'hsl(222, 47%, 11%)' }}>
                    Glossary
                </h1>

                {/* Action Bar */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '16px 0' }}>
                    <span style={{ fontSize: '14px', color: 'hsl(220, 9%, 46%)' }}>
                        {selectedIds.length > 0 ? `${selectedIds.length} row(s) selected` : `${filteredTerms.length} row(s)`}
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

                        {/* Filter - only show if there are terms */}
                        {hasTerms && (
                            <StatusFilterDropdown
                                selectedStatuses={statusFilter}
                                onStatusChange={setStatusFilter}
                            />
                        )}

                        {/* Import - always shown */}
                        {canDo(ACTIONS.CREATE_GLOSSARY) && (
                            <PillButton
                                variant="outline"
                                onClick={() => setIsImportOpen(true)}
                            >
                                <Upload style={{ width: '16px', height: '16px' }} /> Import
                            </PillButton>
                        )}

                        {/* Export - only show when all terms are approved */}
                        {allApproved && (
                            <PillButton
                                variant="outline"
                                onClick={handleExport}
                            >
                                <Download style={{ width: '16px', height: '16px' }} /> Export
                            </PillButton>
                        )}

                        {/* Translate Again - show when selecting already-translated terms */}
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
                        {!allApproved && hasTerms && (
                            <PrimaryButton
                                style={{ height: '32px', fontSize: '12px', padding: '0 16px' }}
                                onClick={allTranslated ? handleSendForReview : handleTranslateAll}
                                disabled={isTranslating}
                            >
                                {isTranslating ? (
                                    <><Loader2 style={{ width: '14px', height: '14px', animation: 'spin 1s linear infinite' }} /> Translating...</>
                                ) : allTranslated ? (
                                    <><Send style={{ width: '14px', height: '14px' }} /> Send for Review</>
                                ) : hasSelection ? (
                                    <><span style={{ fontSize: '14px' }}>✦</span> Translate {selectedIds.length} selected</>
                                ) : (
                                    <><span style={{ fontSize: '14px' }}>✦</span> Translate empty rows</>
                                )}
                            </PrimaryButton>
                        )}
                    </div>
                </div>

                {/* DataTable */}
                <DataTable
                    columns={columns}
                    data={filteredTerms}
                    selectedIds={selectedIds}
                    onToggleSelect={toggleSelect}
                    onToggleSelectAll={toggleSelectAll}
                    sortConfig={{ field: sortField, direction: sortDirection }}
                    onSort={handleSort}
                    onRowClick={(row) => console.log('Row clicked', row)}
                >
                    {/* Inline Add Row */}
                    {isAddingRow && (
                        <tr style={{ borderBottom: '1px solid hsl(220, 13%, 91%)', backgroundColor: 'hsl(340, 82%, 59%, 0.03)' }}>
                            <td style={{ width: '52px', padding: '14px 16px' }}></td>
                            <td style={{ padding: '8px' }}>
                                <input
                                    type="text"
                                    placeholder="English term"
                                    value={newRow.english}
                                    onChange={(e) => setNewRow(prev => ({ ...prev, english: e.target.value }))}
                                    onKeyDown={handleNewRowKeyDown}
                                    autoFocus
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        fontSize: '14px',
                                        border: '1px solid hsl(220, 13%, 91%)',
                                        borderRadius: '8px',
                                        outline: 'none'
                                    }}
                                />
                            </td>
                            <td style={{ padding: '8px' }}>
                                <input
                                    type="text"
                                    placeholder="Bahasa Malaysia"
                                    value={newRow.malay}
                                    onChange={(e) => setNewRow(prev => ({ ...prev, malay: e.target.value }))}
                                    onKeyDown={handleNewRowKeyDown}
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        fontSize: '14px',
                                        border: '1px solid hsl(220, 13%, 91%)',
                                        borderRadius: '8px',
                                        outline: 'none'
                                    }}
                                />
                            </td>
                            <td style={{ padding: '8px' }}>
                                <input
                                    type="text"
                                    placeholder="Chinese"
                                    value={newRow.chinese}
                                    onChange={(e) => setNewRow(prev => ({ ...prev, chinese: e.target.value }))}
                                    onKeyDown={handleNewRowKeyDown}
                                    style={{
                                        width: '100%',
                                        padding: '8px 12px',
                                        fontSize: '14px',
                                        border: '1px solid hsl(220, 13%, 91%)',
                                        borderRadius: '8px',
                                        outline: 'none'
                                    }}
                                />
                            </td>
                            <td style={{ padding: '8px' }}>
                                <span style={{ fontSize: '13px', color: 'hsl(220, 9%, 46%)' }}>Draft</span>
                            </td>
                            <td style={{ padding: '8px' }}>
                                <select
                                    value={newRow.category}
                                    onChange={(e) => setNewRow(prev => ({ ...prev, category: e.target.value }))}
                                    style={{
                                        padding: '8px 12px',
                                        fontSize: '14px',
                                        border: '1px solid hsl(220, 13%, 91%)',
                                        borderRadius: '8px',
                                        outline: 'none',
                                        backgroundColor: 'white'
                                    }}
                                >
                                    <option value="General">General</option>
                                    {dynamicCategories.map(cat => (
                                        <option key={cat.id || cat.name} value={cat.name || cat}>{cat.name || cat}</option>
                                    ))}
                                </select>
                            </td>
                            <td style={{ padding: '8px' }}>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={handleSaveNewRow}
                                        style={{
                                            padding: '6px 12px',
                                            fontSize: '12px',
                                            fontWeight: 500,
                                            color: 'white',
                                            backgroundColor: '#FF0084',
                                            border: 'none',
                                            borderRadius: '6px',
                                            cursor: 'pointer'
                                        }}
                                    >
                                        Save
                                    </button>
                                    <button
                                        onClick={handleCancelAddRow}
                                        style={{
                                            padding: '6px 12px',
                                            fontSize: '12px',
                                            fontWeight: 500,
                                            color: 'hsl(220, 9%, 46%)',
                                            backgroundColor: 'transparent',
                                            border: '1px solid hsl(220, 13%, 91%)',
                                            borderRadius: '6px',
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
                            <td colSpan={7} style={{ padding: 0 }}>
                                <button
                                    onClick={handleCreate}
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

                {/* Footer */}
                <div style={{ padding: '16px 0', fontSize: '14px', color: 'hsl(220, 9%, 46%)' }}>
                    Showing {filteredTerms.length} of {terms.length} terms
                </div>

                <ImportGlossaryDialog
                    open={isImportOpen}
                    onOpenChange={setIsImportOpen}
                    onImport={handleImport}
                />

                <DuplicateGlossaryDialog
                    isOpen={isDuplicateDialogOpen}
                    onClose={() => {
                        setIsDuplicateDialogOpen(false)
                        setPendingNewTerms([])
                        setDuplicates([])
                    }}
                    duplicates={duplicates}
                    onResolve={handleDuplicateResolve}
                />

                <GlossaryTermDialog
                    open={isDialogOpen}
                    onOpenChange={setIsDialogOpen}
                    initialData={editingTerm}
                    onSave={handleSave}
                />

                {/* Delete Single Term Confirmation */}
                {deleteConfirm && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-card rounded-2xl p-6 max-w-sm w-full shadow-xl">
                            <h3 className="text-lg font-semibold mb-2">Delete Term?</h3>
                            <p className="text-muted-foreground text-sm mb-4">
                                This action cannot be undone. The glossary term will be permanently deleted.
                            </p>
                            <div className="flex gap-3 justify-end">
                                <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                                    Cancel
                                </Button>
                                <Button variant="destructive" onClick={() => handleDelete(deleteConfirm)}>
                                    Delete
                                </Button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Bulk Delete Confirmation */}
                {bulkDeleteConfirm && (
                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                        <div className="bg-card rounded-2xl p-6 max-w-sm w-full shadow-xl">
                            <h3 className="text-lg font-semibold mb-2">Delete {selectedIds.length} Terms?</h3>
                            <p className="text-muted-foreground text-sm mb-4">
                                This action cannot be undone. {selectedIds.length} glossary terms will be permanently deleted.
                            </p>
                            <div className="flex gap-3 justify-end">
                                <Button variant="outline" onClick={() => setBulkDeleteConfirm(false)}>
                                    Cancel
                                </Button>
                                <Button variant="destructive" onClick={handleBulkDelete}>
                                    Delete All
                                </Button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </TooltipProvider >
    )
}
