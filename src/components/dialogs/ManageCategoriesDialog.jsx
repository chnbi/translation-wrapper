import { useState } from "react"
import { Plus, Trash2, Pencil, Check, X } from "lucide-react"
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
import ConfirmDialog from "@/components/dialogs/ConfirmDialog"

export default function ManageCategoriesDialog({ open, onOpenChange }) {
    const { categories, addCategory, deleteCategory } = useGlossary()
    const [newCategory, setNewCategory] = useState("")
    const [isLoading, setIsLoading] = useState(false)
    const [editingId, setEditingId] = useState(null)
    const [editingName, setEditingName] = useState("")
    const [deleteConfirm, setDeleteConfirm] = useState(null) // { id, name }

    const handleAdd = async () => {
        if (!newCategory.trim()) return

        // Check duplicate
        if (categories.some(c => c.name?.toLowerCase() === newCategory.trim().toLowerCase())) {
            toast.error("Category already exists")
            return
        }

        setIsLoading(true)
        try {
            await addCategory({ name: newCategory.trim() })
            setNewCategory("")
            toast.success("Category added")
        } catch (error) {
            toast.error("Failed to add category")
        } finally {
            setIsLoading(false)
        }
    }

    const handleDelete = async () => {
        if (!deleteConfirm) return
        try {
            await deleteCategory(deleteConfirm.id)
            toast.success("Category deleted")
        } catch (error) {
            toast.error("Failed to delete category")
        } finally {
            setDeleteConfirm(null)
        }
    }

    const handleStartEdit = (cat) => {
        setEditingId(cat.id)
        setEditingName(cat.name)
    }

    const handleSaveEdit = async () => {
        if (!editingName.trim()) {
            setEditingId(null)
            return
        }

        // Check duplicate (excluding current)
        if (categories.some(c => c.id !== editingId && c.name?.toLowerCase() === editingName.trim().toLowerCase())) {
            toast.error("Category name already exists")
            return
        }

        try {
            // Delete old and add new (since no update function exists)
            const oldCat = categories.find(c => c.id === editingId)
            if (oldCat && oldCat.name !== editingName.trim()) {
                await deleteCategory(editingId)
                await addCategory({ name: editingName.trim() })
                toast.success("Category renamed")
            }
        } catch (error) {
            toast.error("Failed to rename category")
        } finally {
            setEditingId(null)
            setEditingName("")
        }
    }

    const handleCancelEdit = () => {
        setEditingId(null)
        setEditingName("")
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-md">
                <DialogHeader>
                    <DialogTitle>Manage Glossary Categories</DialogTitle>
                    <DialogDescription>
                        Add, rename, or remove categories used to organize glossary terms.
                    </DialogDescription>
                </DialogHeader>

                <div className="space-y-5 py-4">
                    {/* Existing Categories */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Current Categories</label>
                        <div className="border border-border rounded-xl divide-y divide-border max-h-[280px] overflow-auto">
                            {categories.length === 0 ? (
                                <div className="p-6 text-center text-sm text-muted-foreground">
                                    No categories yet. Add one below.
                                </div>
                            ) : (
                                categories.map((cat) => (
                                    <div key={cat.id} className="flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors group">
                                        {editingId === cat.id ? (
                                            <div className="flex items-center gap-2 flex-1">
                                                <Input
                                                    value={editingName}
                                                    onChange={e => setEditingName(e.target.value)}
                                                    onKeyDown={e => {
                                                        if (e.key === "Enter") handleSaveEdit()
                                                        if (e.key === "Escape") handleCancelEdit()
                                                    }}
                                                    autoFocus
                                                    className="h-8 text-sm"
                                                />
                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50" onClick={handleSaveEdit}>
                                                    <Check className="w-4 h-4" />
                                                </Button>
                                                <Button size="icon" variant="ghost" className="h-7 w-7 text-muted-foreground" onClick={handleCancelEdit}>
                                                    <X className="w-4 h-4" />
                                                </Button>
                                            </div>
                                        ) : (
                                            <>
                                                <span className="font-medium text-sm text-foreground">{cat.name || cat}</span>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-7 w-7 text-muted-foreground hover:text-blue-600 hover:bg-blue-50"
                                                        onClick={() => handleStartEdit(cat)}
                                                        title="Rename"
                                                    >
                                                        <Pencil className="w-3.5 h-3.5" />
                                                    </Button>
                                                    <Button
                                                        size="icon"
                                                        variant="ghost"
                                                        className="h-7 w-7 text-muted-foreground hover:text-destructive hover:bg-destructive/10"
                                                        onClick={() => setDeleteConfirm({ id: cat.id, name: cat.name })}
                                                        title="Delete"
                                                    >
                                                        <Trash2 className="w-3.5 h-3.5" />
                                                    </Button>
                                                </div>
                                            </>
                                        )}
                                    </div>
                                ))
                            )}
                        </div>
                    </div>

                    {/* Add New */}
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-foreground">Add New Category</label>
                        <div className="flex gap-2">
                            <Input
                                placeholder="e.g. Legal, Marketing, Technical"
                                value={newCategory}
                                onChange={e => setNewCategory(e.target.value)}
                                onKeyDown={e => e.key === "Enter" && handleAdd()}
                            />
                            <Button onClick={handleAdd} disabled={isLoading || !newCategory.trim()}>
                                <Plus className="w-4 h-4 mr-1.5" />
                                Add
                            </Button>
                        </div>
                    </div>
                </div>
            </DialogContent>

            {/* Delete Confirmation */}
            <ConfirmDialog
                open={!!deleteConfirm}
                onClose={() => setDeleteConfirm(null)}
                onConfirm={handleDelete}
                title="Delete Category?"
                message={`Delete "${deleteConfirm?.name}"? Terms using this category will keep their current value.`}
                confirmLabel="Delete"
                variant="destructive"
            />
        </Dialog>
    )
}
