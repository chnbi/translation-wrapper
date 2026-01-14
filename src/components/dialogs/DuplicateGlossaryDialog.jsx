// DuplicateGlossaryDialog - Dialog for handling duplicate glossary entries
import { useState } from 'react'
import { X, AlertTriangle, Check, Square, CheckSquare } from 'lucide-react'
import {
    ModalOverlay,
    ModalContent,
    PrimaryButton,
    SecondaryButton,
    IconButton,
} from '@/components/ui/shared'

/**
 * Dialog to handle duplicate glossary entries during import
 * @param {boolean} isOpen - Whether the dialog is open
 * @param {function} onClose - Close handler
 * @param {Array} duplicates - Array of duplicate entries: { new: {english, malay, chinese}, existing: {id, english, malay, chinese} }
 * @param {function} onResolve - Callback with resolution: { overrides: [ids], ignores: [ids] }
 */
export function DuplicateGlossaryDialog({ isOpen, onClose, duplicates = [], onResolve }) {
    const [selectedIds, setSelectedIds] = useState(new Set())
    const [action, setAction] = useState('override') // 'override' or 'ignore'

    if (!isOpen || duplicates.length === 0) return null

    const toggleSelect = (id) => {
        setSelectedIds(prev => {
            const next = new Set(prev)
            if (next.has(id)) {
                next.delete(id)
            } else {
                next.add(id)
            }
            return next
        })
    }

    const toggleSelectAll = () => {
        if (selectedIds.size === duplicates.length) {
            setSelectedIds(new Set())
        } else {
            setSelectedIds(new Set(duplicates.map(d => d.existing.id)))
        }
    }

    const handleApply = () => {
        const selectedArray = Array.from(selectedIds)
        if (action === 'override') {
            onResolve({ overrides: selectedArray, ignores: [] })
        } else {
            onResolve({ overrides: [], ignores: selectedArray })
        }
        onClose()
    }

    const isAllSelected = selectedIds.size === duplicates.length

    return (
        <ModalOverlay onClose={onClose}>
            <ModalContent maxWidth="640px">
                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '16px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '12px',
                            backgroundColor: 'hsl(45, 93%, 47%, 0.1)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}>
                            <AlertTriangle style={{ width: '20px', height: '20px', color: 'hsl(45, 93%, 47%)' }} />
                        </div>
                        <div>
                            <h2 style={{
                                fontSize: '18px',
                                fontWeight: 600,
                                color: 'hsl(222, 47%, 11%)',
                                marginBottom: '2px'
                            }}>
                                Duplicate Entries Found
                            </h2>
                            <p style={{ fontSize: '14px', color: 'hsl(220, 9%, 46%)' }}>
                                {duplicates.length} item(s) have matching entries in the glossary
                            </p>
                        </div>
                    </div>
                    <IconButton onClick={onClose}>
                        <X style={{ width: '20px', height: '20px' }} />
                    </IconButton>
                </div>

                {/* Divider */}
                <div style={{ height: '1px', backgroundColor: 'hsl(220, 13%, 91%)', margin: '16px 0' }} />

                {/* Action Selection */}
                <div style={{ marginBottom: '16px' }}>
                    <p style={{ fontSize: '14px', fontWeight: 500, color: 'hsl(220, 9%, 46%)', marginBottom: '8px' }}>
                        What would you like to do with selected items?
                    </p>
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <button
                            onClick={() => setAction('override')}
                            style={{
                                flex: 1,
                                padding: '12px',
                                borderRadius: '12px',
                                border: action === 'override' ? '2px solid hsl(340, 82%, 59%)' : '1px solid hsl(220, 13%, 91%)',
                                backgroundColor: action === 'override' ? 'hsl(340, 82%, 59%, 0.05)' : 'white',
                                cursor: 'pointer',
                                textAlign: 'left',
                            }}
                        >
                            <div style={{ fontSize: '14px', fontWeight: 500, color: 'hsl(222, 47%, 11%)' }}>
                                Override existing
                            </div>
                            <div style={{ fontSize: '12px', color: 'hsl(220, 9%, 46%)' }}>
                                Replace old entries with new ones
                            </div>
                        </button>
                        <button
                            onClick={() => setAction('ignore')}
                            style={{
                                flex: 1,
                                padding: '12px',
                                borderRadius: '12px',
                                border: action === 'ignore' ? '2px solid hsl(340, 82%, 59%)' : '1px solid hsl(220, 13%, 91%)',
                                backgroundColor: action === 'ignore' ? 'hsl(340, 82%, 59%, 0.05)' : 'white',
                                cursor: 'pointer',
                                textAlign: 'left',
                            }}
                        >
                            <div style={{ fontSize: '14px', fontWeight: 500, color: 'hsl(222, 47%, 11%)' }}>
                                Ignore new entries
                            </div>
                            <div style={{ fontSize: '12px', color: 'hsl(220, 9%, 46%)' }}>
                                Keep existing entries unchanged
                            </div>
                        </button>
                    </div>
                </div>

                {/* Duplicate List */}
                <div style={{
                    maxHeight: '300px',
                    overflowY: 'auto',
                    border: '1px solid hsl(220, 13%, 91%)',
                    borderRadius: '12px'
                }}>
                    {/* Select All Header */}
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px',
                        padding: '12px 16px',
                        backgroundColor: 'hsl(220, 14%, 96%)',
                        borderBottom: '1px solid hsl(220, 13%, 91%)',
                    }}>
                        <button
                            onClick={toggleSelectAll}
                            style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex' }}
                        >
                            {isAllSelected ? (
                                <CheckSquare style={{ width: '16px', height: '16px', color: 'hsl(340, 82%, 59%)' }} />
                            ) : (
                                <Square style={{ width: '16px', height: '16px', color: 'hsl(220, 9%, 46%)' }} />
                            )}
                        </button>
                        <span style={{ fontSize: '13px', fontWeight: 500, color: 'hsl(220, 9%, 46%)' }}>
                            Select All ({selectedIds.size}/{duplicates.length})
                        </span>
                    </div>

                    {/* Duplicate Items */}
                    {duplicates.map((dup, idx) => (
                        <div
                            key={dup.existing.id || idx}
                            style={{
                                display: 'flex',
                                alignItems: 'flex-start',
                                gap: '12px',
                                padding: '12px 16px',
                                borderBottom: idx < duplicates.length - 1 ? '1px solid hsl(220, 13%, 91%)' : 'none',
                                backgroundColor: selectedIds.has(dup.existing.id) ? 'hsl(340, 82%, 59%, 0.03)' : 'transparent'
                            }}
                        >
                            <button
                                onClick={() => toggleSelect(dup.existing.id)}
                                style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', marginTop: '2px' }}
                            >
                                {selectedIds.has(dup.existing.id) ? (
                                    <CheckSquare style={{ width: '16px', height: '16px', color: 'hsl(340, 82%, 59%)' }} />
                                ) : (
                                    <Square style={{ width: '16px', height: '16px', color: 'hsl(220, 9%, 46%)' }} />
                                )}
                            </button>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ fontSize: '14px', fontWeight: 500, color: 'hsl(222, 47%, 11%)', marginBottom: '4px' }}>
                                    {dup.new.english || dup.new.malay || dup.new.chinese}
                                </div>
                                <div style={{ fontSize: '12px', color: 'hsl(220, 9%, 46%)' }}>
                                    Matched on: {dup.matchedField} — Existing: "{dup.existing[dup.matchedField]}"
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                {/* Actions */}
                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '12px', marginTop: '24px' }}>
                    <SecondaryButton onClick={onClose}>
                        Cancel
                    </SecondaryButton>
                    <PrimaryButton
                        onClick={handleApply}
                        disabled={selectedIds.size === 0}
                    >
                        Apply to {selectedIds.size} selected
                    </PrimaryButton>
                </div>
            </ModalContent>
        </ModalOverlay>
    )
}
