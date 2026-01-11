// NewProjectDialog - Modal for creating a new translation project
import { useState } from "react"
import { X, Languages, Loader2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const LANGUAGE_OPTIONS = [
    { id: 'en', label: 'English' },
    { id: 'my', label: 'Bahasa Malaysia' },
    { id: 'zh', label: 'Chinese (Simplified)' },
]

const COLOR_OPTIONS = [
    'bg-gradient-to-br from-blue-500 to-blue-600',
    'bg-gradient-to-br from-indigo-500 to-indigo-600',
    'bg-gradient-to-br from-violet-500 to-violet-600',
    'bg-gradient-to-br from-cyan-500 to-cyan-600',
    'bg-gradient-to-br from-emerald-500 to-emerald-600',
    'bg-gradient-to-br from-amber-500 to-amber-600',
    'bg-gradient-to-br from-rose-500 to-rose-600',
    'bg-gradient-to-br from-fuchsia-500 to-fuchsia-600',
]

export default function NewProjectDialog({ open, onOpenChange, onSubmit }) {
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        sourceLanguage: 'en',
        targetLanguages: ['my', 'zh'],
        color: COLOR_OPTIONS[0],
    })
    const [errors, setErrors] = useState({})

    const validate = () => {
        const newErrors = {}
        if (!formData.name.trim()) {
            newErrors.name = 'Project name is required'
        }
        if (formData.targetLanguages.length === 0) {
            newErrors.targetLanguages = 'Select at least one target language'
        }
        setErrors(newErrors)
        return Object.keys(newErrors).length === 0
    }

    const handleSubmit = async (e) => {
        e.preventDefault()
        if (!validate()) return

        setIsSubmitting(true)
        try {
            const projectData = {
                name: formData.name.trim(),
                sourceLanguage: LANGUAGE_OPTIONS.find(l => l.id === formData.sourceLanguage)?.label || 'English',
                targetLanguages: formData.targetLanguages.map(
                    id => LANGUAGE_OPTIONS.find(l => l.id === id)?.label || id
                ),
                color: formData.color,
                pages: 1,
                totalRows: 0,
                team: [],
            }
            await onSubmit(projectData)
            // Reset form
            setFormData({
                name: '',
                sourceLanguage: 'en',
                targetLanguages: ['my', 'zh'],
                color: COLOR_OPTIONS[0],
            })
            onOpenChange(false)
        } catch (error) {
            console.error('Error creating project:', error)
            setErrors({ submit: 'Failed to create project. Please try again.' })
        } finally {
            setIsSubmitting(false)
        }
    }

    const toggleTargetLanguage = (langId) => {
        setFormData(prev => ({
            ...prev,
            targetLanguages: prev.targetLanguages.includes(langId)
                ? prev.targetLanguages.filter(l => l !== langId)
                : [...prev.targetLanguages, langId]
        }))
    }

    if (!open) return null

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-card rounded-2xl shadow-xl w-full max-w-lg overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-6 border-b">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
                            <Languages className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                            <h2 className="text-lg font-semibold">New Project</h2>
                            <p className="text-sm text-muted-foreground">Create a translation project</p>
                        </div>
                    </div>
                    <button
                        onClick={() => onOpenChange(false)}
                        className="p-2 hover:bg-muted rounded-lg transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Form */}
                <form onSubmit={handleSubmit} className="p-6 space-y-5">
                    {/* Project Name */}
                    <div className="space-y-2">
                        <Label htmlFor="name">Project Name *</Label>
                        <Input
                            id="name"
                            placeholder="e.g., Marketing Campaign Q1 2024"
                            value={formData.name}
                            onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            className={errors.name ? 'border-destructive' : ''}
                        />
                        {errors.name && (
                            <p className="text-sm text-destructive">{errors.name}</p>
                        )}
                    </div>

                    {/* Source Language */}
                    <div className="space-y-2">
                        <Label>Source Language</Label>
                        <div className="flex flex-wrap gap-2">
                            {LANGUAGE_OPTIONS.map((lang) => (
                                <button
                                    key={lang.id}
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, sourceLanguage: lang.id }))}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${formData.sourceLanguage === lang.id
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted hover:bg-muted/80'
                                        }`}
                                >
                                    {lang.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Target Languages */}
                    <div className="space-y-2">
                        <Label>Target Languages *</Label>
                        <div className="flex flex-wrap gap-2">
                            {LANGUAGE_OPTIONS.filter(l => l.id !== formData.sourceLanguage).map((lang) => (
                                <button
                                    key={lang.id}
                                    type="button"
                                    onClick={() => toggleTargetLanguage(lang.id)}
                                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${formData.targetLanguages.includes(lang.id)
                                            ? 'bg-primary text-primary-foreground'
                                            : 'bg-muted hover:bg-muted/80'
                                        }`}
                                >
                                    {lang.label}
                                </button>
                            ))}
                        </div>
                        {errors.targetLanguages && (
                            <p className="text-sm text-destructive">{errors.targetLanguages}</p>
                        )}
                    </div>

                    {/* Color Picker */}
                    <div className="space-y-2">
                        <Label>Project Color</Label>
                        <div className="flex flex-wrap gap-2">
                            {COLOR_OPTIONS.map((color) => (
                                <button
                                    key={color}
                                    type="button"
                                    onClick={() => setFormData(prev => ({ ...prev, color }))}
                                    className={`w-8 h-8 rounded-lg ${color} transition-all ${formData.color === color
                                            ? 'ring-2 ring-offset-2 ring-primary'
                                            : 'hover:scale-110'
                                        }`}
                                />
                            ))}
                        </div>
                    </div>

                    {/* Error Message */}
                    {errors.submit && (
                        <div className="p-3 rounded-lg bg-destructive/10 text-destructive text-sm">
                            {errors.submit}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3 pt-2">
                        <Button
                            type="button"
                            variant="outline"
                            className="flex-1"
                            onClick={() => onOpenChange(false)}
                        >
                            Cancel
                        </Button>
                        <Button
                            type="submit"
                            className="flex-1"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? (
                                <>
                                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                    Creating...
                                </>
                            ) : (
                                'Create Project'
                            )}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    )
}
