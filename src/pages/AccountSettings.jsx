// Account Settings - Personal Info and Security
import { User, Shield } from "lucide-react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { useAuth } from "@/context/DevAuthContext"
import { useState, useEffect } from "react"
import { toast } from "sonner"
import { PageContainer } from "@/components/ui/shared"
import { updatePassword, EmailAuthProvider, reauthenticateWithCredential, updateProfile } from 'firebase/auth'
import { auth, db } from '@/lib/firebase'
import { doc, updateDoc } from 'firebase/firestore'

export default function AccountSettings() {
    const { user } = useAuth()

    // Password State
    const [currentPassword, setCurrentPassword] = useState('')
    const [newPassword, setNewPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [isUpdatingPassword, setIsUpdatingPassword] = useState(false)
    const [isUpdatingProfile, setIsUpdatingProfile] = useState(false)

    // Navigation State
    const [activeSection, setActiveSection] = useState('personal')

    // Handle hash-based navigation (e.g. #security)
    useEffect(() => {
        const handleHashChange = () => {
            const hash = window.location.hash
            if (hash.includes('security') || hash.includes('section=security')) {
                setActiveSection('security')
            } else if (hash.includes('account-settings') || hash.includes('settings')) {
                // Default to personal if just navigating to page
                if (!hash.includes('security')) setActiveSection('personal')
            }
        }

        // Run on mount
        handleHashChange()

        // Listen for hash changes
        window.addEventListener('hashchange', handleHashChange)
        return () => window.removeEventListener('hashchange', handleHashChange)
    }, [])

    // Personal Info State
    const [formData, setFormData] = useState({
        name: user?.name || '',
        email: user?.email || ''
    })

    useEffect(() => {
        if (user) {
            setFormData({
                name: user.name || '',
                email: user.email || ''
            })
        }
    }, [user])

    const handleUpdateProfile = async () => {
        if (!formData.name.trim()) {
            toast.error('Name cannot be empty')
            return
        }

        setIsUpdatingProfile(true)
        try {
            const currentUser = auth.currentUser

            // 1. Update Firebase Auth Profile
            if (currentUser) {
                await updateProfile(currentUser, {
                    displayName: formData.name
                })
            }

            // 2. Update Firestore User Document
            if (user?.id) {
                const userRef = doc(db, 'users', user.id)
                await updateDoc(userRef, {
                    name: formData.name,
                    // We don't update email here as that requires separate auth flow
                })
            }

            toast.success('Profile updated successfully')
        } catch (error) {
            console.error('Error updating profile:', error)
            toast.error('Failed to update profile')
        } finally {
            setIsUpdatingProfile(false)
        }
    }

    const handleUpdatePassword = async () => {
        // Validation
        if (newPassword.length < 8) {
            toast.error('New password must be at least 8 characters')
            return
        }

        if (newPassword !== confirmPassword) {
            toast.error('New passwords do not match')
            return
        }

        if (!currentPassword) {
            toast.error('Please enter your current password')
            return
        }

        setIsUpdatingPassword(true)
        try {
            const user = auth.currentUser;
            if (!user || !user.email) {
                toast.error('User not logged in or email not available.')
                return
            }
            const credential = EmailAuthProvider.credential(user.email, currentPassword);

            await reauthenticateWithCredential(user, credential);
            await updatePassword(user, newPassword);

            toast.success('Password changed successfully!')

            // Reset form
            setCurrentPassword('')
            setNewPassword('')
            setConfirmPassword('')
        } catch (error) {
            if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
                toast.error('Current password is incorrect')
            } else if (error.code === 'auth/requires-recent-login') {
                toast.error('Session expired. Please log in again.')
            } else {
                toast.error('Failed to change password. ' + error.message)
            }
        } finally {
            setIsUpdatingPassword(false)
        }
    }

    const SECTIONS = [
        { id: 'personal', label: 'Personal Information', icon: User },
        { id: 'security', label: 'Security', icon: Shield }
    ]

    return (
        <PageContainer>
            {/* Page Header is not in the image, instead breadcrumbs handled by Layout. 
                We'll use a flex container for the settings layout */}

            <div className="flex flex-col md:flex-row gap-8 min-h-[calc(100vh-8rem)]">
                {/* Sidebar */}
                <div className="w-full md:w-64 shrink-0 space-y-8 md:border-r md:border-border md:pr-6">
                    <div>
                        <h2 className="px-3 mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                            Account
                        </h2>
                        <nav className="space-y-1">
                            {SECTIONS.map((section) => (
                                <button
                                    key={section.id}
                                    onClick={() => setActiveSection(section.id)}
                                    className={cn(
                                        "w-full flex items-center gap-3 px-3 py-2.5 text-sm font-medium rounded-lg transition-colors text-left",
                                        activeSection === section.id
                                            ? "bg-pink-50 text-pink-600"
                                            : "text-muted-foreground hover:bg-muted/50 hover:text-foreground"
                                    )}
                                >
                                    <section.icon className={cn("size-4", activeSection === section.id ? "text-pink-600" : "text-muted-foreground")} />
                                    {section.label}
                                </button>
                            ))}
                        </nav>
                    </div>
                </div>

                {/* Main Content */}
                <div className="flex-1 max-w-2xl px-6">
                    {activeSection === 'personal' && (
                        <div className="space-y-8 fade-in animate-in duration-300">
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight text-foreground">Personal Information</h1>
                            </div>

                            <div className="space-y-6">
                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-muted-foreground">Name</label>
                                    <input
                                        type="text"
                                        value={formData.name}
                                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                                        className="w-full h-11 px-4 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all placeholder:text-muted-foreground/50"
                                        placeholder="Enter your name"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <label className="text-sm font-medium text-muted-foreground">Email address</label>
                                    <input
                                        type="email"
                                        value={formData.email}
                                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                                        className="w-full h-11 px-4 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all placeholder:text-muted-foreground/50"
                                        placeholder="Enter your email"
                                    />
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-4">
                                    <Button
                                        variant="outline"
                                        className="h-10 px-6 rounded-full border-border hover:bg-muted/50"
                                        onClick={() => setFormData({ name: user?.name || '', email: user?.email || '' })}
                                        disabled={JSON.stringify(formData) === JSON.stringify({ name: user?.name || '', email: user?.email || '' })}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        className="h-10 px-6 rounded-full bg-pink-500 hover:bg-pink-600 text-white shadow-md shadow-pink-500/20 border-0 disabled:opacity-50 disabled:cursor-not-allowed"
                                        disabled={isUpdatingProfile || JSON.stringify(formData) === JSON.stringify({ name: user?.name || '', email: user?.email || '' })}
                                        onClick={handleUpdateProfile}
                                    >
                                        {isUpdatingProfile ? 'Saving...' : 'Save changes'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}

                    {activeSection === 'security' && (
                        <div className="space-y-6 fade-in animate-in duration-300">
                            <div>
                                <h1 className="text-3xl font-bold tracking-tight text-foreground mb-6">Security</h1>
                            </div>

                            <div className="space-y-6">
                                <h2 className="text-base font-medium text-foreground">Change password</h2>

                                <div className="space-y-4">
                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-muted-foreground">Current password</label>
                                        <input
                                            type="password"
                                            value={currentPassword}
                                            onChange={(e) => setCurrentPassword(e.target.value)}
                                            className="w-full h-11 px-4 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all placeholder:text-muted-foreground/50"
                                            placeholder="Enter current password"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-muted-foreground">New password</label>
                                        <input
                                            type="password"
                                            value={newPassword}
                                            onChange={(e) => setNewPassword(e.target.value)}
                                            className="w-full h-11 px-4 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all placeholder:text-muted-foreground/50"
                                            placeholder="Enter new password"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-sm font-medium text-muted-foreground">Confirm new password</label>
                                        <input
                                            type="password"
                                            value={confirmPassword}
                                            onChange={(e) => setConfirmPassword(e.target.value)}
                                            className="w-full h-11 px-4 rounded-xl border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-pink-500/20 focus:border-pink-500 transition-all placeholder:text-muted-foreground/50"
                                            placeholder="Confirm new password"
                                        />
                                    </div>
                                </div>

                                <div className="flex items-center justify-end gap-3 pt-4">
                                    <Button
                                        variant="outline"
                                        className="h-10 px-6 rounded-full border-border hover:bg-muted/50"
                                        onClick={() => {
                                            setCurrentPassword('')
                                            setNewPassword('')
                                            setConfirmPassword('')
                                        }}
                                        disabled={isUpdatingPassword}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        className="h-10 px-6 rounded-full bg-pink-500 hover:bg-pink-600 text-white shadow-md shadow-pink-500/20 border-0 disabled:opacity-50"
                                        onClick={handleUpdatePassword}
                                        disabled={isUpdatingPassword || !currentPassword || !newPassword || !confirmPassword}
                                    >
                                        {isUpdatingPassword ? 'Updating...' : 'Update password'}
                                    </Button>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </PageContainer>
    )
}
