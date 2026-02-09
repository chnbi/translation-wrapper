// Layout component - wraps all pages with sidebar
import { AppSidebar } from "./app-sidebar"
import { BookOpen, Library, Settings2, Folder, FileText, ChevronDown, PanelLeft, Sun, Moon, History, Bell, User, Sparkles } from "lucide-react"
import {
    SidebarInset,
    SidebarProvider,
    useSidebar,
} from "@/components/ui/sidebar"
import { useAuth, ROLES, getRoleLabel, getRoleColor } from "@/App"
import { Badge } from "@/components/ui/badge"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { useState, useEffect } from "react"

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

    // Theme toggle
    useEffect(() => {
        if (isDark) {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }, [isDark])

    const handleLogout = async () => {
        if (signOut) {
            await signOut()
            window.location.reload()
        }
    }

    return (
        <header className="sticky top-0 z-10 flex items-center justify-between h-14 px-6 border-b border-border bg-background">
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
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                width: '32px',
                                height: '32px',
                                borderRadius: '6px',
                                border: '1px solid hsl(220, 13%, 91%)',
                                backgroundColor: 'hsl(220, 14%, 96%)',
                                cursor: 'pointer',
                                overflow: 'hidden'
                            }}
                            title="User Menu"
                        >
                            {user?.photoURL ? (
                                <img src={user.photoURL} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                            ) : (
                                <User style={{ width: '16px', height: '16px', color: 'hsl(220, 9%, 46%)' }} />
                            )}
                        </button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end" className="w-56">
                        {/* User Info Header */}
                        <div className="px-2 py-1.5 border-b border-border">
                            <p className="text-sm font-medium text-foreground">
                                {user?.name || user?.email || 'User'}
                            </p>
                            <p className="text-xs text-muted-foreground">
                                {user?.email || ''}
                            </p>
                            <div className="mt-1">
                                <Badge className={`${getRoleColor(role)} text-xs`}>
                                    {getRoleLabel(role)}
                                </Badge>
                            </div>
                        </div>

                        {/* Logout Button */}
                        <DropdownMenuItem
                            onClick={handleLogout}
                            className="text-destructive focus:text-destructive cursor-pointer"
                        >
                            <User className="mr-2 h-4 w-4" />
                            Log out
                        </DropdownMenuItem>

                        {/* DEV TOOL: Promote self to Manager */}
                        {role !== 'manager' && (
                            <>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={async () => {
                                        if (confirm('Promote self to Manager? This will refresh the page.')) {
                                            const { updateUserRole } = await import('@/api/firebase/roles');
                                            await updateUserRole(user.id, 'manager');
                                            window.location.reload();
                                        }
                                    }}
                                    className="text-purple-600 cursor-pointer"
                                >
                                    <Sparkles className="mr-2 h-4 w-4" />
                                    Dev: Make Manager
                                </DropdownMenuItem>
                            </>
                        )}
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </header>
    )
}

export default function Layout({ children, breadcrumbs = [] }) {
    return (
        <SidebarProvider>
            <AppSidebar />
            <SidebarInset className="bg-app-background">
                <TopBar breadcrumbs={breadcrumbs} />
                <div className="flex flex-1 flex-col gap-8 px-10 py-10">
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
