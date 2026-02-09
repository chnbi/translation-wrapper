import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { useState, useEffect } from "react"
import { User, Check } from "lucide-react"

export function ReassignManagerDialog({
    open,
    onClose,
    onConfirm,
    managers = [],
    currentManagerId,
    targetLanguage,
    languageLabel
}) {
    const [selectedManagerId, setSelectedManagerId] = useState(null)

    // Reset selection when dialog opens
    useEffect(() => {
        if (open) {
            setSelectedManagerId(currentManagerId || null)
        }
    }, [open, currentManagerId])

    // Filter managers who handle this language
    // If a manager has no specific languages set, assume they can handle all (or none? defaulting to all for now or strict?)
    // User requirement: "assigned manager by language".
    // "managers" array should contain user objects with "languages" array.
    const eligibleManagers = managers.filter(m =>
        !m.languages || // If no languages defined, maybe they are super-manager? Or legacy. Let's include them.
        m.languages.length === 0 ||
        m.languages.includes(targetLanguage)
    )

    const handleConfirm = () => {
        if (selectedManagerId) {
            onConfirm(selectedManagerId)
        }
    }

    return (
        <Dialog open={open} onOpenChange={(val) => !val && onClose()}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Reassign Task</DialogTitle>
                    <DialogDescription>
                        Select a manager to reassign this {languageLabel} translation task to.
                    </DialogDescription>
                </DialogHeader>

                <div className="py-4 space-y-2 max-h-[300px] overflow-y-auto">
                    {eligibleManagers.length === 0 && (
                        <p className="text-sm text-muted-foreground text-center py-4">
                            No eligible managers found for this language.
                        </p>
                    )}

                    {eligibleManagers.map(manager => {
                        const isSelected = selectedManagerId === manager.id
                        const isCurrent = currentManagerId === manager.id

                        return (
                            <button
                                key={manager.id}
                                onClick={() => setSelectedManagerId(manager.id)}
                                disabled={isCurrent} // Can't reassign to self if already self? Or explicitly allow to "claim"
                                className={`
                                    w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all
                                    ${isSelected
                                        ? 'bg-blue-50 border-blue-200 ring-1 ring-blue-200'
                                        : 'bg-white border-slate-100 hover:bg-slate-50'
                                    }
                                    ${isCurrent ? 'opacity-50 cursor-not-allowed' : ''}
                                `}
                            >
                                <div className={`
                                    w-10 h-10 rounded-full flex items-center justify-center shrink-0
                                    ${isSelected ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-500'}
                                `}>
                                    <User className="w-5 h-5" />
                                </div>
                                <div className="flex-1 min-w-0">
                                    <p className={`text-sm font-medium ${isSelected ? 'text-blue-900' : 'text-slate-900'}`}>
                                        {manager.name || manager.email}
                                    </p>
                                    <p className="text-xs text-slate-500 truncate">
                                        {manager.email}
                                    </p>
                                </div>
                                {isSelected && <Check className="w-5 h-5 text-blue-600" />}
                                {isCurrent && <span className="text-xs text-slate-400 font-medium px-2">Current</span>}
                            </button>
                        )
                    })}
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={onClose}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={!selectedManagerId || selectedManagerId === currentManagerId}
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                    >
                        Reassign
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
