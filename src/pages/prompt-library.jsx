// Prompt Library - Card grid layout matching Figma design
import { useState, useRef, useEffect } from "react"
import { Search, Plus, Filter, ArrowUpDown, MoreHorizontal, Copy, Pencil, Trash2, X, CirclePlus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PromptDetailDialog } from "@/components/dialogs"
import { usePrompts } from "@/context/PromptContext"
import { useAuth, ACTIONS } from "@/App"
import { COLORS, PrimaryButton, SecondaryButton, PillButton, IconButton } from "@/components/ui/shared"
import { PageHeader, CategoryFilterTabs, SearchInput } from "@/components/ui/common"
import { StatusFilterDropdown } from "@/components/ui/StatusFilterDropdown"
import { getStatusConfig } from "@/lib/constants"

// Using centralized STATUS_CONFIG from @/lib/constants

export default function PromptLibrary() {
    const { templates, addTemplate, updateTemplate, deleteTemplate, duplicateTemplate } = usePrompts()
    const { canDo } = useAuth()
    const [searchQuery, setSearchQuery] = useState("")
    const [isDialogOpen, setIsDialogOpen] = useState(false)
    const [editingTemplate, setEditingTemplate] = useState(null)
    const [viewingTemplate, setViewingTemplate] = useState(null)  // View modal state
    const [openMenu, setOpenMenu] = useState(null)
    const [deleteConfirm, setDeleteConfirm] = useState(null)
    const [activeCategory, setActiveCategory] = useState('All')
    const [statusFilter, setStatusFilter] = useState([]) // Multi-selectable status filter

    // Prompt-specific status options - using centralized config
    const PROMPT_STATUS_OPTIONS = [
        { id: 'draft', label: 'Draft', color: '#94a3b8' },
        { id: 'review', label: 'In Review', color: '#3b82f6' },
        { id: 'published', label: 'Published', color: '#10b981' },
    ]

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
    const filteredTemplates = templates.filter(template => {
        const matchesSearch = template.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
            template.prompt?.toLowerCase().includes(searchQuery.toLowerCase())

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

    // Parse prompt content for display (Role, Goal, Constraints)
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

        // Fallback: use first 100 chars as goal if no structured content
        if (!role && !goal && !constraints && prompt) {
            goal = prompt.substring(0, 100) + (prompt.length > 100 ? '...' : '')
        }

        return { role, goal, constraints }
    }

    return (
        <div className="w-full pb-10">
            {/* Header */}
            <div style={{ marginBottom: '16px' }}>
                <h1 style={{
                    fontSize: '24px',
                    fontWeight: 700,
                    letterSpacing: '-0.02em',
                    color: 'hsl(222, 47%, 11%)',
                    marginBottom: '4px'
                }}>
                    Prompt Library
                </h1>
            </div>

            {/* Category Filter Tabs */}
            <div style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '16px',
                overflowX: 'auto',
                paddingBottom: '4px'
            }}>
                {allCategories.map(category => (
                    <button
                        key={category}
                        onClick={() => setActiveCategory(category)}
                        style={{
                            padding: '8px 16px',
                            borderRadius: '9999px',
                            fontSize: '13px',
                            fontWeight: 500,
                            border: 'none',
                            cursor: 'pointer',
                            whiteSpace: 'nowrap',
                            backgroundColor: activeCategory === category ? '#FF0084' : 'hsl(220, 14%, 96%)',
                            color: activeCategory === category ? 'white' : 'hsl(220, 9%, 46%)',
                            transition: 'all 0.15s'
                        }}
                    >
                        {category}
                    </button>
                ))}
            </div>

            {/* Action Bar - prompt count on left, buttons on right */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: '12px',
                marginBottom: '24px'
            }}>
                {/* Left side - Prompt count */}
                <span style={{
                    fontSize: '14px',
                    color: 'hsl(220, 9%, 46%)'
                }}>
                    {templates.length} prompt(s)
                </span>

                {/* Right side - Search and buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Search */}
                    <div style={{ position: 'relative', width: '200px' }}>
                        <Search style={{
                            position: 'absolute',
                            left: '12px',
                            top: '50%',
                            transform: 'translateY(-50%)',
                            width: '16px',
                            height: '16px',
                            color: 'hsl(220, 9%, 46%)'
                        }} />
                        <input
                            type="text"
                            placeholder="Search"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{
                                width: '100%',
                                height: '36px',
                                paddingLeft: '36px',
                                paddingRight: '12px',
                                fontSize: '14px',
                                borderRadius: '12px',
                                border: '1px solid hsl(220, 13%, 91%)',
                                outline: 'none',
                                backgroundColor: 'white'
                            }}
                        />
                    </div>

                    {/* Filters */}
                    <StatusFilterDropdown
                        selectedStatuses={statusFilter}
                        onStatusChange={setStatusFilter}
                        statusOptions={PROMPT_STATUS_OPTIONS}
                    />

                    {/* Sort */}
                    <PillButton variant="outline">
                        <ArrowUpDown style={{ width: '14px', height: '14px' }} />
                        Sort
                    </PillButton>

                    {/* New Template Button */}
                    {canDo(ACTIONS.CREATE_PROMPT) && (
                        <PrimaryButton onClick={handleCreate} style={{ height: '36px', fontSize: '14px' }}>
                            <CirclePlus style={{ width: '14px', height: '14px' }} />
                            New template
                        </PrimaryButton>
                    )}
                </div>
            </div>

            {/* Card Grid - 4 columns */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(4, 1fr)',
                gap: '16px'
            }}>
                {/* Template Cards */}
                {sortedTemplates.map(template => {
                    const status = getStatusConfig(template.status)
                    const { role, goal, constraints } = parsePromptContent(template.prompt)
                    // Fix: Handle undefined/null category properly
                    const categoryLabel = template.isDefault
                        ? 'Default'
                        : (!template.category || template.category === 'default'
                            ? 'Default'
                            : template.category.charAt(0).toUpperCase() + template.category.slice(1))
                    const isDefault = template.isDefault === true

                    return (
                        <div
                            key={template.id}
                            onClick={() => setViewingTemplate(template)}
                            style={{
                                backgroundColor: 'white',
                                borderRadius: '16px',
                                border: isDefault ? '2px solid #FF0084' : '1px solid hsl(220, 13%, 91%)',
                                padding: '20px',
                                position: 'relative',
                                cursor: 'pointer',
                                minHeight: '280px',
                                display: 'flex',
                                flexDirection: 'column'
                            }}
                            className="shadow-sm hover:shadow-md transition-shadow"
                        >
                            {/* Header: Category + Menu */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                marginBottom: '12px'
                            }}>
                                <span style={{
                                    display: 'inline-block',
                                    padding: '4px 12px',
                                    borderRadius: '9999px',
                                    fontSize: '12px',
                                    fontWeight: 500,
                                    backgroundColor: 'hsl(220, 14%, 96%)',
                                    color: 'hsl(220, 9%, 46%)'
                                }}>
                                    {categoryLabel}
                                </span>

                                {/* Menu */}
                                <div style={{ position: 'relative' }} data-menu>
                                    <IconButton
                                        onClick={() => setOpenMenu(openMenu === template.id ? null : template.id)}
                                        style={{ color: 'hsl(220, 9%, 46%)' }}
                                    >
                                        <MoreHorizontal style={{ width: '16px', height: '16px' }} />
                                    </IconButton>

                                    {openMenu === template.id && (
                                        <div style={{
                                            position: 'absolute',
                                            right: 0,
                                            top: '100%',
                                            marginTop: '4px',
                                            backgroundColor: 'white',
                                            border: '1px solid hsl(220, 13%, 91%)',
                                            borderRadius: '12px',
                                            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                                            padding: '4px',
                                            minWidth: '140px',
                                            zIndex: 10
                                        }}>
                                            <button
                                                onClick={() => handleCopy(template)}
                                                className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg hover:bg-slate-50 transition-colors text-slate-700"
                                            >
                                                <Copy className="w-4 h-4" />
                                                Copy
                                            </button>
                                            {canDo(ACTIONS.EDIT_PROMPT) && (
                                                <button
                                                    onClick={() => handleEdit(template)}
                                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg hover:bg-slate-50 transition-colors text-slate-700"
                                                >
                                                    <Pencil className="w-4 h-4" />
                                                    Edit
                                                </button>
                                            )}
                                            {canDo(ACTIONS.DELETE_PROMPT) && !isDefault && (
                                                <button
                                                    onClick={() => { setDeleteConfirm(template.id); setOpenMenu(null) }}
                                                    className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-lg hover:bg-red-50 transition-colors text-red-600"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                    Delete
                                                </button>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Title */}
                            <h3 style={{
                                fontSize: '16px',
                                fontWeight: 600,
                                color: 'hsl(222, 47%, 11%)',
                                marginBottom: '12px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                            }}>
                                {template.name}
                            </h3>

                            {/* Content Preview - flex-grow to fill space */}
                            <div style={{ marginBottom: '16px', flex: 1 }}>
                                {role && (
                                    <p style={{
                                        fontSize: '13px',
                                        color: 'hsl(220, 9%, 46%)',
                                        marginBottom: '6px',
                                        overflow: 'hidden',
                                        textOverflow: 'ellipsis',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        <span style={{ fontWeight: 500 }}>Role:</span> {role}
                                    </p>
                                )}
                                {goal && (
                                    <p style={{
                                        fontSize: '13px',
                                        color: 'hsl(220, 9%, 46%)',
                                        marginBottom: '6px',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 3,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                        lineHeight: '1.5'
                                    }}>
                                        {role ? <><span style={{ fontWeight: 500 }}>Goal:</span> {goal}</> : goal}
                                    </p>
                                )}
                                {constraints && (
                                    <p style={{
                                        fontSize: '13px',
                                        color: 'hsl(220, 9%, 46%)',
                                        display: '-webkit-box',
                                        WebkitLineClamp: 2,
                                        WebkitBoxOrient: 'vertical',
                                        overflow: 'hidden',
                                        lineHeight: '1.5'
                                    }}>
                                        <span style={{ fontWeight: 500 }}>Constraints:</span> {constraints}
                                    </p>
                                )}
                            </div>

                            {/* Status - at bottom */}
                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                marginTop: 'auto'
                            }}>
                                <span style={{
                                    width: '8px',
                                    height: '8px',
                                    borderRadius: '50%',
                                    backgroundColor: status.color
                                }} />
                                <span style={{
                                    fontSize: '13px',
                                    color: status.color,
                                    fontWeight: 500
                                }}>
                                    {status.label}
                                </span>
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Empty State */}
            {filteredTemplates.length === 0 && !canDo(ACTIONS.CREATE_PROMPT) && (
                <div style={{
                    padding: '64px',
                    textAlign: 'center',
                    border: '2px dashed hsl(220, 13%, 91%)',
                    borderRadius: '16px'
                }}>
                    <Search style={{
                        width: '48px',
                        height: '48px',
                        color: 'hsl(220, 9%, 46%)',
                        margin: '0 auto 16px'
                    }} />
                    <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '8px' }}>
                        No prompts found
                    </h3>
                    <p style={{ fontSize: '14px', color: 'hsl(220, 9%, 46%)' }}>
                        {searchQuery ? `No results for "${searchQuery}"` : "No prompt templates available."}
                    </p>
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
            {deleteConfirm && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.3)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 50
                    }}
                    onClick={() => setDeleteConfirm(null)}
                >
                    <div
                        style={{
                            backgroundColor: 'white',
                            borderRadius: '24px',
                            padding: '32px',
                            maxWidth: '400px',
                            width: '100%',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <h3 style={{
                            fontSize: '18px',
                            fontWeight: 600,
                            marginBottom: '8px'
                        }}>
                            Delete Prompt?
                        </h3>
                        <p style={{
                            fontSize: '14px',
                            color: 'hsl(220, 9%, 46%)',
                            marginBottom: '24px'
                        }}>
                            This action cannot be undone. Projects using this prompt will be set to "Default".
                        </p>
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                            <SecondaryButton onClick={() => setDeleteConfirm(null)}>
                                Cancel
                            </SecondaryButton>
                            <Button
                                variant="destructive"
                                onClick={() => handleDelete(deleteConfirm)}
                                className="rounded-xl"
                            >
                                Delete
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            {/* View Modal - Shows prompt details */}
            {viewingTemplate && (
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.3)',
                        backdropFilter: 'blur(4px)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 50
                    }}
                    onClick={() => setViewingTemplate(null)}
                >
                    <div
                        style={{
                            backgroundColor: 'white',
                            borderRadius: '24px',
                            padding: '32px',
                            maxWidth: '640px',
                            width: '100%',
                            maxHeight: '80vh',
                            overflow: 'auto',
                            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)'
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        {/* Header: Title + Tag + Status Dropdown + Close */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            marginBottom: '24px',
                            paddingBottom: '16px',
                            borderBottom: '1px solid hsl(220, 13%, 91%)'
                        }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <h2 style={{
                                    fontSize: '24px',
                                    fontWeight: 700,
                                    color: 'hsl(222, 47%, 11%)'
                                }}>
                                    {viewingTemplate.name}
                                </h2>
                                <span style={{
                                    display: 'inline-block',
                                    padding: '4px 12px',
                                    borderRadius: '9999px',
                                    fontSize: '12px',
                                    fontWeight: 500,
                                    backgroundColor: 'hsl(220, 14%, 96%)',
                                    color: 'hsl(220, 9%, 46%)'
                                }}>
                                    {viewingTemplate.isDefault ? 'Default' : (viewingTemplate.category || 'Default')}
                                </span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                {/* Status Dropdown */}
                                <select
                                    value={viewingTemplate.status || 'draft'}
                                    onChange={(e) => {
                                        updateTemplate(viewingTemplate.id, { status: e.target.value })
                                        setViewingTemplate(prev => ({ ...prev, status: e.target.value }))
                                    }}
                                    style={{
                                        padding: '10px 36px 10px 16px',
                                        fontSize: '14px',
                                        fontWeight: 500,
                                        borderRadius: '12px',
                                        border: '1px solid hsl(220, 13%, 91%)',
                                        backgroundColor: 'hsl(220, 14%, 98%)',
                                        color: 'hsl(222, 47%, 11%)',
                                        cursor: 'pointer',
                                        appearance: 'none',
                                        outline: 'none',
                                        minWidth: '120px',
                                        backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                                        backgroundRepeat: 'no-repeat',
                                        backgroundPosition: 'right 12px center',
                                        transition: 'border-color 0.15s, box-shadow 0.15s'
                                    }}
                                    onFocus={(e) => e.target.style.borderColor = '#FF0084'}
                                    onBlur={(e) => e.target.style.borderColor = 'hsl(220, 13%, 91%)'}
                                >
                                    <option value="draft">Draft</option>
                                    <option value="published">Published</option>
                                </select>
                                <IconButton onClick={() => setViewingTemplate(null)}>
                                    <X style={{ width: '20px', height: '20px' }} />
                                </IconButton>
                            </div>
                        </div>

                        {/* Prompt Section */}
                        <div style={{ marginBottom: '32px' }}>
                            <label style={{
                                display: 'block',
                                fontSize: '14px',
                                fontWeight: 500,
                                color: 'hsl(220, 9%, 46%)',
                                marginBottom: '12px'
                            }}>
                                Prompt
                            </label>
                            <div style={{
                                backgroundColor: 'hsl(220, 14%, 98%)',
                                borderRadius: '12px',
                                border: '1px solid hsl(220, 13%, 91%)',
                                padding: '16px',
                                fontSize: '14px',
                                color: 'hsl(222, 47%, 11%)',
                                whiteSpace: 'pre-wrap',
                                lineHeight: '1.6'
                            }}>
                                {viewingTemplate.prompt}
                            </div>
                        </div>

                        {/* Edit Button */}
                        {canDo(ACTIONS.EDIT_PROMPT) && (
                            <PrimaryButton
                                onClick={() => {
                                    setViewingTemplate(null)
                                    handleEdit(viewingTemplate)
                                }}
                                style={{ fontSize: '14px' }}
                            >
                                <Pencil style={{ width: '14px', height: '14px' }} />
                                Edit Prompt
                            </PrimaryButton>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
