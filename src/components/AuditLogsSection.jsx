// AuditLogsSection - Inline component for displaying audit logs in Settings
import { useState, useEffect } from "react"
import { ScrollText, ChevronRight, Filter, RefreshCw } from "lucide-react"
import { Button } from "@/components/ui/button"
import { DataTable } from "@/components/ui/DataTable"
import { getAllAuditLogs, formatAction, formatRelativeTime } from "@/api/firebase"
import { toast } from "sonner"

export default function AuditLogsSection() {
    const [logs, setLogs] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [isExpanded, setIsExpanded] = useState(false)

    const fetchLogs = async () => {
        setIsLoading(true)
        try {
            const data = await getAllAuditLogs({}, 50)
            setLogs(data)
        } catch (error) {
            console.error(error)
            toast.error("Failed to load audit logs")
        } finally {
            setIsLoading(false)
        }
    }

    useEffect(() => {
        if (isExpanded) {
            fetchLogs()
        }
    }, [isExpanded])

    const columns = [
        {
            header: "User",
            accessor: "userEmail",
            width: "25%",
            render: (row) => (
                <span className="text-sm text-zinc-700 dark:text-zinc-300">
                    {row.userEmail || 'System'}
                </span>
            )
        },
        {
            header: "Action",
            accessor: "action",
            width: "25%",
            render: (row) => {
                const actionColors = {
                    APPROVED: 'bg-emerald-100 text-emerald-700',
                    REJECTED: 'bg-rose-100 text-rose-700',
                    PROJECT_CREATED: 'bg-blue-100 text-blue-700',
                    PROJECT_DELETED: 'bg-rose-100 text-rose-700',
                    TRANSLATED_AI: 'bg-violet-100 text-violet-700',
                }
                const colorClass = actionColors[row.action] || 'bg-zinc-100 text-zinc-700'
                return (
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${colorClass}`}>
                        {formatAction(row.action)}
                    </span>
                )
            }
        },
        {
            header: "Entity",
            accessor: "entityType",
            width: "25%",
            render: (row) => (
                <span className="text-sm text-zinc-500">
                    {row.entityType}/{row.entityId?.slice(0, 8)}...
                </span>
            )
        },
        {
            header: "Time",
            accessor: "timestamp",
            width: "25%",
            render: (row) => (
                <span className="text-xs text-zinc-400">
                    {row.timestamp ? formatRelativeTime(row.timestamp) : '-'}
                </span>
            )
        }
    ]

    return (
        <div id="audit-trail" className="space-y-3 pt-6">
            <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide">Audit Trail</h2>
            <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 overflow-hidden">
                {/* Header Row */}
                <button
                    onClick={() => setIsExpanded(!isExpanded)}
                    className="w-full flex items-center gap-4 p-5 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors text-left"
                >
                    <div className="w-11 h-11 rounded-xl bg-amber-100 dark:bg-amber-900/40 flex items-center justify-center shrink-0">
                        <ScrollText className="w-5 h-5 text-amber-600 dark:text-amber-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                            Audit Logs
                        </p>
                        <p className="text-sm text-zinc-500 mt-0.5 truncate">
                            View system activity and change history
                        </p>
                    </div>
                    <ChevronRight className={`w-5 h-5 text-zinc-300 dark:text-zinc-600 shrink-0 transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </button>

                {/* Expanded Content */}
                {isExpanded && (
                    <div className="border-t border-zinc-100 dark:border-zinc-800">
                        {/* Toolbar */}
                        <div className="p-4 flex items-center justify-between bg-zinc-50/50 dark:bg-zinc-800/30">
                            <span className="text-xs text-zinc-500">
                                {logs.length} log entries
                            </span>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={fetchLogs}
                                disabled={isLoading}
                            >
                                <RefreshCw className={`w-4 h-4 mr-1 ${isLoading ? 'animate-spin' : ''}`} />
                                Refresh
                            </Button>
                        </div>

                        {/* Table */}
                        <div className="max-h-[400px] overflow-auto">
                            {isLoading ? (
                                <div className="p-8 text-center text-zinc-400">Loading...</div>
                            ) : logs.length === 0 ? (
                                <div className="p-8 text-center text-zinc-400">No audit logs found</div>
                            ) : (
                                <DataTable
                                    columns={columns}
                                    data={logs}
                                    onToggleSelect={() => { }}
                                    onToggleSelectAll={() => { }}
                                />
                            )}
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
