// Shared UI Components - Concise & Clean
// All colors are defined in constants.js - use COLORS or Tailwind classes

import React from 'react'
import { Button } from "./button"
import { COLORS } from '@/lib/constants'

// ============================================
// CONSTANTS
// ============================================

export const PROJECT_THEMES = [
    { id: 'pink', color: COLORS.pink.lightest, border: COLORS.pink.light, iconColor: COLORS.pink.fuchsia },
    { id: 'orange', color: '#FFF0E5', border: '#FFDAB9', iconColor: '#F97316' },
    { id: 'yellow', color: COLORS.accents.jasmine + '20', border: COLORS.accents.jasmine, iconColor: '#CA8A04' },
    { id: 'mint', color: '#E5F9F6', border: '#A7F3D0', iconColor: COLORS.states.positive.DEFAULT },
    { id: 'cyan', color: '#E5F6FF', border: '#BAE6FD', iconColor: '#0891B2' },
    { id: 'purple', color: '#F3E5FF', border: '#D8B4FE', iconColor: '#7C3AED' },
]

// Re-export COLORS for backward compatibility
export { COLORS }

// ============================================
// FORM COMPONENTS
// ============================================

export function FormField({ label, required, children, className }) {
    return (
        <div className={`mb-6 ${className || ''}`}>
            <label className="block text-sm font-medium text-foreground mb-2">
                {label} {required && <span className="text-primary">*</span>}
            </label>
            {children}
        </div>
    )
}

export function TextInput({ className, ...props }) {
    return (
        <input
            type="text"
            className={`w-full px-4 py-3 text-sm rounded-xl border border-border bg-background outline-none focus:ring-2 focus:ring-primary/20 ${className || ''}`}
            {...props}
        />
    )
}

// ============================================
// BUTTON COMPONENTS
// ============================================

export function PrimaryButton({ children, onClick, disabled, type = 'button', style, className }) {
    return (
        <Button type={type} onClick={onClick} disabled={disabled} style={style} className={className}>
            {children}
        </Button>
    )
}

export function SecondaryButton({ children, onClick, type = 'button', style, className }) {
    return (
        <Button variant="outline" type={type} onClick={onClick} style={style} className={className}>
            {children}
        </Button>
    )
}

export function IconButton({ children, onClick, title, className }) {
    return (
        <Button variant="ghost" size="icon" onClick={onClick} title={title} className={`h-8 w-8 ${className || ''}`}>
            {children}
        </Button>
    )
}

export function PillButton({ children, onClick, disabled, variant = 'outline', style, className, type = 'button' }) {
    return (
        <Button
            type={type}
            variant={variant === 'outline' ? 'outline' : 'default'}
            onClick={onClick}
            disabled={disabled}
            style={style}
            className={`rounded-full h-8 px-4 font-normal ${className || ''}`}
        >
            {children}
        </Button>
    )
}

// ============================================
// MODAL COMPONENTS
// ============================================

export function ModalOverlay({ children, onClose }) {
    return (
        <div
            className="fixed inset-0 bg-black/30 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={(e) => e.target === e.currentTarget && onClose?.()}
        >
            {children}
        </div>
    )
}

export function ModalContent({ children, maxWidth = '560px' }) {
    return (
        <div
            className="bg-background rounded-3xl p-10 w-full shadow-2xl"
            style={{ maxWidth }}
        >
            {children}
        </div>
    )
}

export function ModalHeader({ title, onClose }) {
    return (
        <div className="flex items-start justify-between mb-6">
            <h2 className="text-2xl font-bold text-foreground px-2">
                {title}
            </h2>
            {onClose && (
                <IconButton onClick={onClose}>
                    <span className="text-lg">×</span>
                </IconButton>
            )}
        </div>
    )
}

// ============================================
// TAG COMPONENTS
// ============================================

export function RemovableTag({ label, onRemove }) {
    return (
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-muted text-sm text-foreground">
            {label}
            <button
                type="button"
                onClick={onRemove}
                className="w-4 h-4 flex items-center justify-center rounded-full hover:bg-foreground/10"
            >
                ×
            </button>
        </span>
    )
}

export function TagContainer({ children }) {
    return (
        <div className="flex flex-wrap gap-2 p-3 rounded-xl border border-border min-h-12 items-center">
            {children}
        </div>
    )
}

// ============================================
// TABLE COMPONENTS
// ============================================

export function TableActionButton({ children, onClick, title }) {
    return (
        <button
            onClick={onClick}
            title={title}
            className="flex items-center justify-center w-6 h-6 rounded bg-transparent cursor-pointer text-muted-foreground hover:text-foreground hover:bg-muted"
        >
            {children}
        </button>
    )
}

// ============================================
// DROPDOWN COMPONENTS
// ============================================

export function SelectDropdown({ value, onChange, options, placeholder, className }) {
    return (
        <div className={`relative ${className || ''}`}>
            <select
                value={value}
                onChange={onChange}
                className="w-full h-11 px-4 pr-10 text-sm rounded-xl border border-border bg-background outline-none cursor-pointer appearance-none"
            >
                {placeholder && <option value="">{placeholder}</option>}
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
            <div className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-muted-foreground">
                    <path d="M6 9l6 6 6-6" />
                </svg>
            </div>
        </div>
    )
}
