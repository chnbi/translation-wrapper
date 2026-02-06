// Settings - User and admin settings with consistent layout
import { User, Shield, Bell, Palette, Key, ChevronRight, Activity } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/App"
import { useState } from "react"
import ManageCategoriesDialog from "@/components/dialogs/ManageCategoriesDialog"
import UserManagementDialog from "@/components/dialogs/UserManagementDialog"
import ChangePasswordDialog from "@/components/dialogs/ChangePasswordDialog"
import { toast } from "sonner"

import AuditLogsSection from "@/components/AuditLogsSection"

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
    const { canDo, user } = useAuth()
    const [isCategoryOpen, setIsCategoryOpen] = useState(false)
    const [isPasswordOpen, setIsPasswordOpen] = useState(false)

    return (
        <div className="space-y-6 w-full">
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em' }} className="text-foreground">Settings</h1>
                    <p className="text-muted-foreground mt-1">Manage your account and preferences</p>
                </div>
            </div>

            <div className="space-y-3">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Security</h2>
                <div className="rounded-2xl bg-card border border-border">
                    <button
                        onClick={() => setIsPasswordOpen(true)}
                        className="w-full flex items-center gap-4 p-5 hover:bg-muted/50 transition-colors text-left"
                    >
                        <div className="w-11 h-11 rounded-xl bg-emerald-100 dark:bg-emerald-900/40 flex items-center justify-center shrink-0">
                            <Key className="w-5 h-5 text-emerald-600 dark:text-emerald-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">
                                Change Password
                            </p>
                            <p className="text-sm text-muted-foreground mt-0.5 truncate">
                                Update your account password
                            </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                    </button>
                </div>
            </div>

            {/* AI Connection Status */}
            <div className="rounded-2xl bg-card border border-border shadow-sm p-6 flex items-center justify-between">
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
                            // Test generic AI connection
                            const { getAI } = await import('@/api/ai')
                            const ai = getAI()
                            const res = await ai.testConnection()

                            if (res.success) {
                                toast.success(`Connected! Response: ${res.message}`, { id: toastId })
                            } else {
                                throw new Error(res.message || "Connection failed")
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

            {/* Admin/Manager Settings */}
            {canDo('manage_users') && (
                <div className="space-y-3">
                    <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Administration</h2>
                    <div className="rounded-2xl bg-card border border-border divide-y divide-border">
                        {adminSections.map((section) => {
                            const Icon = section.icon
                            return (
                                <button
                                    key={section.id}
                                    onClick={() => {
                                        if (section.action === 'open_categories') setIsCategoryOpen(true)
                                        if (section.action === 'open_users') window.location.hash = 'users'
                                    }}
                                    className="w-full flex items-center gap-4 p-5 hover:bg-muted/50 transition-colors text-left"
                                >
                                    <div className={`w-11 h-11 rounded-xl ${section.color} flex items-center justify-center shrink-0`}>
                                        <Icon className={`w-5 h-5 ${section.iconColor}`} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <p className="text-sm font-medium text-foreground">
                                            {section.title}
                                        </p>
                                        <p className="text-sm text-muted-foreground mt-0.5 truncate">
                                            {section.description}
                                        </p>
                                    </div>
                                    <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                                </button>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* Audit Trail - Manager only */}
            {canDo('manage_users') && (
                <AuditLogsSection />
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

            <ChangePasswordDialog
                open={isPasswordOpen}
                onOpenChange={setIsPasswordOpen}
            />

        </div>
    )
}
