// Layout component - wraps all pages with sidebar
import { AppSidebar } from "./app-sidebar"
import { BookOpen, Library, Settings2, Folder, FileText, ChevronDown, PanelLeft, Sun, Moon, History, Bell, User } from "lucide-react"
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
    const { role, setRole, user } = useAuth()
    const [isDark, setIsDark] = useState(false)

    // Theme toggle
    useEffect(() => {
        if (isDark) {
            document.documentElement.classList.add('dark')
        } else {
            document.documentElement.classList.remove('dark')
        }
    }, [isDark])

    return (
        <header style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            height: '56px',
            padding: '0 24px',
            borderBottom: '1px solid hsl(220, 13%, 91%)',
            backgroundColor: 'white'
        }}>
            {/* Left: Breadcrumbs */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {/* Breadcrumbs */}
                <nav style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    {breadcrumbs.map((crumb, index) => {
                        const isLast = index === breadcrumbs.length - 1
                        return (
                            <span key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                {index > 0 && (
                                    <span style={{ color: 'hsl(220, 9%, 46%)', fontSize: '14px' }}>/</span>
                                )}
                                {crumb.href ? (
                                    <a
                                        href={crumb.href}
                                        style={{
                                            fontSize: '14px',
                                            color: 'hsl(220, 9%, 46%)',
                                            textDecoration: 'none'
                                        }}
                                    >
                                        {crumb.label}
                                    </a>
                                ) : (
                                    <span style={{
                                        fontSize: '14px',
                                        color: isLast ? 'hsl(222, 47%, 11%)' : 'hsl(220, 9%, 46%)',
                                        fontWeight: isLast ? 500 : 400
                                    }}>
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

                {/* Theme Toggle */}
                <button
                    onClick={() => setIsDark(!isDark)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        cursor: 'pointer'
                    }}
                    title="Toggle Theme"
                >
                    {isDark ? (
                        <Moon style={{ width: '18px', height: '18px', color: 'hsl(220, 9%, 46%)' }} />
                    ) : (
                        <Sun style={{ width: '18px', height: '18px', color: 'hsl(220, 9%, 46%)' }} />
                    )}
                </button>

                {/* History */}
                <button
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        cursor: 'pointer'
                    }}
                    title="History"
                >
                    <History style={{ width: '18px', height: '18px', color: 'hsl(220, 9%, 46%)' }} />
                </button>

                {/* Notifications */}
                <button
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: '32px',
                        height: '32px',
                        borderRadius: '6px',
                        border: 'none',
                        backgroundColor: 'transparent',
                        cursor: 'pointer'
                    }}
                    title="Notifications"
                >
                    <Bell style={{ width: '18px', height: '18px', color: 'hsl(220, 9%, 46%)' }} />
                </button>

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
                    <DropdownMenuContent align="end">
                        <div className="px-2 py-1.5 text-xs text-muted-foreground">
                            Role: {getRoleLabel(role)}
                        </div>
                        {Object.values(ROLES).map((r) => (
                            <DropdownMenuItem
                                key={r}
                                onClick={() => setRole(r)}
                                className={role === r ? 'bg-accent' : ''}
                            >
                                <Badge className={`${getRoleColor(r)} mr-2`}>
                                    {getRoleLabel(r)}
                                </Badge>
                                {r === role && '✓'}
                            </DropdownMenuItem>
                        ))}
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
                <div className="flex flex-1 flex-col gap-5 px-8 py-6">
                    {children}
                </div>
            </SidebarInset>
        </SidebarProvider>
    )
}
