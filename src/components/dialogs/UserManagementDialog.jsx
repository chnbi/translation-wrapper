import { useState, useEffect } from "react"
import { Shield, User, ChevronsUpDown, Search, UserCog } from "lucide-react"
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
import { ROLES, getRoleLabel, getRoleColor, isAtLeast } from "@/lib/permissions"

// Mock users for now (since we don't have an admin SDK integrated yet)
const MOCK_USERS = [
    { id: '1', email: 'admin@example.com', role: 'admin', joined: '2023-01-15' },
    { id: '2', email: 'manager@example.com', role: 'manager', joined: '2023-02-20' },
    { id: '3', email: 'editor@example.com', role: 'editor', joined: '2023-03-10' },
    { id: '4', email: 'viewer@example.com', role: 'viewer', joined: '2023-04-05' },
    { id: '5', email: 'newbie@example.com', role: 'viewer', joined: '2023-05-12' },
]

export default function UserManagementDialog({ open, onOpenChange }) {
    const { user: currentUser, role: currentRole } = useAuth()
    const [users, setUsers] = useState(MOCK_USERS)
    const [searchQuery, setSearchQuery] = useState("")
    const [isLoading, setIsLoading] = useState(false)

    // Filter users
    const filteredUsers = users.filter(u =>
        u.email.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleRoleChange = async (userId, newRole) => {
        setIsLoading(true)
        // Simulate API call
        setTimeout(() => {
            setUsers(prev => prev.map(u => u.id === userId ? { ...u, role: newRole } : u))
            toast.success("User role updated")
            setIsLoading(false)
        }, 600)
    }

    // Check if current user can edit target user
    const canEditUser = (targetUser) => {
        // Can't edit self
        if (targetUser.email === currentUser?.email) return false

        // Manager cannot edit Admin
        if (currentRole === ROLES.MANAGER && targetUser.role === ROLES.ADMIN) return false

        // Admin can edit everyone else
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
                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                        <Input
                            placeholder="Search users..."
                            className="pl-9"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>

                    {/* Check if using mock data */}
                    {true && (
                        <div className="text-xs bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400 p-2 rounded-md border border-amber-200 dark:border-amber-800">
                            <strong>Note:</strong> Using mock data. Integration with Firebase Admin SDK pending.
                        </div>
                    )}

                    {/* User List */}
                    <div className="border rounded-xl divide-y max-h-[400px] overflow-auto">
                        {filteredUsers.map((u) => {
                            const isEditable = canEditUser(u)

                            return (
                                <div key={u.id} className="flex items-center justify-between p-4 bg-card hover:bg-muted/30 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center">
                                            <User className="w-5 h-5 text-slate-500" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">{u.email}</p>
                                            <p className="text-xs text-muted-foreground">Joined {u.joined}</p>
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
                                                {/* Only show roles allowed to be assigned */}
                                                <DropdownMenuItem onClick={() => handleRoleChange(u.id, ROLES.VIEWER)}>
                                                    Viewer
                                                </DropdownMenuItem>
                                                <DropdownMenuItem onClick={() => handleRoleChange(u.id, ROLES.EDITOR)}>
                                                    Editor
                                                </DropdownMenuItem>
                                                {/* Only Admins can make Managers? Or Managers can too? 
                                                    Let's say Managers can make Managers, but not Admins. 
                                                */}
                                                <DropdownMenuItem onClick={() => handleRoleChange(u.id, ROLES.MANAGER)}>
                                                    Manager
                                                </DropdownMenuItem>

                                                {currentRole === ROLES.ADMIN && (
                                                    <DropdownMenuItem onClick={() => handleRoleChange(u.id, ROLES.ADMIN)} className="text-red-600">
                                                        Admin
                                                    </DropdownMenuItem>
                                                )}
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </div>
                                </div>
                            )
                        })}

                        {filteredUsers.length === 0 && (
                            <div className="p-8 text-center text-muted-foreground">
                                No users found.
                            </div>
                        )}
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
