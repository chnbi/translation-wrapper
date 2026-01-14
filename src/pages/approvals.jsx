
// Approvals - Review pending translations (Project-page style UI)
import { useState, useEffect } from "react"
import { Search, Check, X } from "lucide-react"
import { useProjects } from "@/context/ProjectContext"
import { useGlossary } from "@/context/GlossaryContext"
import { COLORS, PrimaryButton } from "@/components/ui/shared"
import { DataTable } from "@/components/ui/DataTable"
import { toast } from "sonner"

export default function Approvals() {
    const { projects, getProjectPages, getPageRows, getProjectRows, updateProjectRow, recomputeProjectStats } = useProjects()
    const { terms: glossaryTerms, updateTerm: updateGlossaryTerm } = useGlossary()
    const [searchQuery, setSearchQuery] = useState("")
    const [activeTab, setActiveTab] = useState("projects") // "projects" or "glossary"
    const [selectedIds, setSelectedIds] = useState([])
    const [localApprovals, setLocalApprovals] = useState({}) // Track local approval state before save
    const [projectReviewRows, setProjectReviewRows] = useState([])

    // Load project review rows from all pages AND legacy project rows
    useEffect(() => {
        const loadProjectReviewRows = async () => {
            const allReviewRows = []

            for (const project of projects) {
                const pages = getProjectPages(project.id) || []

                if (pages.length > 0) {
                    // Project has pages - check page rows
                    for (const page of pages) {
                        const rows = getPageRows(project.id, page.id) || []
                        const reviewRows = rows
                            .filter(row => row.status === 'review')
                            .map(row => ({
                                ...row,
                                projectId: project.id,
                                projectName: project.name,
                                pageId: page.id,
                                pageName: page.name || 'Sheet 1'
                            }))
                        allReviewRows.push(...reviewRows)
                    }
                } else {
                    // Legacy project without pages - check flat project rows
                    const legacyRows = getProjectRows(project.id) || []
                    const reviewRows = legacyRows
                        .filter(row => row.status === 'review')
                        .map(row => ({
                            ...row,
                            projectId: project.id,
                            projectName: project.name,
                            pageId: null,
                            pageName: '—'
                        }))
                    allReviewRows.push(...reviewRows)
                }
            }

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

    // Active rows based on tab
    const activeRows = activeTab === "projects" ? projectReviewRows : glossaryReviewRows

    // Filter by search
    const filteredRows = activeRows.filter(row => {
        const searchLower = searchQuery.toLowerCase()
        if (activeTab === "projects") {
            return row.en?.toLowerCase().includes(searchLower) ||
                row.my?.toLowerCase().includes(searchLower) ||
                row.zh?.includes(searchQuery) ||
                row.projectName?.toLowerCase().includes(searchLower)
        } else {
            return row.english?.toLowerCase().includes(searchLower) ||
                row.malay?.toLowerCase().includes(searchLower) ||
                row.chinese?.includes(searchQuery)
        }
    })

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
                const approvedRows = filteredRows.filter(r => approvedIds.includes(r.id))
                const affectedProjectIds = new Set()

                for (const row of approvedRows) {
                    await updateProjectRow(row.projectId, row.id, {
                        status: 'approved',
                        approvedAt: new Date().toISOString()
                    })
                    affectedProjectIds.add(row.projectId)
                }

                // Recompute stats for affected projects
                affectedProjectIds.forEach(pid => recomputeProjectStats(pid))

                // Process rejected project rows - set status to 'changes'
                for (const row of filteredRows.filter(r => rejectedIds.includes(r.id))) {
                    await updateProjectRow(row.projectId, row.id, { status: 'changes' })
                }
            } else {
                // Process approved glossary terms
                for (const term of filteredRows.filter(t => approvedIds.includes(t.id))) {
                    await updateGlossaryTerm(term.id, { status: 'approved' })
                }
                // Process rejected glossary terms - set status to 'changes'
                for (const term of filteredRows.filter(t => rejectedIds.includes(t.id))) {
                    await updateGlossaryTerm(term.id, { status: 'changes' })
                }
            }

            const messages = []
            if (approvedIds.length > 0) messages.push(`${approvedIds.length} approved`)
            if (rejectedIds.length > 0) messages.push(`${rejectedIds.length} need changes`)
            toast.success(`Saved: ${messages.join(', ')}`)

            setLocalApprovals({})
            setSelectedIds([])
        } catch (error) {
            console.error('Error saving items:', error)
            toast.error("Failed to save items")
        }
    }

    // Columns Configuration - widths adjusted to sum 100% so checkbox stays fixed at 52px
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
        { header: "English", accessor: "en", width: "22%" },
        { header: "Bahasa Malaysia", accessor: "my", width: "20%", color: 'hsl(220, 9%, 46%)' },
        { header: "Chinese", accessor: "zh", width: "18%", color: 'hsl(220, 9%, 46%)' },
        {
            header: "Status",
            accessor: "status",
            width: "12%",
            render: (row) => {
                const localStatus = localApprovals[row.id]

                // Status config based on local approval state
                const statusConfig = {
                    approved: { color: '#10b981', label: 'Approved' },
                    rejected: { color: '#ef4444', label: 'Reject' },
                    pending: { color: '#3b82f6', label: 'Pending' },
                }

                const status = localStatus || 'pending'
                const config = statusConfig[status] || statusConfig.pending

                return (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span style={{
                            width: '6px',
                            height: '6px',
                            borderRadius: '50%',
                            backgroundColor: config.color
                        }} />
                        <span style={{ fontSize: '13px', color: 'hsl(220, 9%, 46%)' }}>
                            {config.label}
                        </span>
                    </div>
                )
            }
        },
        {
            header: "Action",
            accessor: "actions",
            width: "12%",
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
        { header: "English", accessor: "english", width: "30%" },
        { header: "Bahasa Malaysia", accessor: "malay", width: "28%", color: 'hsl(220, 9%, 46%)' },
        { header: "Chinese", accessor: "chinese", width: "24%", color: 'hsl(220, 9%, 46%)' },
        {
            header: "Status",
            accessor: "status",
            width: "10%",
            render: (row) => {
                const localStatus = localApprovals[row.id]
                if (localStatus === 'approved') {
                    return (
                        <div style={{
                            width: '24px', height: '24px', borderRadius: '4px',
                            backgroundColor: 'hsl(142, 71%, 45%)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Check style={{ width: '14px', height: '14px', color: 'white' }} />
                        </div>
                    )
                }
                if (localStatus === 'rejected') {
                    return (
                        <div style={{
                            width: '24px', height: '24px', borderRadius: '4px',
                            backgroundColor: 'hsl(343, 81%, 58%)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <X style={{ width: '14px', height: '14px', color: 'white' }} />
                        </div>
                    )
                }
                return (
                    <div style={{ width: '24px', height: '24px', borderRadius: '4px', border: '1px dashed hsl(220, 9%, 46%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: 'hsl(220, 9%, 46%)', opacity: 0.5 }}></div>
                    </div>
                )
            }
        },
        {
            header: "Action",
            accessor: "actions",
            width: "8%",
            render: (row) => (
                <div className="flex gap-2">
                    <button
                        onClick={(e) => { e.stopPropagation(); handleApprove(row.id) }}
                        className="p-1 hover:bg-emerald-50 text-emerald-600 rounded"
                    >
                        <Check size={16} />
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); handleReject(row.id) }}
                        className="p-1 hover:bg-rose-50 text-rose-500 rounded"
                    >
                        <X size={16} />
                    </button>
                </div>
            )
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
                        cursor: 'pointer'
                    }}
                >
                    Projects
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
                    <div style={{ position: 'relative' }}>
                        <input
                            type="text"
                            placeholder="Search..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                paddingLeft: '32px',
                                paddingRight: '12px',
                                height: '32px',
                                borderRadius: '9999px',
                                border: '1px solid hsl(220, 13%, 91%)',
                                fontSize: '13px',
                                width: '200px',
                                outline: 'none'
                            }}
                        />
                        <Search style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', width: '14px', height: '14px', color: 'hsl(220, 9%, 46%)' }} />
                    </div>



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
                <DataTable
                    columns={activeTab === "projects" ? projectColumns : glossaryColumns}
                    data={filteredRows}
                    selectedIds={selectedIds}
                    onToggleSelect={toggleSelect}
                    onToggleSelectAll={toggleSelectAll}
                    onRowClick={(row) => console.log('Row clicked', row)}
                />
            )}

        </div>
    )
}
