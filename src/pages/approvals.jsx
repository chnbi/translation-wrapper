import { useState } from "react"
import { CheckCircle2, XCircle, Clock, Search, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useProjects } from "@/context/ProjectContext"
import { toast } from "sonner"

export default function Approvals() {
    const { projects, updateRows } = useProjects()
    const [searchQuery, setSearchQuery] = useState("")
    const [activeTab, setActiveTab] = useState("pending")

    // Gather all rows across projects that need review
    const pendingReviews = projects.flatMap(project =>
        (project.rows || [])
            .filter(row => row.status === 'review')
            .map(row => ({ ...row, projectId: project.id, projectName: project.name }))
    )

    const rejectedRows = projects.flatMap(project =>
        (project.rows || [])
            .filter(row => row.status === 'rejected')
            .map(row => ({ ...row, projectId: project.id, projectName: project.name }))
    )

    const filteredRows = (activeTab === "pending" ? pendingReviews : rejectedRows).filter(row =>
        row.en?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.my?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        row.zh?.includes(searchQuery)
    )

    const handleApprove = (projectId, rowId) => {
        updateRows(projectId, [{ id: rowId, changes: { status: 'completed' } }])
        toast.success("Translation approved")
    }

    const handleReject = (projectId, rowId) => {
        updateRows(projectId, [{ id: rowId, changes: { status: 'rejected' } }])
        toast.error("Translation rejected")
    }

    return (
        <div className="space-y-6 w-full max-w-5xl mx-auto pb-10">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Manage Approvals</h1>
                    <p className="text-muted-foreground mt-1">
                        Review translations waiting for your approval.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <div className="text-sm text-muted-foreground">
                        {pendingReviews.length} pending
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-xl w-fit">
                <button
                    onClick={() => setActiveTab("pending")}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === "pending"
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                        }`}
                >
                    Pending ({pendingReviews.length})
                </button>
                <button
                    onClick={() => setActiveTab("rejected")}
                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all ${activeTab === "rejected"
                        ? "bg-card text-foreground shadow-sm"
                        : "text-muted-foreground hover:text-foreground"
                        }`}
                >
                    Rejected ({rejectedRows.length})
                </button>
            </div>

            {/* Search */}
            <div className="relative max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <Input
                    placeholder="Search translations..."
                    className="pl-9 rounded-xl"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                />
            </div>

            {/* List */}
            <div className="space-y-3">
                {filteredRows.map((row) => (
                    <div
                        key={`${row.projectId}-${row.id}`}
                        className="rounded-2xl bg-card border shadow-sm p-5 hover:shadow-md transition-shadow"
                    >
                        <div className="flex items-start justify-between gap-4">
                            <div className="flex-1 space-y-3">
                                {/* Project Badge */}
                                <div className="flex items-center gap-2">
                                    <span className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
                                        <FileText className="w-3 h-3" />
                                        {row.projectName}
                                    </span>
                                </div>

                                {/* Translations */}
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">English</p>
                                        <p className="font-medium">{row.en}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">Bahasa Malaysia</p>
                                        <p className="font-medium">{row.my || '—'}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground mb-1">中文</p>
                                        <p className="font-medium">{row.zh || '—'}</p>
                                    </div>
                                </div>

                                {/* Template Used */}
                                {row.templateUsed && (
                                    <div className="text-xs text-muted-foreground">
                                        Template: <span className="font-medium">{row.templateUsed}</span>
                                    </div>
                                )}
                            </div>

                            {/* Actions */}
                            {activeTab === "pending" && (
                                <div className="flex items-center gap-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        onClick={() => handleReject(row.projectId, row.id)}
                                        className="gap-2 text-red-600 border-red-200 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/20"
                                    >
                                        <XCircle className="w-4 h-4" />
                                        Reject
                                    </Button>
                                    <Button
                                        size="sm"
                                        onClick={() => handleApprove(row.projectId, row.id)}
                                        className="gap-2"
                                    >
                                        <CheckCircle2 className="w-4 h-4" />
                                        Approve
                                    </Button>
                                </div>
                            )}
                        </div>
                    </div>
                ))}

                {/* Empty State */}
                {filteredRows.length === 0 && (
                    <div className="py-16 text-center">
                        <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                            <Clock className="w-6 h-6 text-muted-foreground" />
                        </div>
                        <h3 className="font-semibold mb-1">
                            {activeTab === "pending" ? "No pending approvals" : "No rejected items"}
                        </h3>
                        <p className="text-muted-foreground text-sm">
                            {searchQuery ? `No results for "${searchQuery}"` : "All caught up!"}
                        </p>
                    </div>
                )}
            </div>
        </div>
    )
}
