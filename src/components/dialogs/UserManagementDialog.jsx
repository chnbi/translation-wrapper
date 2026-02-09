import { useState, useEffect, useCallback } from "react"
import { Shield, User, ChevronsUpDown, Search, UserCog, RefreshCw, Globe, Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "sonner"
import { useAuth } from "@/App"
import { ROLES, getRoleLabel, getRoleColor } from "@/lib/permissions"
import { getUsers, updateUserRole, updateUserLanguages } from "@/api/firebase"
import { LANGUAGES, getLanguagesArray } from "@/lib/constants"

export default function UserManagementDialog({ open, onOpenChange }) {
    const { user: currentUser, role: currentRole } = useAuth()
    const [users, setUsers] = useState([])
    const [searchQuery, setSearchQuery] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [isFetching, setIsFetching] = useState(true)
    const [languageDialogUser, setLanguageDialogUser] = useState(null)

    // Fetch users from PocketBase
    const fetchUsers = useCallback(async () => {
        setIsFetching(true)
        try {
            const userData = await getUsers()
            setUsers(userData.map(u => ({
                id: u.id,
                email: u.email,
                name: u.name || u.email?.split('@')[0] || 'User',
                role: u.role || ROLES.EDITOR,
                joined: u.created ? new Date(u.created).toLocaleDateString() : 'N/A',
                languages: u.languages || [],
                avatar: u.avatar
            })))
        } catch (error) {
            console.error('Error fetching users:', error)
            toast.error("Failed to load users")
        } finally {
            setIsFetching(false)
        }
    }, [])

    useEffect(() => {
        if (open) {
            fetchUsers()
        }
    }, [open, fetchUsers])

    // Filter users
    const filteredUsers = users.filter(u =>
        u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.name?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleRoleChange = async (userId, newRole) => {
        setIsLoading(true)
        try {
            await updateUserRole(userId, newRole)
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
            toast.success("User role updated")
        } catch (error) {
            console.error('Error updating role:', error)
            toast.error("Failed to update user role")
        } finally {
            setIsLoading(false)
        }
    }

    // Check if current user can edit target user
    const canEditUser = (targetUser) => {
        // Can't edit self
        if (targetUser.email === currentUser?.email) return false

        // Only managers can edit roles
        if (currentRole !== ROLES.MANAGER) return false

        return true
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <UserCog className="w-5 h-5 text-primary" />
                        Team Management
                    </DialogTitle>
                    <DialogDescription>
                        Manage user roles and permissions.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-4">
                    {/* Search + Refresh */}
                    <div className="flex gap-2">
                        <div className="relative flex-1">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                            <Input
                                placeholder="Search users..."
                                className="pl-9"
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                        </div>
                        <Button
                            variant="outline"
                            size="icon"
                            onClick={fetchUsers}
                            disabled={isFetching}
                        >
                            <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                        </Button>
                    </div>

                    {/* User List */}
                    <div className="border rounded-xl divide-y max-h-[400px] overflow-auto">
                        {isFetching ? (
                            <div className="p-8 text-center text-muted-foreground">
                                <RefreshCw className="w-5 h-5 animate-spin mx-auto mb-2" />
                                Loading users...
                            </div>
                        ) : filteredUsers.length === 0 ? (
                            <div className="p-8 text-center text-muted-foreground">
                                {users.length === 0
                                    ? "No users found in the database."
                                    : "No users match your search."}
                            </div>
                        ) : (
                            filteredUsers.map((u) => {
                                const isEditable = canEditUser(u)

                                return (
                                    <div key={u.id} className="flex items-center justify-between p-4 bg-card hover:bg-muted/30 transition-colors">
                                        <div className="flex items-center gap-3">
                                            <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                                <User className="w-5 h-5 text-slate-500" />
                                            </div>
                                            <div>
                                                <p className="font-medium text-sm">{u.name || u.email}</p>
                                                <p className="text-xs text-muted-foreground">{u.email} • Joined {u.joined}</p>
                                            </div>
                                        </div>

                                        <div className="flex items-center gap-3">
                                            {/* Role Badge/Dropdown */}
                                            <DropdownMenu>
                                                <DropdownMenuTrigger asChild disabled={!isEditable || isLoading}>
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                        className={`gap-2 h-8 border-transparent ${getRoleColor(u.role)} hover:bg-opacity-80`}
                                                    >
                                                        <Shield className="w-3 h-3" />
                                                        {getRoleLabel(u.role)}
                                                        {isEditable && <ChevronsUpDown className="w-3 h-3 opacity-50 ml-1" />}
                                                    </Button>
                                                </DropdownMenuTrigger>
                                                <DropdownMenuContent align="end">
                                                    <DropdownMenuItem onClick={() => handleRoleChange(u.id, ROLES.EDITOR)}>
                                                        Editor
                                                    </DropdownMenuItem>
                                                    <DropdownMenuItem onClick={() => handleRoleChange(u.id, ROLES.MANAGER)}>
                                                        Manager
                                                    </DropdownMenuItem>
                                                </DropdownMenuContent>
                                            </DropdownMenu>
                                        )}
                                        </div>
                                    </div>
                                )
                            })
                        )}
                    </div>

                    {/* Help text */}
                    <p className="text-xs text-muted-foreground">
                        Users are synced from PocketBase. To add new users, create them in the PocketBase admin panel.
                    </p>
                </div>
            </DialogContent>

            {/* Language Assignment Dialog */}
            {
                languageDialogUser && (
                    <LanguageAssignmentDialog
                        user={languageDialogUser}
                        open={!!languageDialogUser}
                        onOpenChange={(open) => !open && setLanguageDialogUser(null)}
                        onUpdate={(userId, languages) => {
                            setUsers(prev => prev.map(u => u.id === userId ? { ...u, languages } : u))
                            setLanguageDialogUser(null)
                        }}
                    />
                )
            }
        </Dialog >
    )
}

function LanguageAssignmentDialog({ user, open, onOpenChange, onUpdate }) {
    const [selectedLanguages, setSelectedLanguages] = useState(user.languages || [])
    const [isSaving, setIsSaving] = useState(false)

    const handleToggle = (code) => {
        setSelectedLanguages(prev =>
            prev.includes(code)
                ? prev.filter(c => c !== code)
                : [...prev, code]
        )
    }

    const handleSave = async () => {
        setIsSaving(true)
        try {
            await updateUserLanguages(user.id, selectedLanguages)
            onUpdate(user.id, selectedLanguages)
            toast.success("Languages updated")
        } catch (error) {
            console.error(error)
            toast.error("Failed to update languages")
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Assign Languages</DialogTitle>
                    <DialogDescription>
                        Select languages that <strong>{user.name}</strong> can approve.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid grid-cols-2 gap-2 py-4">
                    {getLanguagesArray().map(lang => {
                        const isSelected = selectedLanguages.includes(lang.code)
                        return (
                            <div
                                key={lang.code}
                                onClick={() => handleToggle(lang.code)}
                                className={`
                                    flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all
                                    ${isSelected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'border-border hover:bg-muted/50'}
                                `}
                            >
                                <div className={`
                                    w-5 h-5 rounded flex items-center justify-center border transition-colors
                                    ${isSelected ? 'bg-primary border-primary text-primary-foreground' : 'border-muted-foreground/30'}
                                `}>
                                    {isSelected && <Check className="w-3.5 h-3.5" />}
                                </div>
                                <div className="text-sm font-medium">
                                    {lang.label}
                                </div>
                            </div>
                        )
                    })}
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave} disabled={isSaving}>
                        {isSaving ? "Saving..." : "Save Changes"}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
