// PromptDetailDialog - Modal for creating/editing/viewing prompt templates
// Matches Figma design with shared UI components
import { useState, useEffect, useRef } from "react"
import { X, CirclePlus, Sparkles, Check, ChevronDown, Pencil } from "lucide-react"
import {
    ModalOverlay,
    ModalContent,
    FormField,
    TextInput,
    PrimaryButton,
    SecondaryButton,
    IconButton,
    COLORS,
} from "@/components/ui/shared"
import { useAuth } from "@/context/DevAuthContext"

// Available tag options
const TAG_OPTIONS = [
    'Banner/Slogan',
    'CTA/Buttons',
    'Legal',
    'Marketing',
    'Technical',
    'Social Media',
    'News',
    'Narratives'
]

// Multi-select Tags Dropdown Component
function TagsDropdown({ selectedTags, onChange, disabled }) {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef(null)

    // Close dropdown on outside click
    useEffect(() => {
        function handleClickOutside(e) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const toggleTag = (tag) => {
        if (disabled) return
        if (selectedTags.includes(tag)) {
            const newTags = selectedTags.filter(t => t !== tag)
            onChange(newTags)
        } else {
            // Remove 'Default' if it exists (legacy cleanup)
            const newTags = selectedTags.filter(t => t !== 'Default')
            onChange([...newTags, tag])
        }
    }

    const removeTag = (tag, e) => {
        e.stopPropagation()
        if (disabled) return
        const newTags = selectedTags.filter(t => t !== tag)
        onChange(newTags)
    }

    return (
        <div ref={dropdownRef} style={{ position: 'relative' }}>
            {/* Selected Tags Display - Clickable */}
            <div
                onClick={() => !disabled && setIsOpen(!isOpen)}
                style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '10px 16px',
                    minHeight: '48px',
                    borderRadius: '12px',
                    border: isOpen ? '1px solid hsl(340, 82%, 59%)' : '1px solid hsl(220, 13%, 91%)',
                    backgroundColor: 'white',
                    cursor: disabled ? 'default' : 'pointer',
                    transition: 'border-color 0.15s',
                    opacity: disabled ? 0.7 : 1
                }}
            >
                {selectedTags.map((tag) => (
                    <span
                        key={tag}
                        style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '4px 10px',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: 500,
                            backgroundColor: 'hsl(220, 14%, 96%)',
                            color: 'hsl(222, 47%, 11%)'
                        }}
                    >
                        {tag}
                        {!disabled && (
                            <button
                                type="button"
                                onClick={(e) => removeTag(tag, e)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    width: '14px',
                                    height: '14px',
                                    border: 'none',
                                    backgroundColor: 'transparent',
                                    cursor: 'pointer',
                                    padding: 0
                                }}
                            >
                                <X style={{ width: '12px', height: '12px', color: 'hsl(220, 9%, 46%)' }} />
                            </button>
                        )}
                    </span>
                ))}
                {!disabled && (
                    <ChevronDown style={{
                        width: '16px',
                        height: '16px',
                        marginLeft: 'auto',
                        color: 'hsl(220, 9%, 46%)',
                        transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                        transition: 'transform 0.15s'
                    }} />
                )}
            </div>

            {/* Dropdown Options */}
            {isOpen && !disabled && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    right: 0,
                    marginTop: '4px',
                    backgroundColor: 'white',
                    border: '1px solid hsl(220, 13%, 91%)',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    padding: '6px',
                    zIndex: 100,
                    maxHeight: '200px',
                    overflowY: 'auto'
                }}>
                    {TAG_OPTIONS.map((tag) => {
                        const isSelected = selectedTags.includes(tag)
                        return (
                            <button
                                key={tag}
                                type="button"
                                onClick={() => toggleTag(tag)}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'space-between',
                                    width: '100%',
                                    padding: '10px 12px',
                                    fontSize: '14px',
                                    borderRadius: '8px',
                                    border: 'none',
                                    backgroundColor: isSelected ? 'hsl(340, 82%, 97%)' : 'transparent',
                                    color: 'hsl(222, 47%, 11%)',
                                    cursor: 'pointer',
                                    textAlign: 'left'
                                }}
                                className="hover:bg-slate-50"
                            >
                                {tag}
                                {isSelected && (
                                    <Check style={{ width: '16px', height: '16px', color: 'hsl(340, 82%, 59%)' }} />
                                )}
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}


export default function PromptDetailDialog({ open, onOpenChange, initialData, onSave, viewOnly = false }) {
    const { isManager } = useAuth()
    const [isEditing, setIsEditing] = useState(!initialData) // Start in edit mode for new, view mode for existing
    const [formData, setFormData] = useState({
        name: '',
        description: '',
        prompt: '',
        tags: [],
        status: 'draft'
    })

    useEffect(() => {
        if (open) {
            if (initialData) {
                setFormData({
                    name: initialData.name || '',
                    description: initialData.description || '',
                    prompt: initialData.prompt || '',
                    tags: initialData.tags?.length ? initialData.tags : [],
                    status: initialData.status || 'draft'
                })
                setIsEditing(false) // Start in view mode for existing prompts
            } else {
                setFormData({
                    name: '',
                    description: '',
                    prompt: '',
                    tags: [],
                    status: 'draft'
                })
                setIsEditing(true) // Start in edit mode for new prompts
            }
        }
    }, [open, initialData])

    if (!open) return null

    const handleSave = () => {
        if (!formData.name.trim() || !formData.prompt.trim()) return
        onSave(formData)
        onOpenChange(false)
    }

    const isValid = formData.name.trim() && formData.prompt.trim()
    const isNewPrompt = !initialData

    // VIEW MODE - Show content and Edit button
    if (!isEditing && initialData) {
        return (
            <ModalOverlay onClose={() => onOpenChange(false)}>
                <ModalContent maxWidth="640px">
                    {/* Header - Title with tag and status */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        marginBottom: '2px'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <h2 style={{
                                fontSize: '24px',
                                fontWeight: 700,
                                color: 'black'
                            }}>
                                {initialData.name || 'Default Template'}
                            </h2>
                            {/* Default tag badge */}
                            {formData.tags?.includes('Default') && (
                                <span style={{
                                    padding: '4px 10px',
                                    borderRadius: '8px',
                                    fontSize: '12px',
                                    fontWeight: 500,
                                    backgroundColor: 'hsl(220, 14%, 96%)',
                                    color: 'hsl(220, 9%, 46%)'
                                }}>
                                    Default
                                </span>
                            )}
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            {/* Status Dropdown */}
                            <select
                                value={formData.status || 'draft'}
                                disabled={true}
                                style={{
                                    padding: '10px 36px 10px 16px',
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    borderRadius: '12px',
                                    border: '1px solid hsl(220, 13%, 91%)',
                                    backgroundColor: 'hsl(220, 14%, 98%)',
                                    color: 'hsl(222, 47%, 11%)',
                                    cursor: 'default',
                                    appearance: 'none',
                                    outline: 'none',
                                    minWidth: '100px',
                                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`,
                                    backgroundRepeat: 'no-repeat',
                                    backgroundPosition: 'right 12px center',
                                    opacity: 1 // Keep opacity full for readability
                                }}
                            >
                                <option value="draft">Draft</option>
                                <option value="published">Published</option>
                            </select>
                            <IconButton onClick={() => onOpenChange(false)}>
                                <X style={{ width: '18px', height: '18px' }} />
                            </IconButton>
                        </div>
                    </div>

                    {/* Description (View Mode) */}
                    {formData.description && (
                        <div style={{
                            marginBottom: '16px',
                            fontSize: '14px',
                            lineHeight: '1.5',
                            color: 'hsl(220, 9%, 46%)',
                            whiteSpace: 'pre-wrap'
                        }}>
                            {formData.description}
                        </div>
                    )}

                    {/* Divider */}
                    <div style={{
                        height: '1px',
                        backgroundColor: 'hsl(220, 13%, 91%)',
                        margin: '16px 0 24px'
                    }} />

                    {/* Content */}
                    <div>


                        <label style={{
                            display: 'block',
                            fontSize: '14px',
                            fontWeight: 500,
                            color: 'hsl(220, 9%, 46%)',
                            marginBottom: '8px'
                        }}>
                            Prompt Content
                        </label>
                        <div style={{
                            padding: '16px',
                            borderRadius: '12px',
                            border: '1px solid hsl(220, 13%, 91%)',
                            backgroundColor: 'white',
                            fontSize: '14px',
                            lineHeight: '1.6',
                            color: 'hsl(222, 47%, 11%)',
                            whiteSpace: 'pre-wrap',
                            minHeight: '120px',
                            maxHeight: '60vh',
                            overflowY: 'auto'
                        }}>
                            {formData.prompt || 'No content'}
                        </div>

                        {/* Edit Prompt Button */}
                        <div style={{ marginTop: '24px' }}>
                            <PrimaryButton onClick={() => setIsEditing(true)}>
                                <Pencil style={{ width: '14px', height: '14px' }} />
                                Edit Prompt
                            </PrimaryButton>
                        </div>
                    </div>
                </ModalContent>
            </ModalOverlay>
        )
    }

    // EDIT/CREATE MODE
    return (
        <ModalOverlay onClose={() => onOpenChange(false)}>
            <ModalContent maxWidth="640px">
                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    marginBottom: '4px'
                }}>
                    <div>
                        <h2 style={{
                            fontSize: '24px',
                            fontWeight: 700,
                            color: 'black',
                            marginBottom: '4px'
                        }}>
                            {isNewPrompt ? 'New prompt template' : 'Edit Template'}
                        </h2>
                        {isNewPrompt && (
                            <p style={{
                                fontSize: '14px',
                                color: 'hsl(220, 9%, 46%)',
                                margin: 0
                            }}>
                                Create a prompt template to cater more specific translation use case.
                            </p>
                        )}
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {/* Status Dropdown - Restricted for Editors */}
                        <div className="relative">
                            <select
                                value={formData.status || 'draft'}
                                onChange={e => isManager && setFormData(prev => ({ ...prev, status: e.target.value }))}
                                disabled={!isManager}
                                style={{
                                    padding: '10px 36px 10px 16px',
                                    fontSize: '14px',
                                    fontWeight: 500,
                                    borderRadius: '12px',
                                    border: '1px solid hsl(220, 13%, 91%)',
                                    backgroundColor: isManager ? 'hsl(220, 14%, 98%)' : 'hsl(220, 14%, 96%)',
                                    color: 'hsl(222, 47%, 11%)',
                                    cursor: isManager ? 'pointer' : 'not-allowed',
                                    appearance: 'none',
                                    outline: 'none',
                                    minWidth: '100px',
                                    backgroundImage: isManager ? `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 24 24' fill='none' stroke='%2364748b' stroke-width='2' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")` : 'none',
                                    backgroundRepeat: 'no-repeat',
                                    backgroundPosition: 'right 12px center',
                                    transition: 'border-color 0.15s, box-shadow 0.15s',
                                    opacity: 1
                                }}
                                onFocus={(e) => isManager && (e.target.style.borderColor = 'hsl(340, 82%, 59%)')}
                                onBlur={(e) => e.target.style.borderColor = 'hsl(220, 13%, 91%)'}
                            >
                                <option value="draft">Draft</option>
                                <option value="published">Published {(!isManager && formData.status === 'published') ? '(Active)' : ''}</option>
                            </select>
                        </div>
                        <IconButton onClick={() => onOpenChange(false)}>
                            <X style={{ width: '18px', height: '18px' }} />
                        </IconButton>
                    </div>
                </div>

                {/* Divider */}
                <div style={{
                    height: '1px',
                    backgroundColor: 'hsl(220, 13%, 91%)',
                    margin: '16px 0 24px'
                }} />

                {/* Form - Scrollable Container */}
                <div style={{ maxHeight: '60vh', overflowY: 'auto', paddingRight: '4px' }}>
                    {/* Template Name */}
                    <FormField label="Template name" required>
                        <TextInput
                            placeholder="E.g. Banner Slogan"
                            value={formData.name}
                            onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                            style={{ backgroundColor: 'white' }}
                        />
                    </FormField>

                    {/* Description */}
                    <FormField label="Description (Optional)">
                        <TextInput
                            placeholder="Briefly describe what this prompt is for..."
                            value={formData.description}
                            onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                            style={{ backgroundColor: 'white' }}
                        />
                    </FormField>

                    {/* Prompt Content */}
                    <FormField label="Prompt Content" required>
                        <div style={{ position: 'relative' }}>
                            <textarea
                                placeholder="Explain the use case of the prompt. Specify role, requirements, constraints, tone etc to achieve more precise prompt."
                                value={formData.prompt}
                                onChange={e => setFormData(prev => ({ ...prev, prompt: e.target.value }))}
                                style={{
                                    width: '100%',
                                    minHeight: '320px',
                                    padding: '12px 16px',
                                    paddingRight: '40px',
                                    fontSize: '14px',
                                    borderRadius: '12px',
                                    border: '1px solid hsl(220, 13%, 91%)',
                                    outline: 'none',
                                    backgroundColor: 'white',
                                    resize: 'vertical',
                                    fontFamily: 'inherit',
                                    lineHeight: '1.5',
                                    boxSizing: 'border-box',
                                }}
                            />
                            {/* AI Sparkle icon */}
                            <Sparkles style={{
                                position: 'absolute',
                                top: '12px',
                                right: '12px',
                                width: '16px',
                                height: '16px',
                                color: 'hsl(220, 9%, 70%)'
                            }} />
                        </div>
                    </FormField>

                    {/* Tags Section - Clickable multi-select dropdown */}
                    <FormField label="Tags">
                        <TagsDropdown
                            selectedTags={formData.tags || []}
                            onChange={(newTags) => setFormData(prev => ({ ...prev, tags: newTags }))}
                        />
                    </FormField>

                    {/* Action Buttons */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginTop: '24px', paddingBottom: '4px' }}>
                        <SecondaryButton onClick={() => {
                            if (initialData) {
                                setIsEditing(false) // Go back to view mode
                            } else {
                                onOpenChange(false) // Close for new prompts
                            }
                        }}>
                            Cancel
                        </SecondaryButton>
                        <PrimaryButton
                            onClick={handleSave}
                            disabled={!isValid}
                        >
                            <CirclePlus style={{ width: '14px', height: '14px' }} />
                            {isNewPrompt ? 'Create prompt' : 'Update Prompt'}
                        </PrimaryButton>
                    </div>
                </div>
            </ModalContent>
        </ModalOverlay>
    )
}

