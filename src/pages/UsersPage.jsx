import React, { useState, useEffect, useCallback } from "react"
import { DataTable } from "@/components/ui/DataTable"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Search,
    Filter,
    Plus,
    Download,
    ExternalLink,
    Check,
    Pencil,
    MoreHorizontal
} from "lucide-react"
import { useAuth } from "@/App"
import { ROLES, getRoleLabel, getRoleColor } from "@/lib/permissions"
import { getUsers } from "@/api/firebase"
import { toast } from "sonner"
import { PageContainer } from "@/components/ui/shared"
import { PageHeader } from "@/components/ui/common"
import EditManagerDialog from "@/components/dialogs/EditManagerDialog"

export default function UsersPage() {
    const { user: currentUser, isManager } = useAuth()
    const [users, setUsers] = useState([])
    const [isLoading, setIsLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")

    // Edit Manager Dialog
    const [editingManager, setEditingManager] = useState(null)
    const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)

    const fetchUsers = useCallback(async () => {
        setIsLoading(true)
        try {
            const userData = await getUsers()
            // Transform for table
            const transformed = userData.map((u, index) => ({
                id: u.id,
                index: index + 1,
                active: true, // Mock 'active' status
                lastName: u.name ? u.name.split(' ').slice(1).join(' ') : '-',
                firstName: u.name ? u.name.split(' ')[0] : '-',
                username: u.username || u.email?.split('@')[0],
                email: u.email,
                role: u.role || ROLES.EDITOR,
                languages: u.role === ROLES.MANAGER ? (u.languages || []) : [],
                loginHistory: u.updated // Mock
            }))
            setUsers(transformed)
        } catch (error) {
            console.error(error)
            toast.error("Failed to load users")
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchUsers()
    }, [fetchUsers])

    // Redirect Editors to Settings
    useEffect(() => {
        if (!isManager) {
            window.location.hash = '#settings'
        }
    }, [isManager])

    // Show nothing while redirecting
    if (!isManager) {
        return null
    }

    // Filtered Data
    const filteredData = users.filter(user =>
        user.username?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (user.firstName + ' ' + user.lastName).toLowerCase().includes(searchQuery.toLowerCase())
    )

    // Columns Configuration
    const columns = [
        {
            header: "#",
            accessor: "index",
            width: "50px",
            align: "center",
            color: 'hsl(220, 9%, 46%)'
        },
        {
            header: "User",
            accessor: "lastName",
            render: (row) => (
                <div className="flex flex-col">
                    <span className="font-medium text-slate-900">{row.firstName} {row.lastName}</span>
                    <span className="text-xs text-slate-500">{row.email}</span>
                </div>
            )
        },
        {
            header: "Role",
            accessor: "role",
            render: (row) => (
                <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium ${getRoleColor(row.role)}`}>
                    {getRoleLabel(row.role)}
                </span>
            )
        },
        {
            header: "Languages",
            accessor: "languages",
            render: (row) => {
                if (row.role !== ROLES.MANAGER) return <span className="text-slate-400 text-xs">-</span>

                const langs = row.languages || []
                if (langs.length === 0) return <span className="text-slate-400 text-xs italic">No languages</span>

                return (
                    <div className="flex items-center gap-2 group">
                        <div className="flex flex-wrap gap-1">
                            {langs.slice(0, 3).map(lang => (
                                <span key={lang} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[10px] border border-slate-200">
                                    {lang.toUpperCase()}
                                </span>
                            ))}
                            {langs.length > 3 && (
                                <span className="px-1.5 py-0.5 bg-slate-50 text-slate-400 rounded text-[10px] border border-slate-100">
                                    +{langs.length - 3}
                                </span>
                            )}
                        </div>
                        {isManager && (
                            <button
                                onClick={() => {
                                    setEditingManager(row)
                                    setIsEditDialogOpen(true)
                                }}
                                className="w-5 h-5 flex items-center justify-center rounded-full bg-slate-100 text-slate-400 hover:text-primary hover:bg-primary/10 opacity-0 group-hover:opacity-100 transition-all"
                                title="Edit Languages"
                            >
                                <Pencil className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                )
            }
        },
        {
            header: "Login history",
            accessor: "loginHistory",
            width: "120px",
            align: "center",
            render: () => <ExternalLink className="w-4 h-4 text-slate-400 cursor-pointer hover:text-primary" />
        },
        // We'll add an action column for editing if needed, but the request was "allow them to amend"
        // Since we are reusing UserManagementDialog or a new one, we need an edit button.
        {
            header: "",
            accessor: "actions",
            width: "50px",
            render: (row) => (
                <MoreHorizontal className="w-4 h-4 text-slate-400 cursor-pointer hover:text-slate-600" />
            )
        }
    ]

    return (
        <PageContainer>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <PageHeader
                        className="mb-0"
                        description="Manage team members, roles, and permissions"
                    >
                        Users
                    </PageHeader>
                </div>
            </div>

            {/* Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                {/* Left: User Count */}
                <div className="flex items-center gap-2">
                    <span className="bg-muted px-3 py-1 rounded-full text-xs font-medium text-muted-foreground">
                        {filteredData.length} user{filteredData.length !== 1 && 's'}
                    </span>
                </div>

                {/* Right: Actions & Search */}
                <div className="flex items-center gap-3">
                    <div className="relative">
                        <Search className="w-4 h-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
                        <Input
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder="Search users..."
                            className="pl-9 w-64 h-9 bg-background rounded-full"
                        />
                    </div>

                    <Button variant="outline" className="gap-2 h-9 rounded-full px-4 border-border text-foreground hover:bg-muted">
                        <Filter className="w-4 h-4" />
                        Filter
                    </Button>
                    <Button className="gap-2 h-9 rounded-full px-4 bg-primary text-white hover:bg-primary/90 shadow-sm transition-all active:scale-95">
                        <Plus className="w-4 h-4" />
                        New user
                    </Button>
                </div>
            </div>

            {/* Table Area */}
            <div className="rounded-2xl border border-border bg-card overflow-hidden shadow-sm">
                <DataTable
                    columns={columns}
                    data={filteredData}
                    onToggleSelect={(id) => { }}
                    onToggleSelectAll={() => { }}
                // Removed scrollable={true} to let it fit content/page
                />

                {/* Pagination Footer */}
                <div className="p-4 border-t border-border flex items-center justify-between bg-card/50">
                    <span className="text-xs text-muted-foreground">
                        Showing 1-{filteredData.length} of {filteredData.length} results
                    </span>
                    <div className="flex items-center gap-4">
                        <div className="flex items-center bg-muted/50 rounded-lg p-1 border border-border/50">
                            <Button variant="ghost" size="icon" disabled className="h-7 w-8 rounded-md text-muted-foreground hover:bg-background">{'<'}</Button>
                            <div className="px-3 text-xs font-medium text-foreground">1</div>
                            <Button variant="ghost" size="icon" disabled className="h-7 w-8 rounded-md text-muted-foreground hover:bg-background">{'>'}</Button>
                        </div>
                    </div>
                </div>
            </div>

            <EditManagerDialog
                open={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
                user={editingManager}
                onSuccess={() => {
                    fetchUsers() // Refresh list to show new languages
                }}
            />
        </PageContainer>
    )
}
