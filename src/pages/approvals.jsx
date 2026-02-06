
// Approvals - Review pending translations (Project-page style UI)
import { useState, useEffect, useMemo } from "react"
import { Search, Check, X } from "lucide-react"
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
    const [localApprovals, setLocalApprovals] = useState({}) // Track local approval state before save
    const [localRemarks, setLocalRemarks] = useState({}) // Track remarks/comments for each row
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

    // Show nothing while redirecting
    if (!isManager) {
        return null
    }

    // Load project review rows from all pages AND legacy project rows
    useEffect(() => {
        const loadProjectReviewRows = async () => {
            const allReviewRows = []
            console.log('🔄 [Approvals] Loading. Projects:', projects.length)

            for (const project of projects) {
                const pages = getProjectPages(project.id) || []
                console.log(`Project ${project.id}: ${pages.length} pages`)

                if (pages.length > 0) {
                    for (const page of pages) {
                        const rows = getPageRows(project.id, page.id) || []
                        const reviewRows = rows.filter(row => row.status === 'review')

                        const statusCounts = rows.reduce((acc, row) => {
                            acc[row.status || 'undefined'] = (acc[row.status || 'undefined'] || 0) + 1
                            return acc
                        }, {})
                        console.log(`  Page ${page.name} (${page.id}): ${rows.length} rows. Statuses:`, statusCounts)

                        const reviewRowsMapped = reviewRows.map(row => ({
                            ...row,
                            projectId: project.id,
                            projectName: project.name,
                            pageId: page.id,
                            pageName: page.name || 'Sheet 1'
                        }))
                        allReviewRows.push(...reviewRowsMapped)
                    }
                } else {
                    const legacyRows = getProjectRows(project.id) || []
                    const reviewRows = legacyRows.filter(row => row.status === 'review')

                    const statusCounts = legacyRows.reduce((acc, row) => {
                        acc[row.status || 'undefined'] = (acc[row.status || 'undefined'] || 0) + 1
                        return acc
                    }, {})
                    console.log(`  Legacy Project: ${legacyRows.length} rows. Statuses:`, statusCounts)

                    const reviewRowsMapped = reviewRows.map(row => ({
                        ...row,
                        projectId: project.id,
                        projectName: project.name,
                        pageId: null,
                        pageName: '—'
                    }))
                    allReviewRows.push(...reviewRowsMapped)
                }
            }

            console.log('✅ [Approvals] Total review rows:', allReviewRows.length)
            setProjectReviewRows(allReviewRows)
        }

        loadProjectReviewRows()
    }, [projects, getProjectPages, getPageRows, getProjectRows])

    // Gather glossary terms that need review (status = 'review')
    const glossaryReviewRows = glossaryTerms
        .filter(term => term.status === 'review')
        .map(term => ({
            ...term,
            projectName: 'Glossary',
            pageName: '—'
        }))

    // Debug: Log glossary terms status distribution
    const glossaryStatusCounts = glossaryTerms.reduce((acc, term) => {
        acc[term.status || 'undefined'] = (acc[term.status || 'undefined'] || 0) + 1
        return acc
    }, {})
    console.log('📦 [Approvals] Glossary terms:', glossaryTerms.length, 'Statuses:', glossaryStatusCounts, 'In review:', glossaryReviewRows.length)

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
        return (row.en || '').toLowerCase().includes(q) ||
            (row.my || '').toLowerCase().includes(q) ||
            (row.zh || '').toLowerCase().includes(q) ||
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

    // Approval handlers
    const handleApprove = (rowId) => {
        setLocalApprovals(prev => ({ ...prev, [rowId]: 'approved' }))
    }

    const handleReject = (rowId) => {
        setLocalApprovals(prev => ({ ...prev, [rowId]: 'rejected' }))
    }

    const handleCancel = (rowId) => {
        setLocalApprovals(prev => {
            const updated = { ...prev }
            delete updated[rowId]
            return updated
        })
    }

    // Get counts
    const approvedCount = Object.values(localApprovals).filter(v => v === 'approved').length
    const rejectedCount = Object.values(localApprovals).filter(v => v === 'rejected').length

    // Save approved and rejected items
    const handleSaveItems = async () => {
        const approvedIds = Object.entries(localApprovals)
            .filter(([, status]) => status === 'approved')
            .map(([id]) => id)

        const rejectedIds = Object.entries(localApprovals)
            .filter(([, status]) => status === 'rejected')
            .map(([id]) => id)

        if (approvedIds.length === 0 && rejectedIds.length === 0) {
            toast.error("No items marked for approval or rejection")
            return
        }

        try {
            if (activeTab === "projects") {
                // Process approved project rows
                const approvedRows = activeRows.filter(r => approvedIds.includes(r.id))
                const affectedProjectIds = new Set()

                for (const row of approvedRows) {
                    await updateProjectRow(row.projectId, row.id, {
                        status: 'approved',
                        approvedAt: new Date().toISOString(),
                        remarks: localRemarks[row.id] || ''
                    })
                    affectedProjectIds.add(row.projectId)
                }

                // Recompute stats for affected projects (delayed to allow state to settle)
                setTimeout(() => {
                    affectedProjectIds.forEach(pid => recomputeProjectStats(pid))
                }, 500)

                // Process rejected project rows - set status to 'changes' with remarks
                for (const row of activeRows.filter(r => rejectedIds.includes(r.id))) {
                    await updateProjectRow(row.projectId, row.id, {
                        status: 'changes',
                        remarks: localRemarks[row.id] || ''
                    })
                    affectedProjectIds.add(row.projectId)
                }
            } else {
                // Process approved glossary terms
                for (const term of activeRows.filter(t => approvedIds.includes(t.id))) {
                    await updateGlossaryTerm(term.id, {
                        status: 'approved',
                        remark: localRemarks[term.id] || ''
                    })
                }
                // Process rejected glossary terms - set status to 'changes' with remarks
                for (const term of activeRows.filter(t => rejectedIds.includes(t.id))) {
                    await updateGlossaryTerm(term.id, {
                        status: 'changes',
                        remark: localRemarks[term.id] || ''
                    })
                }
            }

            const messages = []
            if (approvedIds.length > 0) messages.push(`${approvedIds.length} approved`)
            if (rejectedIds.length > 0) messages.push(`${rejectedIds.length} need changes`)
            toast.success(`Saved: ${messages.join(', ')}`)

            setLocalApprovals({})
            setLocalRemarks({})
            setSelectedIds([])
        } catch (error) {
            console.error('Error saving items:', error)
            toast.error("Failed to save items")
        }
    }

    // Check if any row has remarks (or local remarks) to decide whether to show the column
    // Use activeRows (not filtered) to keep column structure stable across searches
    const hasRemarks = useMemo(() => {
        return activeRows.some(row => {
            const remarkText = row.remarks || row.remark || ''
            const localRemark = localRemarks[row.id] || ''
            return String(remarkText).trim().length > 0 || String(localRemark).trim().length > 0
        })
    }, [activeRows, localRemarks])

    // Columns Configuration - widths adjusted to sum 100% so checkbox stays fixed at 52px
    // Build language columns dynamically based on the project's configured languages
    const buildProjectColumns = (row) => {
        const project = projects.find(p => p.id === row.projectId)
        const sourceLanguage = project?.sourceLanguage || 'en'
        const targetLanguages = project?.targetLanguages || ['my', 'zh']

        return [
            {
                header: "Page",
                accessor: "pageName",
                width: "18%",
                render: (row) => (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                        <span style={{ fontSize: '14px', fontWeight: 500, color: 'hsl(222, 47%, 11%)' }}>
                            {row.pageName || 'Page 1'}
                        </span>
                        <span style={{ fontSize: '12px', color: 'hsl(220, 9%, 46%)' }}>
                            {row.projectName}
                        </span>
                    </div>
                )
            },
            // Source language column
            {
                header: getLanguageLabel(sourceLanguage),
                accessor: sourceLanguage === 'en' ? 'en' : 'source_text',
                width: "20%"
            },
            // Dynamic target language columns
            ...targetLanguages.map(lang => ({
                header: getLanguageLabel(lang),
                accessor: lang,
                width: `${Math.floor(36 / targetLanguages.length)}%`,
                color: 'hsl(220, 9%, 46%)'
            })),
        ]
    }

    // Static columns for the Approvals table structure
    const projectColumns = [
        {
            header: "Page",
            accessor: "pageName",
            width: "18%",
            render: (row) => (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span style={{ fontSize: '14px', fontWeight: 500, color: 'hsl(222, 47%, 11%)' }}>
                        {row.pageName || 'Page 1'}
                    </span>
                    <span style={{ fontSize: '12px', color: 'hsl(220, 9%, 46%)' }}>
                        {row.projectName}
                    </span>
                </div>
            )
        },
        { header: "Source", accessor: "en", width: "20%" },
        { header: "Bahasa Malaysia", accessor: "my", width: "18%", color: 'hsl(220, 9%, 46%)' },
        { header: "Chinese", accessor: "zh", width: "16%", color: 'hsl(220, 9%, 46%)' },

        // Remarks column - always present for stability
        {
            header: "Remarks",
            accessor: "remarks",
            width: "20%",
            render: (row) => {
                const localStatus = localApprovals[row.id]
                const remarkValue = localRemarks[row.id] || ''

                // Show input when rejected, or show existing remark
                if (localStatus === 'rejected') {
                    return (
                        <input
                            type="text"
                            placeholder="Add feedback..."
                            value={remarkValue}
                            onChange={(e) => {
                                e.stopPropagation()
                                setLocalRemarks(prev => ({ ...prev, [row.id]: e.target.value }))
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full px-2 py-1 text-sm border border-rose-200 rounded bg-rose-50/30 focus:outline-none focus:ring-1 focus:ring-rose-300"
                            style={{ fontSize: '12px' }}
                        />
                    )
                }

                // Show existing remark or placeholder
                const remarkText = row.remarks ? String(row.remarks) : ''
                return (
                    <span className="text-xs text-zinc-400 italic">
                        {remarkText.trim() || '—'}
                    </span>
                )
            }
        },
        {
            header: "Action",
            accessor: "actions",
            width: "140px",
            render: (row) => {
                const localStatus = localApprovals[row.id]

                // If already approved/rejected, show icon with cancel
                if (localStatus === 'approved') {
                    return (
                        <div className="flex items-center gap-2">
                            <div style={{
                                width: '24px', height: '24px', borderRadius: '4px',
                                backgroundColor: '#10b981',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <Check style={{ width: '14px', height: '14px', color: 'white' }} />
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleCancel(row.id) }}
                                className="text-xs text-gray-400 hover:text-gray-600"
                            >
                                Undo
                            </button>
                        </div>
                    )
                }

                if (localStatus === 'rejected') {
                    return (
                        <div className="flex items-center gap-2">
                            <div style={{
                                width: '24px', height: '24px', borderRadius: '4px',
                                backgroundColor: '#ef4444',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <X style={{ width: '14px', height: '14px', color: 'white' }} />
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleCancel(row.id) }}
                                className="text-xs text-gray-400 hover:text-gray-600"
                            >
                                Undo
                            </button>
                        </div>
                    )
                }

                // Default: show Approve/Reject buttons
                return (
                    <div className="flex gap-1">
                        <button
                            onClick={(e) => { e.stopPropagation(); handleApprove(row.id) }}
                            className="px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50 rounded border border-emerald-200"
                        >
                            Approve
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleReject(row.id) }}
                            className="px-2 py-1 text-xs font-medium text-rose-500 hover:bg-rose-50 rounded border border-rose-200"
                        >
                            Reject
                        </button>
                    </div>
                )
            }
        }
    ]

    const glossaryColumns = [
        { header: "English", accessor: "en", width: "24%" },
        { header: "Bahasa Malaysia", accessor: "my", width: "22%", color: 'hsl(220, 9%, 46%)' },
        { header: "Chinese", accessor: "cn", width: "20%", color: 'hsl(220, 9%, 46%)' },
        ...(hasRemarks ? [{
            header: "Remarks",
            accessor: "remarks",
            width: "20%",
            render: (row) => {
                const localStatus = localApprovals[row.id]
                const remarkValue = localRemarks[row.id] || ''

                // Show input when rejected
                if (localStatus === 'rejected') {
                    return (
                        <input
                            type="text"
                            placeholder="Add feedback..."
                            value={remarkValue}
                            onChange={(e) => {
                                e.stopPropagation()
                                setLocalRemarks(prev => ({ ...prev, [row.id]: e.target.value }))
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="w-full px-2 py-1 text-sm border border-rose-200 rounded bg-rose-50/30 focus:outline-none focus:ring-1 focus:ring-rose-300"
                            style={{ fontSize: '12px' }}
                        />
                    )
                }

                return (
                    <span className="text-xs text-zinc-400 italic">
                        {row.remarks || '—'}
                    </span>
                )
            }
        }] : []),
        {
            header: "Action",
            accessor: "actions",
            width: "140px",
            render: (row) => {
                const localStatus = localApprovals[row.id]

                // If already approved/rejected, show icon with undo
                if (localStatus === 'approved') {
                    return (
                        <div className="flex items-center gap-2">
                            <div style={{
                                width: '24px', height: '24px', borderRadius: '4px',
                                backgroundColor: '#10b981',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <Check style={{ width: '14px', height: '14px', color: 'white' }} />
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleCancel(row.id) }}
                                className="text-xs text-gray-400 hover:text-gray-600"
                            >
                                Undo
                            </button>
                        </div>
                    )
                }

                if (localStatus === 'rejected') {
                    return (
                        <div className="flex items-center gap-2">
                            <div style={{
                                width: '24px', height: '24px', borderRadius: '4px',
                                backgroundColor: '#ef4444',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <X style={{ width: '14px', height: '14px', color: 'white' }} />
                            </div>
                            <button
                                onClick={(e) => { e.stopPropagation(); handleCancel(row.id) }}
                                className="text-xs text-gray-400 hover:text-gray-600"
                            >
                                Undo
                            </button>
                        </div>
                    )
                }

                // Default: show Approve/Reject buttons
                return (
                    <div className="flex gap-1">
                        <button
                            onClick={(e) => { e.stopPropagation(); handleApprove(row.id) }}
                            className="px-2 py-1 text-xs font-medium text-emerald-600 hover:bg-emerald-50 rounded border border-emerald-200"
                        >
                            Approve
                        </button>
                        <button
                            onClick={(e) => { e.stopPropagation(); handleReject(row.id) }}
                            className="px-2 py-1 text-xs font-medium text-rose-500 hover:bg-rose-50 rounded border border-rose-200"
                        >
                            Reject
                        </button>
                    </div>
                )
            }
        }
    ]

    return (
        <div className="w-full pb-10">
            {/* Page Title */}
            <h1 style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em', marginBottom: '4px', color: 'hsl(222, 47%, 11%)' }}>
                Approvals
            </h1>

            {/* Tabs - Projects | Glossary */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '24px', padding: '12px 0', borderBottom: '1px solid hsl(220, 13%, 91%)' }}>
                <button
                    onClick={() => { setActiveTab("projects"); setSelectedIds([]); setLocalApprovals({}) }}
                    style={{
                        fontSize: '14px',
                        fontWeight: 500,
                        color: activeTab === "projects" ? 'hsl(222, 47%, 11%)' : 'hsl(220, 9%, 46%)',
                        paddingBottom: '12px',
                        marginBottom: '-13px',
                        background: 'none',
                        border: 'none',
                        borderBottom: activeTab === "projects" ? '2px solid #FF0084' : '2px solid transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    Projects
                    {projectReviewRows.length > 0 && (
                        <span style={{
                            backgroundColor: '#FF0084',
                            color: 'white',
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '2px 6px',
                            borderRadius: '9999px',
                            minWidth: '18px',
                            textAlign: 'center'
                        }}>
                            {projectReviewRows.length}
                        </span>
                    )}
                </button>
                <button
                    onClick={() => { setActiveTab("glossary"); setSelectedIds([]); setLocalApprovals({}) }}
                    style={{
                        fontSize: '14px',
                        fontWeight: 500,
                        color: activeTab === "glossary" ? 'hsl(222, 47%, 11%)' : 'hsl(220, 9%, 46%)',
                        paddingBottom: '12px',
                        marginBottom: '-13px',
                        background: 'none',
                        border: 'none',
                        borderBottom: activeTab === "glossary" ? '2px solid #FF0084' : '2px solid transparent',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                    }}
                >
                    Glossary
                    {glossaryReviewRows.length > 0 && (
                        <span style={{
                            backgroundColor: '#FF0084',
                            color: 'white',
                            fontSize: '11px',
                            fontWeight: 600,
                            padding: '2px 6px',
                            borderRadius: '9999px',
                            minWidth: '18px',
                            textAlign: 'center'
                        }}>
                            {glossaryReviewRows.length}
                        </span>
                    )}
                </button>
            </div>


            {/* Action Bar */}
            <div className="flex items-center justify-between mb-4 mt-6">
                <div className="flex items-center gap-2">
                    <span style={{ fontSize: '14px', color: 'hsl(220, 9%, 46%)' }}>
                        {selectedIds.length > 0 ? `${selectedIds.length} item(s) selected` : `${filteredRows.length} items`}
                    </span>
                </div>

                <div className="flex items-center gap-2">
                    {/* Search */}
                    <SearchInput
                        value={searchQuery}
                        onChange={setSearchQuery}
                        placeholder="Search..."
                        width="200px"
                    />

                    {/* Bulk Approve - Only when items are selected */}
                    {selectedIds.length > 0 && (
                        <button
                            onClick={() => {
                                selectedIds.forEach(id => handleApprove(id))
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                height: '32px',
                                padding: '0 14px',
                                fontSize: '12px',
                                fontWeight: 500,
                                color: '#10b981',
                                backgroundColor: 'transparent',
                                border: '1px solid #10b981',
                                borderRadius: '9999px',
                                cursor: 'pointer'
                            }}
                        >
                            <Check style={{ width: '14px', height: '14px' }} /> Approve {selectedIds.length}
                        </button>
                    )}

                    {/* Bulk Reject - Only when items are selected */}
                    {selectedIds.length > 0 && (
                        <button
                            onClick={() => {
                                selectedIds.forEach(id => handleReject(id))
                            }}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                height: '32px',
                                padding: '0 14px',
                                fontSize: '12px',
                                fontWeight: 500,
                                color: '#ef4444',
                                backgroundColor: 'transparent',
                                border: '1px solid #ef4444',
                                borderRadius: '9999px',
                                cursor: 'pointer'
                            }}
                        >
                            <X style={{ width: '14px', height: '14px' }} /> Reject {selectedIds.length}
                        </button>
                    )}

                    <PrimaryButton
                        style={{ height: '32px', fontSize: '12px', padding: '0 16px' }}
                        onClick={handleSaveItems}
                        disabled={approvedCount === 0 && rejectedCount === 0}
                    >
                        <span style={{ fontSize: '14px' }}>✦</span> Save {(approvedCount + rejectedCount) > 0 ? `${approvedCount + rejectedCount} items` : 'items'}
                    </PrimaryButton>
                </div>

            </div>

            {/* Reusable Data Table or Empty State */}
            {filteredRows.length === 0 ? (
                <div style={{
                    textAlign: 'center',
                    padding: '48px 24px',
                    color: 'hsl(220, 9%, 46%)',
                    fontSize: '14px',
                    border: '1px solid hsl(220, 13%, 91%)',
                    borderRadius: '8px',
                    backgroundColor: 'hsl(220, 14%, 96%)'
                }}>
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
                </>
            )}


        </div>
    )
}
