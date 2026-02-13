// Prompt Library - Card grid layout matching Figma design
import { useState, useRef, useEffect } from "react"
import { Search, Plus, Filter, MoreHorizontal, Copy, Pencil, Trash2, X, CirclePlus, Pin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PromptDetailDialog, ConfirmDialog } from "@/components/dialogs"
import { usePrompts } from "@/context/PromptContext"
import { ACTIONS } from "@/App"
import { useAuth } from "@/context/DevAuthContext"
import { COLORS, PrimaryButton, SecondaryButton, PillButton, IconButton, PageContainer, Card } from "@/components/ui/shared"
import { SearchInput, PageHeader } from "@/components/ui/common"
import { StatusFilterDropdown } from "@/components/ui/StatusFilterDropdown"
import { getStatusConfig } from "@/lib/constants"
import { toast } from "sonner"

// Using centralized STATUS_CONFIG from @/lib/constants

export default function PromptLibrary() {
    const { templates, addTemplate, updateTemplate, deleteTemplate, duplicateTemplate } = usePrompts()
    const { canDo } = useAuth()
    const [searchQuery, setSearchQuery] = useState("")
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingTemplate, setEditingTemplate] = useState(null)
    const [openMenu, setOpenMenu] = useState(null)
    const [deleteConfirm, setDeleteConfirm] = useState(null)
    const [activeCategory, setActiveCategory] = useState('All')
    const [statusFilter, setStatusFilter] = useState([]) // Multi-selectable status filter

    // Prompt-specific status options - using centralized config
    const PROMPT_STATUS_OPTIONS = [
        { id: 'draft', label: 'Draft', color: COLORS.light.darkGrey },
        { id: 'review', label: 'In Review', color: COLORS.blue },
        { id: 'published', label: 'Published', color: COLORS.positive },
    ]

    // Check if there are any custom prompts (non-default)
    const hasCustomPrompts = templates.some(t => !t.isDefault)

    // Get unique categories from templates (using tags)
    const allCategories = ['All', ...new Set(
        templates.flatMap(t => t.tags || ['Default']).filter(tag => tag !== 'Default')
    ), 'Default']

    // Close menu on outside click
    useEffect(() => {
        function handleClickOutside(e) {
            if (openMenu && !e.target.closest('[data-menu]')) {
                setOpenMenu(null)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [openMenu])

    // Filter by search, category, and status
    const filteredTemplates = (templates || []).filter(template => {
        if (!template) return false

        const matchesSearch = (template.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
            (template.prompt || '').toLowerCase().includes(searchQuery.toLowerCase())

        // Category filter (using tags)
        const templateTags = template.tags || ['Default']
        const matchesCategory = activeCategory === 'All' || templateTags.includes(activeCategory)

        // Status filter - if no selection, show all
        const matchesStatus = statusFilter.length === 0 || statusFilter.includes(template.status || 'draft')

        return matchesSearch && matchesCategory && matchesStatus
    })

    // Sort: Default first, then others
    const sortedTemplates = [...filteredTemplates].sort((a, b) => {
        if (a.isDefault && !b.isDefault) return -1
        if (!a.isDefault && b.isDefault) return 1
        return 0
    })

    const handleCreate = () => {
        setEditingTemplate(null)
        setIsDialogOpen(true)
    }

    const handleEdit = (template) => {
        setEditingTemplate(template)
        setIsDialogOpen(true)
        setOpenMenu(null)
    }

    const handleSave = (data) => {
        if (editingTemplate) {
            updateTemplate(editingTemplate.id, data)
        } else {
            addTemplate({ ...data, status: 'draft' })
        }
    }

    const handleDelete = async (id) => {
        // Note: When a prompt is deleted, rows using it will fall back to 'Default'
        // because getPromptName returns null for missing prompts, and the UI shows 'Default'
        // The translations remain unchanged - only the promptId reference becomes orphaned
        await deleteTemplate(id)
        setDeleteConfirm(null)
        setOpenMenu(null)
        toast.success('Prompt deleted. Rows using this prompt will show Default.')
    }

    const handleCopy = (template) => {
        navigator.clipboard.writeText(template.prompt)
        setOpenMenu(null)
    }

    const parsePromptContent = (prompt) => {
        const lines = prompt?.split('\n') || []
        let role = '', goal = '', constraints = ''

        lines.forEach(line => {
            if (line.toLowerCase().startsWith('role:')) {
                role = line.substring(5).trim()
            } else if (line.toLowerCase().startsWith('goal:')) {
                goal = line.substring(5).trim()
            } else if (line.toLowerCase().startsWith('constraints:')) {
                constraints = line.substring(12).trim()
            }
        })

        if (!role && !goal && !constraints && prompt) {
            goal = prompt.substring(0, 100) + (prompt.length > 100 ? '...' : '')
        }

        return { role, goal, constraints }
    }

    return (
        <PageContainer>
            {/* Header & Controls */}
            <div className="flex flex-col gap-6 mb-8">
                <PageHeader
                    description="Manage your AI translation prompts and templates"
                    actions={
                        canDo(ACTIONS.CREATE_PROMPT) && (
                            <PrimaryButton onClick={handleCreate} className="w-full md:w-auto">
                                <CirclePlus className="w-4 h-4 mr-2" />
                                New Template
                            </PrimaryButton>
                        )
                    }
                >
                    Prompt Library
                </PageHeader>

                <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                    {/* Category Tabs */}
                    <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none max-w-full md:max-w-2xl">
                        {allCategories.map(category => (
                            <button
                                key={category}
                                onClick={() => setActiveCategory(category)}
                                className={`px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap ${activeCategory === category
                                    ? 'bg-primary text-white shadow-md shadow-primary/25'
                                    : 'bg-white text-slate-500 hover:bg-slate-50 border border-transparent hover:border-slate-200'
                                    }`}
                            >
                                {category}
                            </button>
                        ))}
                    </div>

                    {/* Filters */}
                    <div className="flex items-center gap-3 w-full md:w-auto">
                        <SearchInput
                            value={searchQuery}
                            onChange={setSearchQuery}
                            placeholder="Search templates..."
                            className="bg-white"
                        />
                        <StatusFilterDropdown
                            selectedStatuses={statusFilter}
                            onStatusChange={setStatusFilter}
                            statusOptions={PROMPT_STATUS_OPTIONS}
                        />
                    </div>
                </div>
            </div>

            {/* Grid Content */}
            {sortedTemplates.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 bg-white rounded-3xl border border-dashed border-slate-200 text-center">
                    <div className="bg-slate-50 p-4 rounded-full mb-4">
                        <Search className="w-8 h-8 text-slate-400" />
                    </div>
                    <h3 className="text-lg font-semibold text-navy-900 mb-2">No prompts found</h3>
                    <p className="text-slate-500 max-w-sm mx-auto">
                        {searchQuery ? `No results for "${searchQuery}"` : "Get started by creating your first prompt template."}
                    </p>
                    {canDo(ACTIONS.CREATE_PROMPT) && !searchQuery && (
                        <PrimaryButton onClick={handleCreate} className="mt-6">
                            Create Prompt
                        </PrimaryButton>
                    )}
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6">
                    {sortedTemplates.map(template => {
                        const status = getStatusConfig(template.status)
                        const { role, goal, constraints } = parsePromptContent(template.prompt)
                        const firstTag = template.tags && template.tags.length > 0 ? template.tags[0] : (template.category || 'Default')
                        const categoryLabel = template.isDefault ? 'Default' : firstTag
                        const isDefault = template.isDefault === true

                        return (
                            <Card
                                key={template.id}
                                className={`group flex flex-col min-h-[280px] transition-all duration-200 hover:-translate-y-1 hover:shadow-lg cursor-pointer relative overflow-hidden ${isDefault ? 'border-primary/20 ring-1 ring-primary/5 bg-primary/[0.02]' : 'hover:border-primary/20'
                                    }`}
                            >
                                <div onClick={() => handleEdit(template)} className="flex-1 flex flex-col">
                                    {/* Card Header */}
                                    <div className="flex items-start justify-between mb-4">
                                        <div className="flex flex-wrap gap-1 mb-2">
                                            {template.tags && template.tags.length > 0 ? (
                                                template.tags.map(tag => (
                                                    <span key={tag} className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${isDefault ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500'
                                                        }`}>
                                                        {tag}
                                                    </span>
                                                ))
                                            ) : (
                                                <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold ${isDefault ? 'bg-primary/10 text-primary' : 'bg-slate-100 text-slate-500'
                                                    }`}>
                                                    {categoryLabel}
                                                </span>
                                            )}
                                        </div>

                                        <div className="relative" data-menu>
                                            {isDefault ? (
                                                <div className="text-primary p-1 bg-primary/5 rounded-md" title="Default Template">
                                                    <Pin className="w-4 h-4 text-primary fill-primary/20" />
                                                </div>
                                            ) : (
                                                <IconButton
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        setOpenMenu(openMenu === template.id ? null : template.id)
                                                    }}
                                                    className="opacity-0 group-hover:opacity-100 transition-opacity"
                                                >
                                                    <MoreHorizontal className="w-4 h-4" />
                                                </IconButton>
                                            )}

                                            {openMenu === template.id && (
                                                <div className="absolute right-0 top-full mt-2 w-36 bg-white rounded-xl shadow-xl border border-slate-100 py-1 z-20 animate-in fade-in zoom-in-95 duration-200">
                                                    <button
                                                        onClick={(e) => {
                                                            e.stopPropagation()
                                                            handleCopy(template)
                                                        }}
                                                        className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-slate-50 text-slate-600 transition-colors"
                                                    >
                                                        <Copy className="w-4 h-4" />
                                                        Copy
                                                    </button>
                                                    {canDo(ACTIONS.EDIT_PROMPT) && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                handleEdit(template)
                                                            }}
                                                            className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-slate-50 text-slate-600 transition-colors"
                                                        >
                                                            <Pencil className="w-4 h-4" />
                                                            Edit
                                                        </button>
                                                    )}
                                                    {canDo(ACTIONS.DELETE_PROMPT) && !isDefault && (
                                                        <button
                                                            onClick={(e) => {
                                                                e.stopPropagation()
                                                                setDeleteConfirm(template.id)
                                                                setOpenMenu(null)
                                                            }}
                                                            className="flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-red-50 text-red-600 transition-colors"
                                                        >
                                                            <Trash2 className="w-4 h-4" />
                                                            Delete
                                                        </button>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    </div>

                                    {/* Card Content */}
                                    <h3 className="text-base font-bold text-navy-900 mb-3 line-clamp-1 group-hover:text-primary transition-colors">
                                        {template.name}
                                    </h3>

                                    <div className="space-y-2 mb-4 flex-1">
                                        {template.description ? (
                                            <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                                                {template.description}
                                            </p>
                                        ) : (
                                            <>
                                                {role && (
                                                    <p className="text-xs text-slate-500 line-clamp-1">
                                                        <span className="font-semibold text-slate-700">Role:</span> {role}
                                                    </p>
                                                )}
                                                {goal && (
                                                    <p className="text-xs text-slate-500 line-clamp-3 leading-relaxed">
                                                        {role ? <><span className="font-semibold text-slate-700">Goal:</span> {goal}</> : goal}
                                                    </p>
                                                )}
                                                {constraints && (
                                                    <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                                                        <span className="font-semibold text-slate-700">Constraints:</span> {constraints}
                                                    </p>
                                                )}
                                            </>
                                        )}
                                    </div>

                                    {/* Card Footer */}
                                    <div className="mt-auto pt-4 border-t border-slate-50 flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <span
                                                className="w-2 h-2 rounded-full"
                                                style={{ backgroundColor: status.color }} // Keeping inline for dynamic color from config
                                            />
                                            <span
                                                className="text-xs font-semibold"
                                                style={{ color: status.color }} // Keeping inline for dynamic color from config
                                            >
                                                {status.label}
                                            </span>
                                        </div>
                                        {isDefault && <span className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">Default</span>}
                                    </div>
                                </div>
                            </Card>
                        )
                    })}
                </div>
            )}

            {/* Dialog */}
            <PromptDetailDialog
                open={isDialogOpen}
                onOpenChange={setIsDialogOpen}
                initialData={editingTemplate}
                onSave={handleSave}
            />

            {/* Delete Confirmation */}
            <ConfirmDialog
                open={!!deleteConfirm}
                onClose={() => setDeleteConfirm(null)}
                onConfirm={() => handleDelete(deleteConfirm)}
                title="Delete Prompt?"
                message="Are you sure you want to delete this prompt? This action cannot be undone. Projects using this prompt will be set to Default."
                confirmLabel="Delete"
                variant="destructive"
            />
        </PageContainer>
    )
}
