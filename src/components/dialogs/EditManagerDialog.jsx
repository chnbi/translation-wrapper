import React, { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { LANGUAGES } from "@/lib/constants"
import { updateUserLanguages } from "@/api/firebase"

export default function EditManagerDialog({ open, onOpenChange, user, onSuccess }) {
    const [selectedLangs, setSelectedLangs] = useState([])
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        if (open && user) {
            setSelectedLangs(user.languages || [])
        }
    }, [open, user])

    const handleToggle = (langCode) => {
        setSelectedLangs(prev =>
            prev.includes(langCode)
                ? prev.filter(l => l !== langCode)
                : [...prev, langCode]
        )
    }

    const handleSave = async () => {
        if (!user) return
        setSaving(true)
        try {
            await updateUserLanguages(user.id, selectedLangs)
            toast.success("Manager permissions updated")
            onSuccess?.()
            onOpenChange(false)
        } catch (error) {
            console.error(error)
            toast.error("Failed to update permissions")
        } finally {
            setSaving(false)
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Edit Manager Permissions</DialogTitle>
                </DialogHeader>

                <div className="py-4">
                    <p className="text-sm text-slate-500 mb-4">
                        Select languages that <strong>{user?.firstName} {user?.lastName}</strong> is allowed to approve.
                    </p>

                    <div className="grid grid-cols-2 gap-2 max-h-[300px] overflow-y-auto pr-2">
                        {Object.values(LANGUAGES).map(lang => {
                            const isSelected = selectedLangs.includes(lang.code)
                            return (
                                <button
                                    key={lang.code}
                                    onClick={() => handleToggle(lang.code)}
                                    className={`
                                        flex items-center justify-between px-3 py-2 rounded-lg border text-sm transition-all
                                        ${isSelected
                                            ? 'bg-primary/5 border-primary text-primary font-medium'
                                            : 'bg-background border-border text-slate-500 hover:bg-slate-50'
                                        }
                                    `}
                                >
                                    <span>{lang.label}</span>
                                    {isSelected && <div className="w-2 h-2 rounded-full bg-primary" />}
                                </button>
                            )
                        })}
                    </div>
                </div>

                <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                </div>
            </DialogContent>
        </Dialog>
    )
}
