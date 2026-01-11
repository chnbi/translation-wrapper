// Settings - User and admin settings with consistent layout
import { User, Shield, Bell, Palette, Key, ChevronRight, Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/App"
import { useState } from "react"
import ManageCategoriesDialog from "@/components/dialogs/ManageCategoriesDialog"
import UserManagementDialog from "@/components/dialogs/UserManagementDialog"
import { toast } from "sonner"
import { translateBatch } from "@/services/gemini"

const settingsSections = [
    {
        id: 'profile',
        icon: User,
        title: 'Profile',
        description: 'Manage your personal information and preferences',
        color: 'bg-blue-100 dark:bg-blue-900/40',
        iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
        id: 'security',
        icon: Key,
        title: 'Security',
        description: 'Password, two-factor authentication, and login activity',
        color: 'bg-emerald-100 dark:bg-emerald-900/40',
        iconColor: 'text-emerald-600 dark:text-emerald-400',
    },
    {
        id: 'notifications',
        icon: Bell,
        title: 'Notifications',
        description: 'Email alerts and in-app notification preferences',
        color: 'bg-amber-100 dark:bg-amber-900/40',
        iconColor: 'text-amber-600 dark:text-amber-400',
    },
    {
        id: 'appearance',
        icon: Palette,
        title: 'Appearance',
        description: 'Theme, language, and display preferences',
        color: 'bg-violet-100 dark:bg-violet-900/40',
        iconColor: 'text-violet-600 dark:text-violet-400',
    },
]

const adminSections = [
    {
        id: 'users',
        icon: Shield,
        title: 'User Management',
        description: 'Manage team members, roles, and permissions',
        color: 'bg-rose-100 dark:bg-rose-900/40',
        iconColor: 'text-rose-600 dark:text-rose-400',
        action: 'open_users'
    },
    {
        id: 'categories',
        icon: Palette,
        title: 'Glossary Categories',
        description: 'Manage translation category labels and colors',
        color: 'bg-violet-100 dark:bg-violet-900/40',
        iconColor: 'text-violet-600 dark:text-violet-400',
        action: 'open_categories'
    },
]

export default function Settings() {
    const { isAdmin, canDo, user } = useAuth()
    const [isCategoryOpen, setIsCategoryOpen] = useState(false)
    const [isUserMgmtOpen, setIsUserMgmtOpen] = useState(false)

    return (
        <div className="space-y-6 w-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
                    <p className="text-muted-foreground mt-1">Manage your account and preferences</p>
                </div>
            </div>

            {/* System Health Check (Manager Feature) */}
            <div className="rounded-2xl bg-card border shadow-sm p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                        <Activity className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                    </div>
                    <div>
                        <h3 className="font-semibold text-foreground">AI Connection Status</h3>
                        <p className="text-sm text-muted-foreground">Check if Gemini API is active and responding.</p>
                    </div>
                </div>
                <Button
                    variant="outline"
                    onClick={async () => {
                        const toastId = toast.loading("Testing connection...")
                        try {
                            // Test translation of "Hello"
                            const res = await translateBatch(
                                [{ id: 'test', en: 'Hello' }],
                                { name: 'Test', prompt: 'Translate directly.' }
                            )
                            if (res && res.length > 0 && res[0].my) {
                                toast.success("Connected! API is responding.", { id: toastId })
                            } else {
                                throw new Error("Invalid response")
                            }
                        } catch (err) {
                            console.error(err)
                            toast.error("Connection Failed. Check API Key.", { id: toastId })
                        }
                    }}
                >
                    Test Connection
                </Button>
            </div>

            {/* General Settings */}
            <div className="space-y-3">
                <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide">General</h2>
                <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800/50">
                    {settingsSections.map((section) => {
                        const Icon = section.icon
                        return (
                            <button
                                key={section.id}
                                className="w-full flex items-center gap-4 p-5 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors text-left"
                            >
                                <div className={`w-11 h-11 rounded-xl ${section.color} flex items-center justify-center shrink-0`}>
                                    <Icon className={`w-5 h-5 ${section.iconColor}`} />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                        {section.title}
                                    </p>
                                    <p className="text-sm text-zinc-500 mt-0.5 truncate">
                                        {section.description}
                                    </p>
                                </div>
                                <ChevronRight className="w-5 h-5 text-zinc-300 dark:text-zinc-600 shrink-0" />
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Admin/Manager Settings */}
            {canDo('manage_users') && ( // Use string directly or import ACTIONS
                <div className="space-y-3">
                    <h2 className="text-sm font-medium text-zinc-500 uppercase tracking-wide">Administration</h2>
                    <div className="rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-800 divide-y divide-zinc-100 dark:divide-zinc-800/50">
                        {adminSections.map((section) => {
                            const Icon = section.icon
                            return (
                                <button
                                    key={section.id}
                                    onClick={() => {
                                        if (section.action === 'open_categories') setIsCategoryOpen(true)
                                        if (section.action === 'open_users') setIsUserMgmtOpen(true)
                                    }}
                                    className="w-full flex items-center gap-4 p-5 hover:bg-zinc-50/50 dark:hover:bg-zinc-800/20 transition-colors text-left"
                                >
                                    <div className={`w-11 h-11 rounded-xl ${section.color} flex items-center justify-center shrink-0`}>
                                        <Icon className={`w-5 h-5 ${section.iconColor}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                                            {section.title}
                                        </p>
                                        <p className="text-sm text-zinc-500 mt-0.5 truncate">
                                            {section.description}
                                        </p>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-zinc-300 dark:text-zinc-600 shrink-0" />
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Account Info */}
            <div className="rounded-2xl p-5 bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800">
                <p className="text-xs text-zinc-400">
                    Logged in as <span className="text-zinc-600 dark:text-zinc-300 font-medium">{user?.email || 'Not logged in'}</span>
                </p>
            </div>

            <ManageCategoriesDialog
                open={isCategoryOpen}
                onOpenChange={setIsCategoryOpen}
            />

            <UserManagementDialog
                open={isUserMgmtOpen}
                onOpenChange={setIsUserMgmtOpen}
            />
        </div>
    )
}
