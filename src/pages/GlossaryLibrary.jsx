
// Glossary - Manage translation terms with status workflow (Project-page style UI)
import { useState, useRef, useEffect, useMemo, useCallback } from "react"
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
import { GlossaryTermDialog, ConfirmDialog } from "@/components/dialogs"
import { ACTIONS } from "@/App"
import { useAuth } from "@/context/DevAuthContext"
import { useGlossary } from "@/context/GlossaryContext"
import { usePrompts } from "@/context/PromptContext"
import { GlossaryHighlighter } from "@/components/ui/GlossaryHighlighter"
import { COLORS, PillButton, PrimaryButton, PageContainer, Card, IconButton } from "@/components/ui/shared"
import { LAYOUT } from "@/lib/constants"
import { DataTable, TABLE_STYLES } from "@/components/ui/DataTable"
import { PageHeader, SearchInput, StatusDot } from "@/components/ui/common"
import { exportGlossaryToExcel } from "@/lib/export"
import * as XLSX from "xlsx"
import { ImportFileDialog } from "@/components/dialogs"
import { parseExcelFile } from "@/lib/excel"
import { toast } from "sonner"
import { getAI } from "@/api/ai"
import Pagination from "@/components/Pagination"
import { PromptCategoryDropdown } from "@/components/ui/PromptCategoryDropdown"
import { StatusFilterDropdown } from "@/components/ui/StatusFilterDropdown"
import { DuplicateGlossaryDialog } from "@/components/dialogs/DuplicateGlossaryDialog"
import { getStatusConfig, LANGUAGES } from "@/lib/constants"
import { useApprovalNotifications } from "@/hooks/useApprovalNotifications"
import { findGlossaryMatches } from "@/lib/glossary-utils"



// Using centralized STATUS_CONFIG from @/lib/constants

