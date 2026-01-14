// PromptCategoryDropdown - Styled tag with dropdown menu for prompt selection
// Extracted from project-details.jsx for reuse

import { useState, useRef, useEffect } from 'react'
import { ChevronDown } from 'lucide-react'

/**
 * Category color mapping based on template category
 */
function getCategoryStyle(template) {
    if (template.isDefault) {
        return { bg: 'hsl(220, 14%, 96%)', color: 'hsl(220, 9%, 46%)' }
    }

    const cat = (template.category || '').toLowerCase()

    if (cat.includes('banner') || cat.includes('slogan') || cat.includes('hero')) {
        return { bg: 'hsl(340, 82%, 95%)', color: 'hsl(340, 82%, 45%)' }
    }
    if (cat.includes('cta') || cat.includes('button')) {
        return { bg: 'hsl(210, 82%, 95%)', color: 'hsl(210, 82%, 45%)' }
    }
    if (cat.includes('legal')) {
        return { bg: 'hsl(45, 82%, 95%)', color: 'hsl(45, 82%, 35%)' }
    }
    if (cat.includes('marketing')) {
        return { bg: 'hsl(280, 82%, 95%)', color: 'hsl(280, 82%, 45%)' }
    }

    return { bg: 'hsl(220, 14%, 96%)', color: 'hsl(220, 9%, 46%)' }
}

/**
 * Dropdown for selecting prompt category/template
 * @param {string} currentPromptId - Currently selected prompt ID
 * @param {Array} templates - Array of available templates
 * @param {Function} onSelect - Callback when selection changes (promptId) => void
 */
export function PromptCategoryDropdown({ currentPromptId, templates, onSelect }) {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef(null)

    // Sort templates: default first
    const sortedTemplates = [...templates].sort((a, b) => {
        if (a.isDefault && !b.isDefault) return -1
        if (!a.isDefault && b.isDefault) return 1
        return 0
    })

    // Find current template
    const currentTemplate = templates.find(t => t.id === currentPromptId)
    const displayName = currentTemplate?.name || 'Default'
    const isDefault = !currentPromptId || currentTemplate?.isDefault

    // Close on outside click
    useEffect(() => {
        function handleClickOutside(e) {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <div ref={dropdownRef} style={{ position: 'relative' }}>
            {/* Tag button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '4px',
                    padding: '4px 10px',
                    borderRadius: '9999px',
                    fontSize: '12px',
                    fontWeight: 500,
                    backgroundColor: isDefault ? 'hsl(220, 14%, 96%)' : 'hsl(340, 82%, 95%)',
                    color: isDefault ? 'hsl(220, 9%, 46%)' : 'hsl(340, 82%, 45%)',
                    border: 'none',
                    cursor: 'pointer',
                    transition: 'all 0.15s'
                }}
            >
                {displayName}
                <ChevronDown style={{ width: '12px', height: '12px', opacity: 0.6 }} />
            </button>

            {/* Dropdown menu */}
            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    marginTop: '4px',
                    backgroundColor: 'white',
                    border: '1px solid hsl(220, 13%, 91%)',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    padding: '4px',
                    minWidth: '160px',
                    zIndex: 50
                }}>
                    {sortedTemplates.map(template => {
                        const catStyle = getCategoryStyle(template)
                        const displayCategory = template.isDefault
                            ? 'Default'
                            : (template.category || template.name || 'Default')

                        return (
                            <button
                                key={template.id}
                                onClick={() => {
                                    onSelect(template.isDefault ? null : template.id)
                                    setIsOpen(false)
                                }}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    width: '100%',
                                    padding: '8px 12px',
                                    fontSize: '13px',
                                    textAlign: 'left',
                                    backgroundColor: template.id === currentPromptId
                                        ? 'hsl(220, 14%, 96%)'
                                        : 'transparent',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer',
                                    transition: 'background-color 0.1s'
                                }}
                                onMouseEnter={(e) => {
                                    if (template.id !== currentPromptId) {
                                        e.currentTarget.style.backgroundColor = 'hsl(220, 14%, 98%)'
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (template.id !== currentPromptId) {
                                        e.currentTarget.style.backgroundColor = 'transparent'
                                    }
                                }}
                            >
                                <span
                                    style={{
                                        padding: '2px 8px',
                                        borderRadius: '9999px',
                                        fontSize: '11px',
                                        fontWeight: 500,
                                        backgroundColor: catStyle.bg,
                                        color: catStyle.color
                                    }}
                                >
                                    {displayCategory}
                                </span>
                            </button>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
