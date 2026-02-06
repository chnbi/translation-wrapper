// Approvals - Review pending translations (Project-page style UI)
import { useState, useEffect, useMemo } from "react"
import { Search, Check, X, Undo2 } from "lucide-react"
import { useProjects } from "@/context/ProjectContext"
import { useGlossary } from "@/context/GlossaryContext"
import { COLORS, PrimaryButton } from "@/components/ui/shared"
import { SearchInput } from "@/components/ui/common"
import { DataTable } from "@/components/ui/DataTable"
import Pagination from "@/components/Pagination"
import { toast } from "sonner"
import { useAuth } from "@/App"
import { LANGUAGES, getLanguageLabel } from "@/lib/constants"

export default function Approvals() {
    const { isManager } = useAuth()
    const { projects, getProjectPages, getPageRows, getProjectRows, updateProjectRow, recomputeProjectStats } = useProjects()
    const { terms: glossaryTerms, updateTerm: updateGlossaryTerm } = useGlossary()
    const [searchQuery, setSearchQuery] = useState("")
    const [activeTab, setActiveTab] = useState("projects") // "projects" or "glossary"
    const [selectedIds, setSelectedIds] = useState([])

    // Per-language approval state: { [rowId]: { [langCode]: 'approved' | 'rejected' } }
    const [localApprovals, setLocalApprovals] = useState({})

    // Per-language remarks: { [rowId]: { [langCode]: "remark text" } }
    const [localRemarks, setLocalRemarks] = useState({})

    const [projectReviewRows, setProjectReviewRows] = useState([])

    // Pagination state
    const [currentPage, setCurrentPage] = useState(1)
    const [itemsPerPage, setItemsPerPage] = useState(25)

    // Redirect Editors to Home
    useEffect(() => {
        if (!isManager) {
            window.location.hash = '#'
        }
    }, [isManager])

    // Load project review rows from all pages AND legacy project rows
    useEffect(() => {
        if (!isManager) return

        const loadProjectReviewRows = async () => {
            const allReviewRows = []
            // console.log('🔄 [Approvals] Loading. Projects:', projects.length)

            for (const project of projects) {
                // Determine target languages for this project to check columns
                const targetLangs = project.targetLanguages || ['my', 'zh'] // default fallback

                // Helper to normalize row for UI
                const normalizeRow = (row, pageId, pageName) => {
                    // Start with base row
                    const normalized = {
                        ...row,
                        projectId: project.id,
                        projectName: project.name,
                        pageId: pageId,
                        pageName: pageName,
                        targetLanguages: targetLangs, // Pass down for column filtering
                        // Normalize translations structure if it's missing (legacy data)
                        translations: row.translations || {}
                    }

                    // If legacy columns exist, backfill translations if not present
                    targetLangs.forEach(lang => {
                        if (!normalized.translations[lang]) {
                            // Check legacy column
                            if (row[lang]) {
                                normalized.translations[lang] = {
                                    text: row[lang],
                                    status: row.status, // Inherit row status
                                    remark: row.remarks || row.remark || ''
                                }
                            }
                        }
                    })

                    return normalized
                }

                const pages = getProjectPages(project.id) || []

                if (pages.length > 0) {
                    for (const page of pages) {
                        const rows = getPageRows(project.id, page.id) || []
                        const reviewRows = rows.filter(row => row.status === 'review')

                        allReviewRows.push(...reviewRows.map(r => normalizeRow(r, page.id, page.name || 'Sheet 1')))
                    }
                } else {
                    const legacyRows = getProjectRows(project.id) || []
                    const reviewRows = legacyRows.filter(row => row.status === 'review')

                    allReviewRows.push(...reviewRows.map(r => normalizeRow(r, null, '—')))
                }
            }

            setProjectReviewRows(allReviewRows)
        }

        loadProjectReviewRows()
    }, [projects, getProjectPages, getPageRows, getProjectRows, isManager])

    // Gather glossary terms that need review
    // Glossary uses a simpler structure, usually single status for everything or per-term?
    // Assuming glossary is still simple for now, but let's normalize it to match structure if possible
    // Or keep glossary logic separate. 
    // Glossary terms usually have: english, malay, chinese, status. 
    // Let's treat them as keys.
    const glossaryReviewRows = glossaryTerms
        .filter(term => term.status === 'review')
        .map(term => ({
            ...term,
            projectName: 'Glossary',
            pageName: '—',
            // Mock translation structure for unifying logic if needed, 
            // but glossary table is separate, so we can keep separate logic.
        }))

    if (!isManager) return null

    // Active rows based on tab
    const activeRows = activeTab === "projects" ? projectReviewRows : glossaryReviewRows

    // Filter by search
    const filteredRows = activeRows.filter(row => {
        if (!searchQuery) return true
        const q = searchQuery.toLowerCase()
        if (activeTab === "glossary") {
            return (row.english || '').toLowerCase().includes(q) ||
                (row.malay || '').toLowerCase().includes(q) ||
                (row.chinese || '').toLowerCase().includes(q)
        }

        // Search in all translations
        const translationMatches = Object.values(row.translations || {}).some(t =>
            (t.text || '').toLowerCase().includes(q)
        )

        return (row.en || row.source_text || '').toLowerCase().includes(q) ||
            translationMatches ||
            (row.projectName || '').toLowerCase().includes(q)
    })

    // Slice for pagination
    const totalItems = filteredRows.length
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paginatedRows = filteredRows.slice(startIndex, endIndex)

    // Reset page when tab/search changes
    useEffect(() => {
        setCurrentPage(1)
    }, [activeTab, searchQuery])

    // Selection handlers
    const toggleSelect = (id) => {
        setSelectedIds(prev =>
            prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
        )
    }

    const toggleSelectAll = () => {
        if (selectedIds.length === filteredRows.length) {
            setSelectedIds([])
        } else {
            setSelectedIds(filteredRows.map(r => r.id))
        }
    }

    // Approval handlers helper
    const updateLocalStatus = (rowId, langCode, status) => {
        setLocalApprovals(prev => ({
            ...prev,
            [rowId]: {
                ...(prev[rowId] || {}),
                [langCode]: status
            }
        }))
    }

    const updateLocalRemark = (rowId, langCode, remark) => {
        setLocalRemarks(prev => ({
            ...prev,
            [rowId]: {
                ...(prev[rowId] || {}),
                [langCode]: remark
            }
        }))
    }

    // Determine pending actions count
    const getUpdatesCount = () => {
        let count = 0
        Object.values(localApprovals).forEach(langs => {
            count += Object.keys(langs).length
        })
        return count
    }

    // Save approved and rejected items
    const handleSaveItems = async () => {
        const rowsToUpdate = Object.keys(localApprovals)
        if (rowsToUpdate.length === 0) {
            toast.error("No items marked for approval or rejection")
            return
        }

        try {
            if (activeTab === "projects") {
                const affectedProjectIds = new Set()

                for (const rowId of rowsToUpdate) {
                    const row = activeRows.find(r => r.id === rowId)
                    if (!row) continue

                    const updates = localApprovals[rowId] || {}
                    const remarks = localRemarks[rowId] || {}

                    // Construct new translations object merging with existing
                    const currentTranslations = row.translations || {}
                    const newTranslations = { ...currentTranslations }

                    // Also check if we need to update row-level status
                    // If ALL languages are approved -> row approved
                    // If ANY language is rejected -> row needs changes? Or stay in review?
                    // Usually: 
                    // - All Target Languages Approved -> Row Approved
                    // - Some Approved, Some Rejected -> Row Status depends on policy. usually 'review' or 'changes'

                    // Let's iterate updates
                    Object.entries(updates).forEach(([lang, status]) => {
                        newTranslations[lang] = {
                            ...(newTranslations[lang] || { text: row[lang] || '' }),
                            status: status, // 'approved' or 'changes' (if rejected)
                            remark: remarks[lang] || newTranslations[lang]?.remark || ''
                        }

                        // Map 'rejected' UI state to 'changes' DB status
                        if (status === 'rejected') {
                            newTranslations[lang].status = 'changes'
                        }
                    })

                    // Calculate new row level status
                    const targets = row.targetLanguages || ['my', 'zh']
                    const allApproved = targets.every(lang =>
                        newTranslations[lang]?.status === 'approved' // Check NEW status
                    )
                    const anyChanges = targets.some(lang =>
                        newTranslations[lang]?.status === 'changes'
                    )

                    let rowStatus = row.status
                    if (allApproved) {
                        rowStatus = 'approved'
                    } else if (anyChanges) {
                        rowStatus = 'changes' // Or can stay in review if some are still pending? 
                        // If I reject one, the whole row needs attention? Yes usually.
                    }

                    await updateProjectRow(row.projectId, row.id, {
                        translations: newTranslations,
                        status: rowStatus
                    })
                    affectedProjectIds.add(row.projectId)
                }

                // Recompute stats
                setTimeout(() => {
                    affectedProjectIds.forEach(pid => recomputeProjectStats(pid))
                }, 500)

            } else {
                // Glossary logic (Legacy single status for now)
                // Or we could implement per-lang glossary approval later
                // For now, approval applies to the term
                toast.info("Glossary per-language approval coming soon")
            }

            toast.success("Changes saved successfully")
            setLocalApprovals({})
            setLocalRemarks({})
            setSelectedIds([])
        } catch (error) {
            console.error('Error saving items:', error)
            toast.error("Failed to save items")
        }
    }

    // Dynamic Columns Building
    // 1. Identify all unique target languages present in the visible rows
    const uniqueTargetLanguages = useMemo(() => {
        const langs = new Set()
        projectReviewRows.forEach(row => {
            (row.targetLanguages || []).forEach(l => langs.add(l))
        })
        // Always ensure we have at least the ones from constant if empty?
        if (langs.size === 0) {
            langs.add('my')
            langs.add('zh')
        }
        return Array.from(langs)
    }, [projectReviewRows])

    // Project Columns Definition
    const projectColumns = useMemo(() => [
        {
            header: "Page / Context",
            accessor: "pageName",
            width: "15%",
            render: (row) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span className="font-medium text-slate-800 text-sm">
                        {row.pageName || 'Page 1'}
                    </span>
                    <span className="text-xs text-slate-500">
                        {row.projectName}
                    </span>
                </div>
            )
        },
        {
            header: "Source (English)",
            accessor: "en",
            width: "20%",
            render: (row) => (
                <div className="text-sm text-slate-700">
                    {row.source_text || row.en || ''}
                </div>
            )
        },
        ...uniqueTargetLanguages.map(lang => ({
            header: getLanguageLabel(lang),
            accessor: lang,
            width: `${Math.floor(65 / uniqueTargetLanguages.length)}%`, // Distribute remaining space
            render: (row) => {
                const translation = row.translations?.[lang] || { text: row[lang] || '' }
                const localStatus = localApprovals[row.id]?.[lang]
                const currentStatus = localStatus || translation.status || 'draft'

                // If this row doesn't target this language (unlikely if uniqueTargetLanguages is accurate)
                // Check if row.targetLanguages includes this lang
                if (row.targetLanguages && !row.targetLanguages.includes(lang)) {
                    return <span className="text-slate-300 text-xs">—</span>
                }

                return (
                    <div className="flex flex-col gap-2 group">
                        <div className="text-sm text-slate-700 min-h-[20px]">
                            {translation.text || <span className="text-slate-300 italic">Empty</span>}
                        </div>

                        {/* Status / Actions Bar */}
                        <div className="flex items-center justify-between mt-1">
                            {/* Status Indicator */}
                            {(currentStatus === 'approved') && (
                                <div className="flex items-center gap-1.5 text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full text-[11px] font-medium border border-emerald-100">
                                    <Check className="w-3 h-3" /> Approved
                                </div>
                            )}
                            {(currentStatus === 'rejected' || currentStatus === 'changes') && (
                                <div className="flex items-center gap-1.5 text-rose-600 bg-rose-50 px-2 py-0.5 rounded-full text-[11px] font-medium border border-rose-100">
                                    <X className="w-3 h-3" /> Changes
                                </div>
                            )}
                            {(currentStatus !== 'approved' && currentStatus !== 'rejected' && currentStatus !== 'changes') && (
                                <div className="text-[11px] text-slate-400 font-medium">
                                    Pending
                                </div>
                            )}

                            {/* Action Buttons */}
                            <div className="flex items-center gap-1 opacity-100 transition-opacity">
                                {/* Always visible for easier access, or use opacity-0 group-hover:opacity-100 */}

                                {localStatus ? (
                                    <button
                                        onClick={() => {
                                            const newMap = { ...localApprovals[row.id] }
                                            delete newMap[lang]
                                            setLocalApprovals(prev => ({ ...prev, [row.id]: newMap }))
                                            // Also clear remark?
                                        }}
                                        className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
                                        title="Undo"
                                    >
                                        <Undo2 className="w-4 h-4" />
                                    </button>
                                ) : (
                                    <>
                                        <button
                                            onClick={() => updateLocalStatus(row.id, lang, 'approved')}
                                            className="p-1 hover:bg-emerald-100 rounded text-slate-300 hover:text-emerald-600 transition-colors"
                                            title="Approve"
                                        >
                                            <Check className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => updateLocalStatus(row.id, lang, 'rejected')}
                                            className="p-1 hover:bg-rose-100 rounded text-slate-300 hover:text-rose-600 transition-colors"
                                            title="Request Changes"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </>
                                )}
                            </div>
                        </div>

                        {/* Remark Input if Rejected */}
                        {(currentStatus === 'rejected' || currentStatus === 'changes') && (
                            <input
                                type="text"
                                placeholder="Reason for changes..."
                                className="text-xs w-full border-b border-rose-200 bg-transparent py-1 focus:outline-none focus:border-rose-400 placeholder:text-rose-200 text-rose-700"
                                value={localRemarks[row.id]?.[lang] || translation.remark || ''}
                                onChange={(e) => updateLocalRemark(row.id, lang, e.target.value)}
                            />
                        )}
                    </div>
                )
            }
        }))
    ], [uniqueTargetLanguages, localApprovals, localRemarks, projectReviewRows]) // Add deps

    // Legacy Glossary Columns (unchanged for now)
    const glossaryColumns = [
        { header: "English", accessor: "en", width: "30%" },
        { header: "Bahasa Malaysia", accessor: "my", width: "30%" },
        { header: "Chinese", accessor: "cn", width: "30%" },
        {
            header: "Status",
            accessor: "status",
            render: () => <span className="text-xs text-slate-400">Legacy</span>
        }
    ]

    return (
        <div className="w-full pb-10">
            {/* Page Title */}
            <h1 className="text-2xl font-bold tracking-tight mb-1 text-slate-900">
                Approvals
            </h1>

            {/* Tabs */}
            <div className="flex items-center gap-6 py-3 border-b border-slate-100">
                <button
                    onClick={() => { setActiveTab("projects"); setSelectedIds([]); setLocalApprovals({}) }}
                    className={`flex items-center gap-1.5 pb-3 -mb-3.5 text-sm font-medium transition-colors ${activeTab === "projects"
                            ? 'text-slate-900 border-b-2 border-[#FF0084]'
                            : 'text-slate-500 border-b-2 border-transparent hover:text-slate-700'
                        }`}
                >
                    Projects
                    {projectReviewRows.length > 0 && (
                        <span className="bg-[#FF0084] text-white text-[10px] font-bold px-1.5 h-4 flex items-center justify-center rounded-full">
                            {projectReviewRows.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => { setActiveTab("glossary"); setSelectedIds([]); setLocalApprovals({}) }}
                    className={`flex items-center gap-1.5 pb-3 -mb-3.5 text-sm font-medium transition-colors ${activeTab === "glossary"
                            ? 'text-slate-900 border-b-2 border-[#FF0084]'
                            : 'text-slate-500 border-b-2 border-transparent hover:text-slate-700'
                        }`}
                >
                    Glossary
                </button>
            </div>

            {/* Action Bar */}
            <div className="flex items-center justify-between mb-4 mt-6">
                <div className="text-sm text-slate-500">
                    {selectedIds.length > 0 ? `${selectedIds.length} item(s) selected` : `${filteredRows.length} items`}
                </div>

                <div className="flex items-center gap-2">
                    <SearchInput
                        value={searchQuery}
                        onChange={setSearchQuery}
                        placeholder="Search..."
                        width="200px"
                    />

                    <PrimaryButton
                        style={{ height: '32px', fontSize: '12px', padding: '0 16px' }}
                        onClick={handleSaveItems}
                        disabled={getUpdatesCount() === 0}
                    >
                        Save {getUpdatesCount() > 0 ? `${getUpdatesCount()} changes` : ''}
                    </PrimaryButton>
                </div>
            </div>

            {/* Table */}
            {filteredRows.length === 0 ? (
                <div className="text-center py-12 px-6 border border-dashed border-slate-200 rounded-lg bg-slate-50 text-slate-400 text-sm">
                    No requests found.
                </div>
            ) : (
                <>
                    <DataTable
                        columns={activeTab === "projects" ? projectColumns : glossaryColumns}
                        data={paginatedRows}
                        selectedIds={selectedIds}
                        onToggleSelect={toggleSelect}
                        onToggleSelectAll={toggleSelectAll}
                    />

                    {totalItems > 0 && (
                        <Pagination
                            currentPage={currentPage}
                            totalItems={totalItems}
                            itemsPerPage={itemsPerPage}
                            onPageChange={setCurrentPage}
                            onItemsPerPageChange={setItemsPerPage}
                        />
                    )}
                </>
            )}
        </div>
    )
}