export default function Glossary() {
    const { canDo } = useAuth()
    const { terms, addTerm, addTerms, updateTerm, deleteTerm, deleteTerms, categories: dynamicCategories } = useGlossary()
    const { templates } = usePrompts()
    const [searchQuery, setSearchQuery] = useState("")
    const [hoveredTermId, setHoveredTermId] = useState(null)
    const [activeCategory, setActiveCategory] = useState('All')
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

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(25)

    // Duplicate detection state
    const [pendingNewTerms, setPendingNewTerms] = useState([])
    const [duplicates, setDuplicates] = useState([])
    const [isDuplicateDialogOpen, setIsDuplicateDialogOpen] = useState(false)
    const [duplicateConfirm, setDuplicateConfirm] = useState(null) // { term, matchedTerm }
    const { markAsViewed, isRowNew } = useApprovalNotifications()

    // Mark as viewed on mount
    useEffect(() => {
        markAsViewed('glossary', 'main')
    }, [])


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
                toast.info(`Translating ${termsToTranslate.length} selected terms...`)
            } else {
                // No selection - translate only terms with empty translations (my or cn)
                termsToTranslate = terms.filter(term => !term.my?.trim() || !term.cn?.trim())
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



            // Call translation API - use en field for source text
            const results = await getAI().generateBatch(
                termsToTranslate.map(term => ({ id: term.id, text: term.en })),
                {
                    targetLanguages: ['my', 'zh'],
                    glossaryTerms: [], // Don't use glossary for glossary translation
                    template: defaultTemplate
                }
            )

            // Update terms with translations - use PocketBase field names
            let successCount = 0
            for (const result of results) {
                if (result.status !== 'error') {
                    await updateTerm(result.id, {
                        my: result.my,
                        cn: result.zh,
                        status: 'draft' // Keep as draft for review
                    })
                    successCount++
                }
            }

            toast.success(`Successfully translated ${successCount} terms!`)
            setSelectedIds([]) // Clear selection after translation

        } catch (error) {
            if (error.message === 'API_NOT_CONFIGURED') {
                toast.error('AI Translation is currently unavailable')
            } else if (error.message === 'RATE_LIMIT') {
                toast.error('Rate limited. Please wait a moment and try again.')
            } else {
                toast.error('Translation failed: ' + error.message)
            }
        } finally {
            setIsTranslating(false)
            setSelectedIds([])
        }
    }

    // Send for review - change status of terms with complete translations
    const handleSendForReview = async () => {
        let termsToSend = []

        if (selectedIds.length > 0) {
            termsToSend = terms.filter(t => selectedIds.includes(t.id))
        } else {
            // Fallback: Send all eligible from filtered view
            termsToSend = filteredTerms.filter(t => t.status !== 'review' && t.status !== 'approved')
            if (termsToSend.length === 0) {
                termsToSend = filteredTerms.filter(t => t.status !== 'approved')
            }
        }

        if (termsToSend.length === 0) {
            toast.info('No terms ready for review')
            return
        }

        try {
            let successCount = 0
            for (const term of termsToSend) {
                if (term.status !== 'review') {
                    await updateTerm(term.id, { status: 'review' })
                    successCount++
                }
            }
            setSelectedIds([])
            toast.success(`Sent ${successCount || termsToSend.length} terms for review`)
        } catch (error) {
            toast.error('Failed to send for review')
        }
    }



    // Filter and sort logic
    const filteredTerms = (terms || [])
        .filter(term => {
            if (!term) return false

            const matchesSearch =
                (term.en || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (term.my || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
                (term.cn || '').includes(searchQuery)

            // Status filter - if no selection, show all
            const matchesStatus = statusFilter.length === 0 || statusFilter.includes(term.status || 'draft')

            const matchesCategory = activeCategory === 'All' || term.category === activeCategory

            return matchesSearch && matchesStatus && matchesCategory
        })

    const sortedTerms = [...filteredTerms].sort((a, b) => {
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
        let valA = a[sortField] || ""
        let valB = b[sortField] || ""

        if (typeof valA === "string") valA = valA.toLowerCase()
        if (typeof valB === "string") valB = valB.toLowerCase()

        if (valA < valB) return sortDirection === "asc" ? -1 : 1
        if (valA > valB) return sortDirection === "asc" ? 1 : -1
        return 0
    })

    // Pagination slice
    const totalItems = sortedTerms.length
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paginatedTerms = sortedTerms.slice(startIndex, endIndex)

    // Reset page when filter/search changes or items per page changes
    useEffect(() => {
        setCurrentPage(1)
    }, [searchQuery, activeCategory, statusFilter, itemsPerPage])

    // Compute button state conditions
    // hasTerms uses ORIGINAL terms - for UI elements that should always show (like Filter button)
    // hasFilteredTerms uses filtered data - for action buttons that operate on visible data
    const hasTerms = (terms || []).length > 0
    const hasFilteredTerms = filteredTerms.length > 0
    const hasSelection = selectedIds.length > 0
    const relevantTerms = hasSelection
        ? (terms || []).filter(term => term && selectedIds.includes(term.id))
        : filteredTerms // Use filtered terms for context if no selection (aligned with Project logic)

    const hasEmptyTranslations = relevantTerms.some(term => term && (!term.my?.trim() || !term.cn?.trim()))

    // Check if ALL filtered rows have translations filled
    const allFilled = hasFilteredTerms && filteredTerms.every(term => term.my?.trim() && term.cn?.trim())

    // Check if SELECTED rows have translations filled
    const selectionFilled = hasSelection && terms
        .filter(t => selectedIds.includes(t.id))
        .every(t => t.my?.trim() && t.cn?.trim())

    const allTranslated = hasFilteredTerms && !hasEmptyTranslations

    const allApproved = hasFilteredTerms && filteredTerms.every(term => !term || term.status === 'approved')

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

    // Inline row editing state - using PocketBase field names
    const [isAddingRow, setIsAddingRow] = useState(false)
    const [newRow, setNewRow] = useState({ en: '', my: '', cn: '', category: 'General' })

    const handleCreate = () => {
        setIsAddingRow(true)
        setNewRow({ en: '', my: '', cn: '', category: 'General' })
    }

    const handleSaveNewRow = async () => {
        if (!newRow.en.trim()) {
            toast.error('English term is required')
            return
        }

        const termToAdd = {
            en: newRow.en.trim(),
            my: newRow.my.trim(),
            cn: newRow.cn.trim(),
            category: newRow.category || 'General',
            status: 'draft',
            remark: ''
        }

        // Check for duplicates using existing findDuplicates function
        const { duplicates } = findDuplicates([termToAdd])
        if (duplicates.length > 0) {
            const matchedTerm = duplicates[0].existing
            // Show styled confirmation dialog
            setDuplicateConfirm({ term: termToAdd, matchedTerm })
            return // Wait for user response
        }

        // No duplicate - proceed with adding
        await addTermToGlossary(termToAdd)
    }

    // Helper to actually add term after confirmation
    const addTermToGlossary = async (termToAdd) => {
        try {
            await addTerm(termToAdd)
            toast.success('Term added successfully')
            setIsAddingRow(false)
            setNewRow({ en: '', my: '', cn: '', category: 'General' })
            setDuplicateConfirm(null)
        } catch (error) {
            toast.error('Failed to add term')
        }
    }

    const handleCancelAddRow = () => {
        setIsAddingRow(false)
        setNewRow({ en: '', my: '', cn: '', category: 'General' })
    }

    const handleNewRowKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault()
            handleSaveNewRow()
        } else if (e.key === 'Escape') {
            handleCancelAddRow()
        }
    }

    const handleEdit = useCallback((term) => {
        setEditingTerm(term)
        setIsDialogOpen(true)
    }, [])

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
            'English': t.en,
            'Bahasa Malaysia': t.my,
            '中文': t.cn,
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
            // Check against all existing terms (using PocketBase field names)
            const existingMatch = terms.find(existing => {
                // Check English
                if (newTerm.en && existing.en &&
                    newTerm.en.toLowerCase().trim() === existing.en.toLowerCase().trim()) {
                    return true
                }
                // Check Malay
                if (newTerm.my && existing.my &&
                    newTerm.my.toLowerCase().trim() === existing.my.toLowerCase().trim()) {
                    return true
                }
                // Check Chinese
                if (newTerm.cn && existing.cn &&
                    newTerm.cn.trim() === existing.cn.trim()) {
                    return true
                }
                return false
            })

            if (existingMatch) {
                // Determine which field matched
                let matchedField = 'en'
                if (newTerm.my && existingMatch.my &&
                    newTerm.my.toLowerCase().trim() === existingMatch.my.toLowerCase().trim()) {
                    matchedField = 'my'
                } else if (newTerm.cn && existingMatch.cn &&
                    newTerm.cn.trim() === existingMatch.cn.trim()) {
                    matchedField = 'cn'
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

    const handleImportFile = async (file) => {
        if (!file) return

        try {
            const parsedData = await parseExcelFile(file)
            let allTerms = []

            for (const [sheetName, sheetData] of Object.entries(parsedData)) {
                const terms = sheetData.entries.map(entry => ({
                    en: entry.english || entry.en || '',
                    my: entry.malay || entry.my || '',
                    cn: entry.chinese || entry.zh || entry.cn || '',
                    category: entry.category || 'General',
                    status: 'draft',
                    remark: entry.remark || ''
                })).filter(term => term.en)
                allTerms = [...allTerms, ...terms]
            }

            if (allTerms.length > 0) {
                await handleImport(allTerms)
            } else {
                toast.error("No valid terms found in file")
            }
        } catch (error) {
            console.error("Import error:", error)
            toast.error("Failed to parse file")
        }
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
            toast.error("Failed to resolve duplicates")
        }
    }

    // Check if any visible term has a remark
    const hasRemarks = filteredTerms.some(t => {
        const r = t.remark || t.remarks
        return r && String(r).trim().length > 0
    })

    // Column Definitions for DataTable - STABLE structure (no conditional columns)
    // All columns always present to prevent React reconciliation issues
    const columns = [
        {
            header: LANGUAGES.en.label,
            accessor: "en",
            width: "22%",
            sortable: true,
            render: (row) => (
                <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-700">
                    <GlossaryHighlighter
                        text={row.en || ''}
                        language="en"
                        glossaryTerms={terms.filter(t => t.id !== row.id && (t.status === 'approved' || t.status === 'published'))}
                        hoveredTermId={hoveredTermId}
                        onHover={setHoveredTermId}
                    />
                </div>
            )
        },
        {
            header: LANGUAGES.my.label,
            accessor: "my",
            width: "22%",
            sortable: true,
            render: (row) => (
                <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-700">
                    <GlossaryHighlighter
                        text={row.my || ''}
                        language="my"
                        glossaryTerms={terms.filter(t => t.id !== row.id && (t.status === 'approved' || t.status === 'published'))}
                        hoveredTermId={hoveredTermId}
                        onHover={setHoveredTermId}
                    />
                </div>
            )
        },
        {
            header: LANGUAGES.zh.label,
            accessor: "cn",
            width: "22%",
            sortable: true,
            render: (row) => (
                <div className="whitespace-pre-wrap text-[13px] leading-relaxed text-slate-700">
                    <GlossaryHighlighter
                        text={row.cn || ''}
                        language="zh"
                        glossaryTerms={terms.filter(t => t.id !== row.id && (t.status === 'approved' || t.status === 'published'))}
                        hoveredTermId={hoveredTermId}
                        onHover={setHoveredTermId}
                    />
                </div>
            )
        }, // Note: Glossary uses 'cn' field
        {
            header: "Status",
            accessor: "status",
            width: "120px",
            minWidth: "120px",
            render: (row) => {
                const config = getStatusConfig(row.status)
                if (!config) {
                    return <span className="text-muted-foreground">{row.status || 'Unknown'}</span>
                }
                return (
                    <div className="flex items-center gap-1.5 text-[13px] text-muted-foreground">
                        <span
                            className="w-1.5 h-1.5 rounded-full"
                            style={{ backgroundColor: config.color }}
                        />
                        {config.label}
                    </div>
                )
            }
        },
        ...(hasRemarks ? [{
            header: "Remarks",
            accessor: "remark",
            width: "200px",
            minWidth: "150px",
            render: (row) => {
                const rawRemark = row.remark || row.remarks
                const remarkText = rawRemark ? String(rawRemark) : ''

                if (!remarkText.trim()) return <span style={{ color: 'hsl(220, 13%, 91%)' }}>—</span>

                return (
                    <div className="text-[13px] text-slate-500 italic truncate max-w-[150px]" title={remarkText}>
                        {remarkText}
                    </div>
                )
            }
        }] : []),
        {
            header: "Category",
            accessor: "category",
            width: "120px",
            minWidth: "120px",
            render: (row) => (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-500">
                    {row.category || 'General'}
                </span>
            )
        },
        {
            header: "Template",
            accessor: "promptId",
            width: "150px",
            minWidth: "150px",
            render: (row) => {
                return (
                    <PromptCategoryDropdown
                        currentPromptId={row.promptId}
                        templates={templates}
                        onSelect={(promptId) => {
                            if (!row.id) {
                                toast.error("Error: Row ID missing")
                                return
                            }
                            updateTerm(row.id, { promptId })
                            toast.success('Prompt updated')
                        }}
                    />
                )
            }
        },
        {
            header: "",
            accessor: "actions",
            width: "80px",
            minWidth: "80px",
            render: (row) => (
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <IconButton>
                            <MoreHorizontal className="w-4 h-4 text-slate-500" />
                        </IconButton>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" style={{ minWidth: '120px' }}>
                        <DropdownMenuItem onClick={() => handleEdit(row)} className="cursor-pointer">
                            <Pencil className="w-3.5 h-3.5 mr-2 text-slate-500" />
                            Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem
                            onClick={() => setDeleteConfirm(row.id)}
                            className="cursor-pointer text-red-600 focus:text-red-700 focus:bg-red-50"
                        >
                            <Trash2 className="w-3.5 h-3.5 mr-2" />
                            Delete
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            )
        }
    ]

    return (
        <TooltipProvider>
            <PageContainer>


                {/* Page Title */}
                {/* Page Title */}
                {/* Header & Controls Wrapper - Standardized Spacing */}
                <div className="flex flex-col gap-6 mb-8">
                    <PageHeader
                        description="Manage your translation terms and definitions"
                        actions={
                            canDo(ACTIONS.CREATE_GLOSSARY) && (
                                <PrimaryButton onClick={handleCreate}>
                                    <Plus className="w-4 h-4 mr-2" />
                                    New Term
                                </PrimaryButton>
                            )
                        }
                    >
                        Glossary
                    </PageHeader>

                    {/* Category Filter Tags */}
                    <div className="flex gap-2 overflow-x-auto pb-1 no-scrollbar">
                        {['All', ...new Set([
                            ...dynamicCategories.map(c => c.name || c),
                            ...(terms || []).map(t => t.category).filter(Boolean)
                        ])].filter(c => c).map(category => (
                            <button
                                key={category}
                                onClick={() => setActiveCategory(category)}
                                className={`px-4 py-2 rounded-full text-[13px] font-medium border-none cursor-pointer whitespace-nowrap transition-all duration-150 ${activeCategory === category ? 'bg-primary text-white shadow-sm' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                            >
                                {category}
                            </button>
                        ))}
                    </div>

                    {/* Action Bar */}
                    <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">
                            {selectedIds.length > 0 ? `${selectedIds.length} row(s) selected` : `${filteredTerms.length} row(s)`}
                        </span>

                        <div className="flex items-center gap-2">
                            {/* Search */}
                            <SearchInput
                                value={searchQuery}
                                onChange={setSearchQuery}
                                placeholder="Search"
                                width="200px" // Matched Prompt Library EXACTLY
                            />



                            {/* Filter - only show if there are terms AND no selection */}
                            {hasTerms && !hasSelection && (
                                <StatusFilterDropdown
                                    selectedStatuses={statusFilter}
                                    onStatusChange={setStatusFilter}
                                    className="h-8 px-4 text-xs border-border"
                                />
                            )}

                            {/* Import - always shown unless selection active */}
                            {canDo(ACTIONS.CREATE_GLOSSARY) && !hasSelection && (
                                <PillButton
                                    variant="outline"
                                    onClick={() => setIsImportOpen(true)}
                                    className="ml-2"
                                >
                                    <Upload className="w-3.5 h-3.5 mr-2" /> Import
                                </PillButton>
                            )}

                            {/* Selection Actions */}
                            {hasSelection && (
                                <>
                                    <PillButton
                                        variant="outline"
                                        onClick={() => setBulkDeleteConfirm(true)}
                                        className="ml-2 text-destructive border-destructive/20 hover:bg-destructive/10"
                                    >
                                        <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete {selectedIds.length}
                                    </PillButton>

                                    {/* Translate Selected */}
                                    {!allApproved && (
                                        <PrimaryButton
                                            className="h-8 text-xs px-4 ml-2 bg-blue-600 hover:bg-blue-700"
                                            onClick={handleTranslateAll}
                                            disabled={isTranslating}
                                        >
                                            <span className="text-sm mr-1">✦</span> Translate {selectedIds.length}
                                        </PrimaryButton>
                                    )}

                                    {/* Send to Review */}
                                    {selectionFilled && (
                                        <PrimaryButton
                                            className="h-8 text-xs px-4 ml-2"
                                            onClick={handleSendForReview}
                                        >
                                            <Send className="w-3.5 h-3.5 mr-2" /> Send {selectedIds.length} to Review
                                        </PrimaryButton>
                                    )}
                                </>
                            )}

                            {/* Export - Available when NO selection and ALL FILLED */}
                            {hasFilteredTerms && !hasSelection && allFilled && (
                                <PillButton
                                    variant="outline"
                                    style={{ height: '32px', fontSize: '12px', padding: '0 16px', marginLeft: '8px' }}
                                    onClick={handleExport}
                                >
                                    <Download style={{ width: '14px', height: '14px' }} /> Export
                                </PillButton>
                            )}

                            {/* Translate No Selection */}
                            {hasFilteredTerms && !hasSelection && !allFilled && (
                                <PrimaryButton
                                    className="h-8 text-xs px-4 ml-2 bg-blue-600 hover:bg-blue-700"
                                    style={{ marginLeft: '8px' }}
                                    onClick={handleTranslateAll}
                                    disabled={isTranslating}
                                >
                                    {isTranslating ? (
                                        <><Loader2 style={{ width: '14px', height: '14px', marginRight: '4px', animation: 'spin 1s linear infinite' }} /> Translating...</>
                                    ) : (
                                        <><span style={{ fontSize: '14px' }}>✦</span> Translate</>
                                    )}
                                </PrimaryButton>
                            )}

                            {/* Send for Review No Selection */}
                            {hasFilteredTerms && !hasSelection && allTranslated && !allApproved && (
                                <PrimaryButton
                                    style={{ height: '32px', fontSize: '12px', padding: '0 16px', marginLeft: '8px' }}
                                    onClick={handleSendForReview}
                                    disabled={isTranslating}
                                >
                                    <Send style={{ width: '14px', height: '14px' }} /> Send for Review
                                </PrimaryButton>
                            )}
                        </div>
                    </div>
                </div>

                {/* DataTable */}
                <DataTable
                    columns={columns}
                    data={paginatedTerms}
                    selectedIds={selectedIds}
                    onToggleSelect={toggleSelect}
                    onToggleSelectAll={toggleSelectAll}
                    sortConfig={{ field: sortField, direction: sortDirection }}
                    onSort={handleSort}
                    onRowClick={(row) => toggleSelect(row.id)}
                    emptyMessage="No glossary terms found"
                    scrollable={true}
                    getRowStyle={(row) => isRowNew('glossary', 'main', row) ? { backgroundColor: COLORS.primaryLightest } : {}}
                >
                    {/* Inline Add Row */}
                    {isAddingRow && (
                        <tr style={{ borderBottom: `1px solid ${TABLE_STYLES.borderColor}`, backgroundColor: 'hsl(340, 82%, 59%, 0.03)' }}>
                            <td style={{ width: TABLE_STYLES.checkboxColumnWidth, padding: TABLE_STYLES.headerPadding }}></td>
                            <td style={{ padding: TABLE_STYLES.cellPadding }}>
                                <input
                                    type="text"
                                    placeholder="English term"
                                    value={newRow.en}
                                    onChange={(e) => setNewRow(prev => ({ ...prev, en: e.target.value }))}
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
                            <td style={{ padding: TABLE_STYLES.cellPadding }}>
                                <input
                                    type="text"
                                    placeholder="Bahasa Malaysia"
                                    value={newRow.my}
                                    onChange={(e) => setNewRow(prev => ({ ...prev, my: e.target.value }))}
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
                            <td style={{ padding: TABLE_STYLES.cellPadding }}>
                                <input
                                    type="text"
                                    placeholder="Chinese"
                                    value={newRow.cn}
                                    onChange={(e) => setNewRow(prev => ({ ...prev, cn: e.target.value }))}
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
                            <td style={{ padding: TABLE_STYLES.cellPadding }}>
                                <span style={{ fontSize: '13px', color: 'hsl(220, 9%, 46%)' }}>Draft</span>
                            </td>
                            <td style={{ padding: TABLE_STYLES.cellPadding }}>
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
                                    {dynamicCategories.map(cat => (
                                        <option key={cat.id || cat.name} value={cat.name || cat}>{cat.name || cat}</option>
                                    ))}
                                </select>
                            </td>
                            <td style={{ padding: TABLE_STYLES.cellPadding }}>
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <button
                                        onClick={handleSaveNewRow}
                                        style={{
                                            padding: '6px 12px',
                                            fontSize: '12px',
                                            fontWeight: 500,
                                            color: 'white',
                                            backgroundColor: COLORS.primary,
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
                                        padding: TABLE_STYLES.headerPadding,
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

                {/* Pagination */}
                {totalItems > 0 && (
                    <Pagination
                        currentPage={currentPage}
                        totalItems={totalItems}
                        itemsPerPage={itemsPerPage}
                        onPageChange={setCurrentPage}
                        onItemsPerPageChange={setItemsPerPage}
                    />
                )}

                <ImportFileDialog
                    isOpen={isImportOpen}
                    onClose={() => setIsImportOpen(false)}
                    onImport={handleImportFile}
                    title="Import Glossary Terms"
                    accept=".xlsx,.xls,.csv"
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
                <ConfirmDialog
                    open={!!deleteConfirm}
                    onClose={() => setDeleteConfirm(null)}
                    onConfirm={() => handleDelete(deleteConfirm)}
                    title="Delete Term?"
                    message="Are you sure you want to delete this term? This action cannot be undone."
                    confirmLabel="Delete"
                    variant="destructive"
                />

                {/* Bulk Delete Confirmation */}
                <ConfirmDialog
                    open={bulkDeleteConfirm}
                    onClose={() => setBulkDeleteConfirm(false)}
                    onConfirm={handleBulkDelete}
                    title={`Delete ${selectedIds.length} Terms?`}
                    message={`Are you sure you want to delete ${selectedIds.length} terms? This action cannot be undone.`}
                    confirmLabel="Delete All"
                    variant="destructive"
                />

                {/* Duplicate Confirmation Dialog */}
                <ConfirmDialog
                    open={!!duplicateConfirm}
                    onClose={() => setDuplicateConfirm(null)}
                    onConfirm={() => addTermToGlossary(duplicateConfirm?.term)}
                    title="Duplicate Detected"
                    message={`A term with similar content already exists: "${duplicateConfirm?.matchedTerm?.english}"\n\nDo you want to add this term anyway?`}
                    confirmLabel="Add Anyway"
                    variant="default"
                />
            </PageContainer>
        </TooltipProvider >
    )
}
