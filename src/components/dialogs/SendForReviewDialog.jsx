import { useState, useMemo } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { LANGUAGES } from "@/lib/constants"
import { User, Check } from "lucide-react"

export function SendForReviewDialog({
    open,
    onOpenChange,
    onConfirm,
    targetLanguages = [],
    managers = []
}) {
    const [assignments, setAssignments] = useState({})
    const [isSubmitting, setIsSubmitting] = useState(false)

    // Reset assignments when dialog opens
    // We could pre-fill with previously used managers if we had that history

    const handleAssign = (langCode, managerId) => {
        setAssignments(prev => ({
            ...prev,
            [langCode]: managerId
        }))
    }

    const handleSubmit = async () => {
        setIsSubmitting(true)
        try {
            await onConfirm(assignments)
            onOpenChange(false)
        } finally {
            setIsSubmitting(false)
        }
    }

    // Filter managers for each language
    const getManagersForLanguage = (langCode) => {
        return managers.filter(m =>
            // If manager has no specific languages assigned, assume they can review all (legacy/admin)
            !m.languages || m.languages.length === 0 || m.languages.includes(langCode)
        )
    }

    const isFormValid = targetLanguages.every(lang => !!assignments[lang])

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Send for Review</DialogTitle>
                    <DialogDescription>
                        Assign a manager to review translations for each target language.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    {targetLanguages.map(langCode => {
                        const eligibleManagers = getManagersForLanguage(langCode)
                        const langLabel = LANGUAGES[langCode]?.label || langCode

                        return (
                            <div key={langCode} className="grid grid-cols-4 items-center gap-4">
                                <Label htmlFor={`manager-${langCode}`} className="text-right">
                                    {langLabel}
                                </Label>
                                <Select
                                    value={assignments[langCode] || ''}
                                    onValueChange={(val) => handleAssign(langCode, val)}
                                >
                                    <SelectTrigger className="col-span-3" id={`manager-${langCode}`}>
                                        <SelectValue placeholder="Select manager" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {eligibleManagers.length === 0 ? (
                                            <div className="p-2 text-xs text-muted-foreground text-center">
                                                No managers found for {langLabel}
                                            </div>
                                        ) : (
                                            eligibleManagers.map(manager => (
                                                <SelectItem key={manager.id} value={manager.id}>
                                                    <div className="flex items-center gap-2">
                                                        <Avatar className="h-5 w-5">
                                                            <AvatarImage src={manager.avatar} />
                                                            <AvatarFallback className="text-[10px]">
                                                                {manager.name?.substring(0, 2).toUpperCase()}
                                                            </AvatarFallback>
                                                        </Avatar>
                                                        <span>{manager.name}</span>
                                                    </div>
                                                </SelectItem>
                                            ))
                                        )}
                                    </SelectContent>
                                </Select>
                            </div>
                        )
                    })}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>
                        Cancel
                    </Button>
                    <Button onClick={handleSubmit} disabled={!isFormValid || isSubmitting}>
                        {isSubmitting ? "Sending..." : "Send for Review"}
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
