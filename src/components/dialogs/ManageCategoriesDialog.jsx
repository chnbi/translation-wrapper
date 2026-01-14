import { useState } from "react"
import { Plus, Trash2, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog"
import { useGlossary } from "@/context/GlossaryContext"
import { toast } from "sonner"

const PRESET_COLORS = [
    { name: "Blue", value: "bg-blue-50 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400" },
    { name: "Green", value: "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400" },
    { name: "Purple", value: "bg-violet-50 text-violet-600 dark:bg-violet-900/30 dark:text-violet-400" },
    { name: "Amber", value: "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400" },
    { name: "Pink", value: "bg-pink-50 text-pink-600 dark:bg-pink-900/30 dark:text-pink-400" },
    { name: "Cyan", value: "bg-cyan-50 text-cyan-600 dark:bg-cyan-900/30 dark:text-cyan-400" },
    { name: "Slate", value: "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400" },
]

export default function ManageCategoriesDialog({ open, onOpenChange }) {
    const { categories, addCategory, deleteCategory } = useGlossary()
    const [newCategory, setNewCategory] = useState("")
    const [selectedColor, setSelectedColor] = useState(PRESET_COLORS[0].value)
    const [isLoading, setIsLoading] = useState(false)

    const handleAdd = async () => {
        if (!newCategory.trim()) return

        // Check duplicate
        if (categories.some(c => c.name?.toLowerCase() === newCategory.trim().toLowerCase())) {
            toast.error("Category already exists")
            return
        }

        setIsLoading(true)
        try {
            await addCategory({
                name: newCategory.trim(),
                color: selectedColor
            })
            setNewCategory("")
            toast.success("Category added")
        } catch (error) {
            console.error("Failed to add category", error)
            toast.error("Failed to add category")
        } finally {
            setIsLoading(false)
        }
    }

    const handleDelete = async (id) => {
        if (confirm("Are you sure? This will remove the category from the list, but terms will keep the text value.")) {
            try {
                await deleteCategory(id)
                toast.success("Category deleted")
            } catch (error) {
                console.error("Failed to delete category", error)
                toast.error("Failed to delete category")
            }
        }
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Manage Categories</DialogTitle>
                    <DialogDescription>
                        Create and organize glossary categories used for filtering and colors.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-6 py-4">
                    {/* Add New */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-muted-foreground">Add New Category</label>
                        <div className="flex gap-2">
                            <Input
                                placeholder="e.g. Legal, Marketing"
                                value={newCategory}
                                onChange={e => setNewCategory(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && handleAdd()}
                            />
                            <Button onClick={handleAdd} disabled={isLoading || !newCategory.trim()}>
                                <Plus className="w-4 h-4" />
                            </Button>
                        </div>
                        <div className="flex gap-2 overflow-x-auto pb-2">
                            {PRESET_COLORS.map((color, i) => (
                                <button
                                    key={i}
                                    onClick={() => setSelectedColor(color.value)}
                                    className={`w-6 h-6 rounded-full border-2 transition-all ${color.value.split(" ")[0]} ${selectedColor === color.value ? "border-primary scale-110" : "border-transparent opacity-70 hover:opacity-100"
                                        }`}
                                    title={color.name}
                                />
                            ))}
                        </div>
                    </div>

                    {/* List */}
                    <div className="space-y-3">
                        <label className="text-sm font-medium text-muted-foreground">Existing Categories</label>
                        <div className="border rounded-xl divide-y max-h-[300px] overflow-auto">
                            {categories.map((cat) => (
                                <div key={cat.id} className="flex items-center justify-between p-3 hover:bg-muted/30">
                                    <div className="flex items-center gap-3">
                                        <span className={`w-3 h-3 rounded-full ${cat.color?.split(" ")[0] || "bg-slate-200"}`} />
                                        <span className="font-medium text-sm">{cat.name || cat}</span>
                                    </div>
                                    {!['General', 'UI'].includes(cat.name) && (
                                        <button
                                            onClick={() => handleDelete(cat.id)}
                                            className="text-muted-foreground hover:text-destructive transition-colors p-1"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    )}
                                </div>
                            ))}
                            {categories.length === 0 && (
                                <div className="p-4 text-center text-sm text-muted-foreground">
                                    No categories found.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
