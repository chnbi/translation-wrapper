// Layout component - wraps all pages with sidebar
import { AppSidebar } from "./app-sidebar"
import { BookOpen, Library, Settings2, Folder, FileText, ChevronDown, PanelLeft, Sun, Moon, History, Bell, User, Sparkles, LogOut } from "lucide-react"
import {
    SidebarInset,
    SidebarProvider,
    useSidebar,
} from "@/components/ui/sidebar"
import { useAuth } from "@/context/DevAuthContext"
import { ROLES, getRoleLabel, getRoleColor } from "@/lib/permissions"
import { Badge } from "@/components/ui/badge"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useState, useEffect } from "react"
import ConfirmDialog from "../dialogs/ConfirmDialog"

// Icon mapping for breadcrumb items
const iconMap = {
    'Projects': Folder,
    'Glossary': BookOpen,
    'Prompt Library': Library,
    'Settings': Settings2,
    'Project': FileText,
}

// Top Bar component matching SnowUI Figma
function TopBar({ breadcrumbs }) {
    const { toggleSidebar } = useSidebar()
    const { role, setRole, user, signOut } = useAuth()
    const [isDark, setIsDark] = useState(false)
    const [isLogoutDialogOpen, setIsLogoutDialogOpen] = useState(false)

    // Theme toggle
    useEffect(() => {
        if (isDark) {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }, [isDark])

    const handleLogoutClick = () => {
        setIsLogoutDialogOpen(true)
    }

    const handleConfirmLogout = async () => {
        if (signOut) {
            await signOut()
            window.location.reload()
        }
    }

    return (
        <header className="sticky top-0 z-20 flex items-center justify-between h-14 px-6 border-b border-border bg-background">
            {/* Left: Breadcrumbs */}
            <div className="flex items-center gap-3">
                {/* Breadcrumbs */}
                <nav className="flex items-center gap-2">
                    {breadcrumbs.map((crumb, index) => {
                        const isLast = index === breadcrumbs.length - 1
                        return (
                            <span key={index} className="flex items-center gap-2">
                                {index > 0 && (
                                    <span className="text-muted-foreground text-sm">/</span>
                                )}
                                {crumb.href ? (
                                    <a
                                        href={crumb.href}
                                        className="text-sm text-muted-foreground hover:text-foreground no-underline"
                                    >
                                        {crumb.label}
                                    </a>
                                ) : (
                                    <span className={`text-sm ${isLast ? 'text-foreground font-medium' : 'text-muted-foreground'}`}>
                                        {crumb.label}
                                    </span>
                                )}
                            </span>
                        )
                    })}
                </nav>
            </div>

            {/* Right: Icons */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>

                {/* User Avatar / Role Switcher (Dev) */}
                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <button
                            className="flex items-center justify-center w-8 h-8 rounded-md border border-slate-200 bg-slate-50 hover:bg-slate-100 data-[state=open]:bg-slate-200 transition-colors overflow-hidden"
                            title="User Menu"
                        >
                            {user?.photoURL ? (
                                <img src={user.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <span className="font-medium text-xs text-muted-foreground">
                                    {user?.name?.substring(0, 2).toUpperCase() || 'US'}
                                </span>
                            )}
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-64 rounded-xl p-0">
                        <div className="p-4 bg-white dark:bg-zinc-950 rounded-t-xl">
                            <p className="font-bold text-base text-foreground mb-1">{user?.name || user?.email || 'User'}</p>
                            <p className="text-sm text-muted-foreground mb-1">{user?.email}</p>
                            <p className="text-sm text-muted-foreground">{getRoleLabel(role)}</p>
                        </div>
                        <DropdownMenuSeparator className="my-0" />
                        <div className="p-2">
                            <DropdownMenuItem
                                onClick={() => window.location.hash = '#account-settings'}
                                className="cursor-pointer py-2.5 px-3 mb-1 text-muted-foreground focus:text-pink-600 focus:bg-pink-50"
                            >
                                Account Settings
                            </DropdownMenuItem>
                            <DropdownMenuItem
                                onClick={handleLogoutClick}
                                className="cursor-pointer py-2.5 px-3 text-red-600 focus:text-red-700 focus:bg-red-50 dark:focus:bg-red-950/20"
                            >
                                <div className="flex items-center gap-2">
                                    <LogOut className="h-4 w-4" />
                                    <span>Log Out</span>
                                </div>
                            </DropdownMenuItem>
                        </div>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            <ConfirmDialog
                open={isLogoutDialogOpen}
                onOpenChange={setIsLogoutDialogOpen}
                title="Log Out"
                description="Are you sure you want to log out of your account?"
                onConfirm={handleConfirmLogout}
                confirmLabel="Log Out"
                variant="destructive"
            />
        </header>
    )
}

export default function Layout({ children, breadcrumbs = [], noPadding = false }) {
    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset className="bg-app-background">
                <TopBar breadcrumbs={breadcrumbs} />
                <div className={`flex flex-1 flex-col gap-8 w-full overflow-x-hidden ${noPadding ? 'p-0' : 'px-10 py-10'}`}>
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
