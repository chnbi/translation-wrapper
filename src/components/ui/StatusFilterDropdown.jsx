// StatusFilterDropdown - Multi-selectable status filter component
import { useState, useRef, useEffect } from 'react'
import { Filter, Check, ChevronDown } from 'lucide-react'
import { PillButton } from '@/components/ui/shared'

const DEFAULT_STATUS_OPTIONS = [
    { id: 'draft', label: 'Draft', color: '#a1a1aa' },
    { id: 'review', label: 'In Review', color: '#3b82f6' },
    { id: 'approved', label: 'Approved', color: '#10b981' },
    { id: 'changes', label: 'Need Changes', color: '#ef4444' },
]

export function StatusFilterDropdown({ selectedStatuses = [], onStatusChange, statusOptions = DEFAULT_STATUS_OPTIONS }) {
    const [isOpen, setIsOpen] = useState(false)
    const dropdownRef = useRef(null)

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const toggleStatus = (statusId) => {
        const newStatuses = selectedStatuses.includes(statusId)
            ? selectedStatuses.filter(s => s !== statusId)
            : [...selectedStatuses, statusId]
        onStatusChange(newStatuses)
    }

    const clearAll = () => {
        onStatusChange([])
        setIsOpen(false)
    }

    const activeCount = selectedStatuses.length

    return (
        <div ref={dropdownRef} style={{ position: 'relative' }}>
            <PillButton
                variant="outline"
                type="button"
                onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    setIsOpen(!isOpen)
                }}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    backgroundColor: activeCount > 0 ? 'hsl(340, 82%, 59%, 0.1)' : undefined,
                    borderColor: activeCount > 0 ? '#FF0084' : undefined,
                    color: activeCount > 0 ? '#FF0084' : undefined,
                }}
            >
                <Filter style={{ width: '16px', height: '16px' }} />
                Filters
                {activeCount > 0 && (
                    <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: '18px',
                        height: '18px',
                        borderRadius: '9999px',
                        backgroundColor: '#FF0084',
                        color: 'white',
                        fontSize: '11px',
                        fontWeight: 600,
                        padding: '0 4px',
                    }}>
                        {activeCount}
                    </span>
                )}
                <ChevronDown style={{
                    width: '14px',
                    height: '14px',
                    transition: 'transform 0.2s',
                    transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)'
                }} />
            </PillButton>

            {isOpen && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 4px)',
                    right: 0,
                    minWidth: '200px',
                    backgroundColor: 'white',
                    border: '1px solid hsl(220, 13%, 91%)',
                    borderRadius: '12px',
                    boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
                    zIndex: 50,
                    padding: '8px 0',
                }}>
                    {/* Header */}
                    <div style={{
                        padding: '8px 16px',
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'hsl(220, 9%, 46%)',
                        borderBottom: '1px solid hsl(220, 13%, 91%)',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                    }}>
                        <span>Filter by Status</span>
                        {activeCount > 0 && (
                            <button
                                type="button"
                                onClick={(e) => {
                                    e.preventDefault()
                                    e.stopPropagation()
                                    clearAll()
                                }}
                                style={{
                                    background: 'none',
                                    border: 'none',
                                    fontSize: '11px',
                                    color: '#FF0084',
                                    cursor: 'pointer',
                                }}
                            >
                                Clear all
                            </button>
                        )}
                    </div>

                    {/* Options */}
                    {statusOptions.map(status => {
                        const isSelected = selectedStatuses.includes(status.id)
                        return (
                            <StatusOption
                                key={status.id}
                                status={status}
                                isSelected={isSelected}
                                onToggle={() => toggleStatus(status.id)}
                            />
                        )
                    })}
                </div>
            )}
        </div>
    )
}

// Separate component to avoid stale closure issues
function StatusOption({ status, isSelected, onToggle }) {
    const [isHovered, setIsHovered] = useState(false)

    const bgColor = isHovered
        ? 'hsl(220, 14%, 96%)'
        : isSelected
            ? 'hsl(340, 82%, 59%, 0.05)'
            : 'transparent'

    return (
        <button
            type="button"
            onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onToggle()
            }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '10px',
                width: '100%',
                padding: '10px 16px',
                background: bgColor,
                border: 'none',
                cursor: 'pointer',
                textAlign: 'left',
                fontSize: '14px',
                color: 'hsl(222, 47%, 11%)',
                transition: 'background-color 0.1s',
            }}
        >
            {/* Checkbox */}
            <div style={{
                width: '16px',
                height: '16px',
                borderRadius: '4px',
                border: isSelected ? 'none' : '1.5px solid hsl(220, 13%, 80%)',
                backgroundColor: isSelected ? '#FF0084' : 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                pointerEvents: 'none',
            }}>
                {isSelected && <Check style={{ width: '12px', height: '12px', color: 'white', pointerEvents: 'none' }} />}
            </div>

            {/* Status dot */}
            <span style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: status.color,
                pointerEvents: 'none',
            }} />

            {/* Label */}
            <span style={{ pointerEvents: 'none' }}>{status.label}</span>
        </button>
    )
}
