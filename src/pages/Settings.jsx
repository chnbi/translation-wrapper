// Settings - User and admin settings with consistent layout
import { User, Shield, Bell, Palette, Key, ChevronRight, Activity, Eye, EyeOff, Save, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/DevAuthContext"
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
    }
]

export default function Settings() {
    const { canDo, user } = useAuth()
    const [isCategoryOpen, setIsCategoryOpen] = useState(false)
    const [isPasswordOpen, setIsPasswordOpen] = useState(false)

    // API Key Management State
    const [apiKeys, setApiKeys] = useState({ ilmuchat: '' })
    const [showKeys, setShowKeys] = useState({ ilmuchat: false })
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
            setTimeout(() => window.location.reload(), 1000)
        } catch (error) {
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
                        }, 100)
                    }
                }
            }
        }

        handleScrollToSection()
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
            toast.error('Failed to save API keys')
        } finally {
            setSavingKeys(false)
        }
    }

    // Load current AI provider
    const [currentProvider, setCurrentProvider] = useState('ilmuchat')
    useEffect(() => {
        const loadProvider = async () => {
            try {
                const { AIService } = await import('@/api/ai')
                setCurrentProvider(AIService.getCurrentProvider())
            } catch (e) {
            }
        }
        loadProvider()
    }, [])

    return (
        <PageContainer>
            <PageHeader
                description="Manage your account and preferences"
            >
                Settings
            </PageHeader>

            <div id="glossary-categories" className="space-y-3">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Glossary</h2>
                <div className="rounded-2xl bg-card border border-border divide-y divide-border">
                    <button
                        onClick={() => setIsCategoryOpen(true)}
                        className="w-full flex items-center gap-4 p-5 hover:bg-muted/50 transition-colors text-left"
                    >
                        <div className="w-11 h-11 rounded-xl bg-violet-100 dark:bg-violet-900/40 flex items-center justify-center shrink-0">
                            <Palette className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-foreground">
                                Glossary Categories
                            </p>
                            <p className="text-sm text-muted-foreground mt-0.5 truncate">
                                Manage translation category labels and colors
                            </p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-muted-foreground shrink-0" />
                    </button>
                </div>
            </div>

            <div id="api-configuration" className="space-y-3 pt-6">
                <h2 className="text-sm font-medium text-muted-foreground uppercase tracking-wide">API Configuration</h2>
                <div className="rounded-2xl bg-card border border-border">
                    <details className="group">
                        <summary className="w-full flex items-center justify-between p-6 cursor-pointer list-none hover:bg-muted/50 transition-colors rounded-2xl group-open:rounded-b-none">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center">
                                    <Activity className="w-6 h-6 text-violet-600 dark:text-violet-400" />
                                </div>
                                <div className="text-left">
                                    <h3 className="font-semibold text-foreground">Translation AI</h3>
                                    <p className="text-sm text-muted-foreground">Provider & API Keys</p>
                                </div>
                            </div>
                            <ChevronDown className="w-5 h-5 text-muted-foreground transition-transform group-open:rotate-180" />
                        </summary>

                        <div className="p-6 pt-0 border-t border-border">
                            {/* Provider Selector */}
                            <div className="flex items-center gap-4 mb-4 mt-6">
                                <select
                                    className="flex-1 h-10 px-3 rounded-lg border border-border bg-background text-foreground text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                                    defaultValue={currentProvider}
                                    onChange={async (e) => {
                                        const { AIService } = await import('@/api/ai');
                                        AIService.setProvider(e.target.value);
                                        toast.success(`Switched to ${e.target.value}`);
                                    }}
                                >
                                    <option value="ilmuchat">💬 ILMUchat (YTL)</option>
                                </select>
                                <Button
                                    variant="outline"
                                    onClick={async () => {
                                        const toastId = toast.loading("Testing connection...")
                                        try {
                                            const { getAI, AIService } = await import('@/api/ai')
                                            if (user?.id) await AIService.applyUserApiKey(user.id)
                                            // Ensure we get the current provider
                                            const ai = getAI(currentProvider)
                                            const res = await ai.testConnection()
                                            if (res.success) toast.success(`Connected! Response: ${res.message}`, { id: toastId })
                                            else throw new Error(res.message || "Connection failed")
                                        } catch (err) {
                                            toast.error("Connection Failed. Check API Key.", { id: toastId })
                                        }
                                    }}
                                >
                                    Test Connection
                                </Button>
                            </div>

                            <div className="space-y-4 pt-4 border-t border-border">
                                <h4 className="text-sm font-medium text-foreground">Connection Status</h4>
                                <p className="text-xs text-muted-foreground">
                                    API keys are managed via environment variables. Click below to verify connectivity.
                                </p>
                                {/* Inputs removed for production security */}
                            </div>
                        </div>
                    </details>
                </div>
            </div>

            {canDo('manage_projects') && (
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
                                        className={`flex items-center justify-between px-4 py-3 rounded-xl border text-sm transition-all ${isSelected ? 'bg-primary/5 border-primary text-primary font-medium' : 'bg-background border-border text-muted-foreground hover:bg-muted/50'}`}
                                    >
                                        <span>{lang.label}</span>
                                        {isSelected && <div className="w-2 h-2 rounded-full bg-primary" />}
                                    </button>
                                )
                            })}
                        </div>
                        <Button onClick={handleSaveLanguages} disabled={savingLangs} className="w-full sm:w-auto">
                            <Save className="w-4 h-4 mr-2" />
                            {savingLangs ? 'Saving...' : 'Save Preferences'}
                        </Button>
                    </div>
                </div>
            )}

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

            {canDo('manage_users') && (
                <AuditLogsSection />
            )}

            <ManageCategoriesDialog open={isCategoryOpen} onOpenChange={setIsCategoryOpen} />
            <ChangePasswordDialog open={isPasswordOpen} onOpenChange={setIsPasswordOpen} />
        </PageContainer>
    )
}
