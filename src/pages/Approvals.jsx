// Approvals - Review pending translations (Project-page style UI)
import { useState, useEffect, useMemo } from "react"
import { Search, Check, X, Undo2 } from "lucide-react"
import { useProjects } from "@/context/ProjectContext"
import { useGlossary } from "@/context/GlossaryContext"
import { COLORS, PrimaryButton, PageContainer } from "@/components/ui/shared"
import { SearchInput, PageHeader } from "@/components/ui/common"
import { DataTable } from "@/components/ui/DataTable"
import Pagination from "@/components/Pagination"
import { toast } from "sonner"
import { useAuth } from "@/context/DevAuthContext"
import { LANGUAGES, getLanguageLabel } from "@/lib/constants"

import { ReassignManagerDialog } from "@/components/dialogs/ReassignManagerDialog"
import { getUsers } from "@/api/firebase/roles"
import { UserPlus } from "lucide-react"

export default function Approvals() {
    const { isManager, user, role } = useAuth()
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

    // Reassign Dialog State
    const [reassignOpen, setReassignOpen] = useState(false)
    const [reassignData, setReassignData] = useState(null) // { rowId, lang, currentManagerId }
    const [managers, setManagers] = useState([])

    // Load managers on mount
    useEffect(() => {
        if (isManager) {
            getUsers().then(users => {
                const mgrs = users.filter(u => (u.role === 'manager' || u.role === 'admin') && u.id !== user?.id)
                setManagers(mgrs)
            })
        }
    }, [isManager])

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
                // Glossary Approval Logic
                const rowsToUpdate = Object.keys(localApprovals)
                for (const termId of rowsToUpdate) {
                    const updates = localApprovals[termId]
                    // Glossary usually has one status for the whole term (for now)
                    // If any lang is approved, we assume checking 'en' or global. 
                    // But our UI allows per-lang. 
                    // Simplified: If 'en' (or any) is set to 'approved', approve the term.
                    // If 'rejected', set status 'draft' or 'review' with remark.

                    // Since glossary structure is flat (status is on term), we take the first decision?
                    // Let's assume the user uses the 'en' column or similar to approve the TERM.
                    // Actually, updateTerm takes a partial object.

                    // Check if ANY lang is 'approved' -> Approve term
                    // Check if ANY lang is 'rejected' -> Draft term

                    const statuses = Object.values(updates)
                    const isApproved = statuses.includes('approved')
                    const isRejected = statuses.includes('rejected')

                    let newStatus = 'review'
                    if (isApproved) newStatus = 'approved'
                    if (isRejected) newStatus = 'draft' // Send back to draft

                    await updateGlossaryTerm(termId, {
                        status: newStatus
                    })
                }
                toast.success("Glossary terms updated")
            }

            toast.success("Changes saved successfully")
            setLocalApprovals({})
            setLocalRemarks({})
            setSelectedIds([])
        } catch (error) {
            toast.error("Failed to save items")
        }
    }

    // Filter rows based on manager assignment & languages
    const filteredProjectReviewRows = useMemo(() => {
        if (!isManager || !projectReviewRows.length) return []

        // Admins see everything
        if (role === 'admin' || role === 'ADMIN') return projectReviewRows

        const myLanguages = user?.languages || []
        const hasLanguageRestriction = myLanguages.length > 0

        return projectReviewRows.filter(row => {
            const translations = row.translations || {}

            // Logic: Show row if ANY target language is:
            // 1. In my allowed languages (if restricted) AND
            // 2. Unassigned OR Assigned to me

            return row.targetLanguages.some(lang => {
                // Check Language Restriction
                if (hasLanguageRestriction && !myLanguages.includes(lang)) return false

                const t = translations[lang] || {}
                const assignee = t.assignedManagerId

                // Check Assignment (Must be unassigned or assigned to me)
                if (assignee && assignee !== user?.id) return false

                // Check Status (Must be pending action)
                // If I approved it or rejected it, I don't need to see it until it comes back
                if (t.status === 'approved' || t.status === 'changes') return false

                return true
            })
        })
    }, [projectReviewRows, isManager, role, user?.id, user?.languages])

    // Dynamic Columns Building
    // 1. Identify all unique target languages present in the visible rows
    // 2. Filter columns by my languages as well
    // 3. Filter columns if ALL items in that column are assigned to someone else
    const uniqueTargetLanguages = useMemo(() => {
        const langs = new Set()
        const myLanguages = user?.languages || []
        const hasLanguageRestriction = role !== 'admin' && role !== 'ADMIN' && myLanguages.length > 0


        filteredProjectReviewRows.forEach(row => {
            (row.targetLanguages || []).forEach(l => {
                if (hasLanguageRestriction && !myLanguages.includes(l)) return
                langs.add(l)
            })
        })

        if (langs.size === 0) {
            if (!hasLanguageRestriction) {
                langs.add('my')
                langs.add('zh')
            }
        }
        return Array.from(langs)
    }, [filteredProjectReviewRows, role, user?.languages])

    // Project Columns Definition
    const projectColumns = useMemo(() => [
        {
            header: "Page / Context",
            accessor: "pageName",
            width: "15%",
            render: (row) => (
                <div className="flex flex-col gap-1">
                    <span className="font-medium text-slate-900 text-[13px]">
                        {row.pageName || 'Page 1'}
                    </span>
                    <span className="text-[12px] text-slate-500">
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
                <div className="text-[13px] text-slate-700 leading-relaxed">
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

                const assignedTo = translation.assignedManagerId
                const isAssignedToMe = !assignedTo || assignedTo === user?.id
                // isManager is already true on this page. Allow review if: admin OR (manager AND assigned to me or unassigned)
                const canReview = isManager && isAssignedToMe

                // Extra check: If I'm restricted to languages, and this isn't one of them, hide it
                // (Though column shouldn't exist ideally, but row might have it)
                const myLanguages = user?.languages || []
                const isMyLanguage = !myLanguages.length || myLanguages.includes(lang) || role === 'admin'

                // If this row doesn't target this language
                if (row.targetLanguages && !row.targetLanguages.includes(lang)) {
                    return <span className="text-slate-300 text-xs">—</span>
                }

                // If assigned to other, HIDE content as per request
                if (assignedTo && assignedTo !== user?.id && role !== 'admin') {
                    return <div className="h-full flex items-center"><span className="text-slate-200 text-xs italic">Assigned to other</span></div>

                }

                // If language not allowed
                if (!isMyLanguage) {
                    return <span className="text-slate-300 text-xs">—</span>
                }

                return (
                    <div className={`flex flex-col gap-2 group ${!canReview ? 'opacity-60' : ''}`}>
                        <div className="text-[13px] text-slate-700 leading-relaxed min-h-[20px]">
                            {translation.text || <span className="text-slate-300 italic">Empty</span>}
                        </div>

                        {/* Status / Actions Bar */}
                        <div className="flex items-center justify-between mt-1">
                            {/* Status Indicator */}
                            <div className="flex items-center gap-2">
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

                                {/* Assignment Badge */}
                                {!canReview && (
                                    <span className="text-[10px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded border border-slate-200">
                                        Other Manager
                                    </span>
                                )}
                            </div>

                            {/* Action Buttons */}
                            {canReview && (
                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                    {localStatus ? (
                                        <>
                                            <button
                                                onClick={() => {
                                                    setReassignData({
                                                        rowId: row.id,
                                                        lang: lang,
                                                        currentManagerId: translation.assignedManagerId,
                                                        projectId: row.projectId
                                                    })
                                                    setReassignOpen(true)
                                                }}
                                                className="p-1 hover:bg-blue-50 rounded text-slate-300 hover:text-blue-600 transition-colors"
                                                title="Reassign"
                                            >
                                                <UserPlus className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => {
                                                    const newMap = { ...localApprovals[row.id] }
                                                    delete newMap[lang]
                                                    setLocalApprovals(prev => ({ ...prev, [row.id]: newMap }))
                                                }}
                                                className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
                                                title="Undo"
                                            >
                                                <Undo2 className="w-3.5 h-3.5" />
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => {
                                                    setReassignData({
                                                        rowId: row.id,
                                                        lang: lang,
                                                        currentManagerId: translation.assignedManagerId,
                                                        projectId: row.projectId
                                                    })
                                                    setReassignOpen(true)
                                                }}
                                                className="p-1 hover:bg-blue-50 rounded text-slate-300 hover:text-blue-600 transition-colors"
                                                title="Reassign"
                                            >
                                                <UserPlus className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => updateLocalStatus(row.id, lang, 'approved')}
                                                className="p-1 hover:bg-emerald-100 rounded text-slate-300 hover:text-emerald-600 transition-colors"
                                                title="Approve"
                                            >
                                                <Check className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => updateLocalStatus(row.id, lang, 'rejected')}
                                                className="p-1 hover:bg-rose-100 rounded text-slate-300 hover:text-rose-600 transition-colors"
                                                title="Request Changes"
                                            >
                                                <X className="w-3.5 h-3.5" />
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        {/* Remark Input if Rejected */}
                        {canReview && (currentStatus === 'rejected' || currentStatus === 'changes') && (
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
    ], [uniqueTargetLanguages, localApprovals, localRemarks, filteredProjectReviewRows, user, role]) // Add deps

    const glossaryColumns = [
        {
            header: "English",
            accessor: "en",
            width: "25%",
            render: (row) => <div className="text-[13px] text-slate-700">{row.en}</div>
        },
        {
            header: "Bahasa Malaysia",
            accessor: "my",
            width: "25%",
            render: (row) => <div className="text-[13px] text-slate-700">{row.my}</div>
        },
        {
            header: "Chinese",
            accessor: "cn",
            width: "25%",
            render: (row) => <div className="text-[13px] text-slate-700">{row.cn}</div>
        },
        {
            header: "Actions",
            accessor: "actions",
            width: "25%",
            render: (row) => {
                const localStatus = localApprovals[row.id]?.['en'] // Use 'en' as proxy for term status
                const currentStatus = localStatus || row.status

                return (
                    <div className="flex items-center gap-2">
                        {localStatus ? (
                            <button
                                onClick={() => {
                                    const newMap = { ...localApprovals[row.id] }
                                    delete newMap['en']
                                    setLocalApprovals(prev => ({ ...prev, [row.id]: newMap }))
                                }}
                                className="p-1 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600"
                                title="Undo"
                            >
                                <Undo2 className="w-4 h-4" />
                            </button>
                        ) : (
                            <>
                                <button
                                    onClick={() => updateLocalStatus(row.id, 'en', 'approved')}
                                    className="flex items-center gap-1 px-2 py-1 bg-emerald-50 text-emerald-600 hover:bg-emerald-100 rounded border border-emerald-100 text-xs font-medium transition-colors"
                                >
                                    <Check className="w-3 h-3" /> Approve
                                </button>
                                <button
                                    onClick={() => updateLocalStatus(row.id, 'en', 'rejected')}
                                    className="flex items-center gap-1 px-2 py-1 bg-rose-50 text-rose-600 hover:bg-rose-100 rounded border border-rose-100 text-xs font-medium transition-colors"
                                >
                                    <X className="w-3 h-3" /> Reject
                                </button>
                            </>
                        )}

                        {/* Status Badge Preview */}
                        {currentStatus === 'approved' && <span className="text-xs text-emerald-600 font-medium ml-2">Approved</span>}
                        {(currentStatus === 'draft' || currentStatus === 'rejected') && <span className="text-xs text-rose-600 font-medium ml-2">Changes</span>}
                    </div>
                )
            }
        }
    ]

    return (
        <PageContainer>
            {/* Page Header */}
            <PageHeader
                description="Review and manage translations pending approval."
                actions={
                    <div className="flex gap-2">
                        <button
                            onClick={() => { setActiveTab("projects"); setSelectedIds([]); setLocalApprovals({}) }}
                            className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-full transition-all border ${activeTab === "projects"
                                ? 'bg-pink-50 text-pink-700 border-pink-200 shadow-sm'
                                : 'bg-transparent text-slate-500 border-transparent hover:bg-slate-100 hover:text-slate-700'
                                }`}
                        >
                            Projects
                            {projectReviewRows.length > 0 && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === "projects"
                                    ? 'bg-pink-200 text-pink-800'
                                    : 'bg-slate-200 text-slate-600'
                                    }`}>
                                    {projectReviewRows.length}
                                </span>
                            )}
                        </button>
                        <button
                            onClick={() => { setActiveTab("glossary"); setSelectedIds([]); setLocalApprovals({}) }}
                            className={`flex items-center gap-2 px-4 py-1.5 text-sm font-medium rounded-full transition-all border ${activeTab === "glossary"
                                ? 'bg-pink-50 text-pink-700 border-pink-200 shadow-sm'
                                : 'bg-transparent text-slate-500 border-transparent hover:bg-slate-100 hover:text-slate-700'
                                }`}
                        >
                            Glossary
                            {glossaryReviewRows.length > 0 && (
                                <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${activeTab === "glossary"
                                    ? 'bg-pink-200 text-pink-800'
                                    : 'bg-slate-200 text-slate-600'
                                    }`}>
                                    {glossaryReviewRows.length}
                                </span>
                            )}
                        </button>
                    </div>
                }
            >
                Approvals
            </PageHeader>

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
                        className="h-8 text-xs px-4"
                        onClick={handleSaveItems}
                        disabled={getUpdatesCount() === 0}
                    >
                        Save {getUpdatesCount() > 0 ? `${getUpdatesCount()} changes` : ''}
                    </PrimaryButton>
                </div>
            </div>

            {/* Table */}
            {
                filteredRows.length === 0 ? (
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
                )
            }

            <ReassignManagerDialog
                open={reassignOpen}
                onClose={() => setReassignOpen(false)}
                onConfirm={async (newManagerId) => {
                    if (!reassignData) return

                    try {
                        // We need to update the specific cell's assignedManagerId
                        // We can use updateProjectRow
                        const { rowId, lang, projectId } = reassignData
                        const row = activeRows.find(r => r.id === rowId)
                        if (!row) return

                        const currentTranslations = row.translations || {}
                        const newTranslations = {
                            ...currentTranslations,
                            [lang]: {
                                ...(currentTranslations[lang] || { text: row[lang] || '' }),
                                assignedManagerId: newManagerId
                            }
                        }

                        await updateProjectRow(projectId, rowId, {
                            translations: newTranslations
                        })

                        toast.success("Task reassigned successfully")
                        setReassignOpen(false)
                        setReassignData(null)

                        // Force refresh logic if needed, but context subscription should handle it
                    } catch (error) {
                        toast.error("Failed to reassign task")
                    }
                }}
                managers={managers}
                currentManagerId={reassignData?.currentManagerId}
                targetLanguage={reassignData?.lang}
                languageLabel={getLanguageLabel(reassignData?.lang)}
            />
        </PageContainer >
    )
}
