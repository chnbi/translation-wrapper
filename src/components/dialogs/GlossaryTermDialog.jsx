import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select"
import { useState, useEffect } from "react"
import { useGlossary } from "@/context/GlossaryContext"

const statuses = [
    { value: "draft", label: "Draft", color: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400" },
    { value: "approved", label: "Approved", color: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400" },
    { value: "deprecated", label: "Deprecated", color: "bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400" },
]

export default function GlossaryTermDialog({ open, onOpenChange, initialData, onSave }) {
    const { categories } = useGlossary()

    // Derive category names from Firebase categories
    const categoryNames = categories.map(c => c.name || c).filter(Boolean)

    // Using Firebase field names: en, my, cn
    const [formData, setFormData] = useState({
        en: '',
        my: '',
        cn: '',
        category: '',
        status: 'draft',
        remark: '',
    })

    useEffect(() => {
        if (open) {
            if (initialData) {
                // Map initialData to form fields (support both old and new field names)
                setFormData({
                    en: initialData.en || initialData.english || '',
                    my: initialData.my || initialData.malay || '',
                    cn: initialData.cn || initialData.chinese || '',
                    category: initialData.category || categoryNames[0] || '',
                    status: initialData.status || 'draft',
                    remark: initialData.remark || '',
                })
            } else {
                setFormData({
                    en: '',
                    my: '',
                    cn: '',
                    category: categoryNames[0] || '',
                    status: 'draft',
                    remark: '',
                })
            }
        }
    }, [open, initialData])

    const handleSave = () => {
        onSave(formData)
        onOpenChange(false)
    }

    const selectedStatus = statuses.find(s => s.value === formData.status)

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-lg">
                <DialogHeader>
                    <DialogTitle>{initialData ? 'Edit Term' : 'Add New Term'}</DialogTitle>
                    <DialogDescription>
                        Define translations for all three languages.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-5 py-4">
                    {/* Language Fields */}
                    <div className="grid gap-4">
                        <div className="space-y-2">
                            <Label>English</Label>
                            <Input
                                placeholder="e.g. Dashboard"
                                value={formData.en}
                                onChange={e => setFormData(prev => ({ ...prev, en: e.target.value }))}
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Bahasa Malaysia</Label>
                                <Input
                                    placeholder="e.g. Papan Pemuka"
                                    value={formData.my}
                                    onChange={e => setFormData(prev => ({ ...prev, my: e.target.value }))}
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>中文</Label>
                                <Input
                                    placeholder="e.g. 仪表板"
                                    value={formData.cn}
                                    onChange={e => setFormData(prev => ({ ...prev, cn: e.target.value }))}
                                />
                            </div>
                        </div>
                    </div>

                    {/* Category */}
                    <div className="space-y-2">
                        <Label>Category</Label>
                        {categoryNames.length > 0 ? (
                            <Select value={formData.category} onValueChange={v => setFormData(prev => ({ ...prev, category: v }))}>
                                <SelectTrigger>
                                    <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                    {categoryNames.map(cat => (
                                        <SelectItem key={cat} value={cat}>{cat}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        ) : (
                            <p className="text-sm text-muted-foreground">No categories configured. Add them in Settings → Glossary Categories.</p>
                        )}
                    </div>
                </div>

                <DialogFooter>
                    <Button variant="outline" onClick={() => onOpenChange(false)}>Cancel</Button>
                    <Button onClick={handleSave}>Save Term</Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    )
}
