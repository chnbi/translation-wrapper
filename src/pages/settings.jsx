// Settings - User and admin settings with consistent layout
import { User, Shield, Bell, Palette, Key, ChevronRight, Activity, Eye, EyeOff, Save } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/App"
import { useState, useEffect } from "react"
import ManageCategoriesDialog from "@/components/dialogs/ManageCategoriesDialog"
import UserManagementDialog from "@/components/dialogs/UserManagementDialog"
import ChangePasswordDialog from "@/components/dialogs/ChangePasswordDialog"
import { toast } from "sonner"
import { getUserApiKeys, saveUserApiKeys } from "@/api/firebase/apiKeys"
import { updateUserLanguages } from "@/api/firebase/roles"
import { LANGUAGES } from "@/lib/constants"
import { ROLES } from "@/hooks/useAuth"

import AuditLogsSection from "@/components/AuditLogsSection"
import { PageContainer } from "@/components/ui/shared"

import { PageHeader } from "@/components/ui/common"

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

    // API Key Management State
    const [apiKeys, setApiKeys] = useState({ gemini: '', ilmuchat: '' })
    const [showKeys, setShowKeys] = useState({ gemini: false, ilmuchat: false })
    const [savingKeys, setSavingKeys] = useState(false)

    // Manager Settings State
    const [managerLangs, setManagerLangs] = useState([])
    const [savingLangs, setSavingLangs] = useState(false)

    // Initialize manager languages from auth context
    useEffect(() => {
        if (user?.languages) {
            setManagerLangs(user.languages)
        }
    }, [user?.languages])

    const handleSaveLanguages = async () => {
        if (!user?.id) return
        setSavingLangs(true)
        try {
            await updateUserLanguages(user.id, managerLangs)
            toast.success('Manager languages updated')
            // Optimistically update or wait for auth listener? 
            // Auth listener should pick it up if it listens to doc changes, 
            // but useAuth currently fetches on mount/auth-change. 
            // Might need to reload page or trigger re-fetch.
            // For now, simple success message.
            setTimeout(() => window.location.reload(), 1000)
        } catch (error) {
            console.error(error)
            toast.error('Failed to update languages')
        } finally {
            setSavingLangs(false)
        }
    }

    const toggleManagerLang = (code) => {
        if (managerLangs.includes(code)) {
            setManagerLangs(prev => prev.filter(c => c !== code))
        } else {
            setManagerLangs(prev => [...prev, code])
        }
    }

    // Load user's API keys on mount
    useEffect(() => {
        async function loadKeys() {
            if (user?.id) {
                const keys = await getUserApiKeys(user.id)
                setApiKeys({
                    gemini: keys.gemini || '',
                    ilmuchat: keys.ilmuchat || ''
                })
            }
        }
        loadKeys()
    }, [user?.id])

    // Scroll to section based on URL query param (e.g. #settings?section=security)
    useEffect(() => {
        const handleScrollToSection = () => {
            const hash = window.location.hash
            if (hash.includes('?section=')) {
                const sectionId = hash.split('?section=')[1]
                if (sectionId) {
                    const element = document.getElementById(sectionId)
                    if (element) {
                        setTimeout(() => {
                            element.scrollIntoView({ behavior: 'smooth', block: 'start' })
                            // Optional: Highlight effect?
                        }, 100)
                    }
                }
            }
        }

        // Run on mount
        handleScrollToSection()

        // Listen for hash changes (if user clicks sidebar links while on settings page)
        window.addEventListener('hashchange', handleScrollToSection)
        return () => window.removeEventListener('hashchange', handleScrollToSection)
    }, [])

    const handleSaveApiKeys = async () => {
        if (!user?.id) {
            toast.error('You must be logged in to save API keys')
            return
        }
        setSavingKeys(true)
        try {
            await saveUserApiKeys(user.id, apiKeys)
            toast.success('API keys saved successfully')
        } catch (error) {
            console.error('Error saving API keys:', error)
            toast.error('Failed to save API keys')
        } finally {
            setSavingKeys(false)
        }
    }

    return (
        <PageContainer>
            {/* Header */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                <div>
                    <PageHeader
                        className="mb-0"
                        description="Manage your account and preferences"
                    >
                        Settings
                    </PageHeader>
                </div>
            </div>

            <div id="security" className="space-y-3">
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

            {/* AI Provider Settings */}
            <div id="api-configuration" className="space-y-3 pt-6">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">API Configuration</h2>
                <div className="rounded-2xl bg-card border border-border p-6">
                    <div className="flex items-center justify-between gap-4 mb-4">
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                                <Activity className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-foreground">Translation AI</h3>
                                <p className="text-sm text-muted-foreground">Select which AI provider to use for translations.</p>
                            </div>
                        </div>
                    </div>

                    {/* Provider Selector */}
                    <div className="flex items-center gap-4 mb-4">
                        <select
                            className="flex-1 h-10 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                            defaultValue={(() => {
                                try {
                                    const { AIService } = require('@/api/ai');
                                    return AIService.getCurrentProvider();
                                } catch { return 'gemini'; }
                            })()}
                            onChange={async (e) => {
                                const { AIService } = await import('@/api/ai');
                                AIService.setProvider(e.target.value);
                                toast.success(`Switched to ${e.target.value}`);
                            }}
                        >
                            <option value="gemini">🧠 Google Gemini</option>
                            <option value="ilmuchat">💬 ILMUchat (YTL)</option>
                        </select>
                        <Button
                            variant="outline"
                            onClick={async () => {
                                const toastId = toast.loading("Testing connection...")
                                try {
                                    const { getAI, AIService } = await import('@/api/ai')

                                    // Apply user API key if available
                                    if (user?.id) {
                                        await AIService.applyUserApiKey(user.id)
                                    }

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

                    {/* API Key Inputs */}
                    <div className="space-y-4 pt-4 border-t border-border">
                        <h4 className="text-sm font-medium text-foreground">Your API Keys</h4>
                        <p className="text-xs text-muted-foreground">
                            Enter your own API keys to use instead of the default. Leave blank to use environment defaults.
                        </p>

                        {/* Gemini Key */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">Google Gemini API Key</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type={showKeys.gemini ? 'text' : 'password'}
                                        value={apiKeys.gemini}
                                        onChange={(e) => setApiKeys(prev => ({ ...prev, gemini: e.target.value }))}
                                        placeholder="AIzaSy..."
                                        className="w-full h-10 px-3 pr-10 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowKeys(prev => ({ ...prev, gemini: !prev.gemini }))}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        {showKeys.gemini ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* ILMUchat Key */}
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">ILMUchat API Key</label>
                            <div className="flex gap-2">
                                <div className="relative flex-1">
                                    <input
                                        type={showKeys.ilmuchat ? 'text' : 'password'}
                                        value={apiKeys.ilmuchat}
                                        onChange={(e) => setApiKeys(prev => ({ ...prev, ilmuchat: e.target.value }))}
                                        placeholder="sk-..."
                                        className="w-full h-10 px-3 pr-10 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                    />
                                    <button
                                        type="button"
                                        onClick={() => setShowKeys(prev => ({ ...prev, ilmuchat: !prev.ilmuchat }))}
                                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                        {showKeys.ilmuchat ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                                    </button>
                                </div>
                            </div>
                        </div>

                        {/* Save Button */}
                        <Button
                            onClick={handleSaveApiKeys}
                            disabled={savingKeys}
                            className="w-full"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {savingKeys ? 'Saving...' : 'Save API Keys'}
                        </Button>
                    </div>
                </div>
            </div>

            {/* Manager Profile Settings */}
            {canDo('manage_projects') && ( // Managers and Admins
                <div id="manager-profile" className="space-y-3 pt-6">
                    <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Manager Profile</h2>
                    <div className="rounded-2xl bg-card border border-border p-6">
                        <div className="flex items-center gap-4 mb-6">
                            <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                                <User className="w-6 h-6 text-blue-600 dark:text-blue-400" />
                            </div>
                            <div>
                                <h3 className="font-semibold text-foreground">Approving Languages</h3>
                                <p className="text-sm text-muted-foreground">Select the languages you are responsible for approving.</p>
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                            {Object.values(LANGUAGES).map(lang => {
                                const isSelected = managerLangs.includes(lang.code)
                                return (
                                    <button
                                        key={lang.code}
                                        onClick={() => toggleManagerLang(lang.code)}
                                        className={`
                                            flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-all
                                            ${isSelected
                                                ? 'bg-primary/5 border-primary text-primary font-medium'
                                                : 'bg-background border-border text-muted-foreground hover:bg-muted/50'
                                            }
                                        `}
                                    >
                                        <span>{lang.label}</span>
                                        {isSelected && <div className="w-2 h-2 rounded-full bg-primary" />}
                                    </button>
                                )
                            })}
                        </div>

                        <Button
                            onClick={handleSaveLanguages}
                            disabled={savingLangs}
                            className="w-full sm:w-auto"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            {savingLangs ? 'Saving...' : 'Save Preferences'}
                        </Button>
                    </div>
                </div>
            )}

            {/* Admin/Manager Settings */}
            {canDo('manage_users') && (
                <div id="administration" className="space-y-3 pt-6">
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
            <div id="account" className="space-y-3 pt-6">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Account</h2>
                <div className="rounded-2xl p-5 bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-100 dark:border-zinc-800">
                    <p className="text-xs text-zinc-400">
                        Logged in as <span className="text-zinc-600 dark:text-zinc-300 font-medium">{user?.email || 'Not logged in'}</span>
                    </p>
                </div>
            </div>

            <ManageCategoriesDialog
                open={isCategoryOpen}
                onOpenChange={setIsCategoryOpen}
            />

            <ChangePasswordDialog
                open={isPasswordOpen}
                onOpenChange={setIsPasswordOpen}
            />

        </PageContainer>
    )
}
