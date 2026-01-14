// Shared UI Components matching Figma design system
// These components provide consistent styling across the application

import React from 'react'

// ============================================
// STYLE CONSTANTS - Figma Design Tokens
// ============================================

export const COLORS = {
    // New Pink Color System (from CSS variables)
    primary: '#FF0084',        // Main brand pink - hsl(329, 100%, 50%)
    primaryHover: '#E60077',   // Darker for hover
    secondary: '#FF4AA7',      // Secondary pink - hsl(329, 100%, 65%)
    light: '#FFB9DD',          // Light pink - hsl(329, 100%, 86%)
    border: 'hsl(220, 13%, 91%)',
    textPrimary: 'hsl(222, 47%, 11%)',
    textSecondary: 'hsl(220, 9%, 46%)',
    backgroundLight: 'hsl(220, 14%, 96%)',
    white: '#FFFFFF',
    black: '#1C1C1C',
    tagBackground: '#E5ECF6',
}

export const RADIUS = {
    sm: '6px',
    md: '12px',
    lg: '24px',
    full: '9999px',
}

// Project Themes (Pastel backgrounds with matching icons)
export const PROJECT_THEMES = [
    { id: 'pink', color: '#FFE5EC', border: '#FFB6C1', iconColor: '#EC4899' },
    { id: 'orange', color: '#FFF0E5', border: '#FFDAB9', iconColor: '#F97316' },
    { id: 'yellow', color: '#FFFDE7', border: '#FFF59D', iconColor: '#CA8A04' },
    { id: 'mint', color: '#E5F9F6', border: '#A7F3D0', iconColor: '#059669' },
    { id: 'cyan', color: '#E5F6FF', border: '#BAE6FD', iconColor: '#0891B2' },
    { id: 'purple', color: '#F3E5FF', border: '#D8B4FE', iconColor: '#7C3AED' },
]

// ============================================
// FORM COMPONENTS
// ============================================

// Form Field wrapper with label
export function FormField({ label, required, children, style }) {
    return (
        <div style={{ marginBottom: '24px', ...style }}>
            <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: 500,
                color: COLORS.black,
                marginBottom: '8px'
            }}>
                {label} {required && <span style={{ color: COLORS.primary }}>*</span>}
            </label>
            {children}
        </div>
    )
}

// Standard text input
export function TextInput({ placeholder, value, onChange, required, style, ...props }) {
    return (
        <input
            type="text"
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            required={required}
            style={{
                width: '100%',
                padding: '12px 16px',
                fontSize: '14px',
                borderRadius: RADIUS.md,
                border: `1px solid ${COLORS.border}`,
                outline: 'none',
                backgroundColor: COLORS.white,
                boxSizing: 'border-box',
                ...style, // Merge user provided style last
            }}
            {...props}
        />
    )
}

// ============================================
// BUTTON COMPONENTS
// ============================================

// ============================================
// BUTTON COMPONENTS
// ============================================

import { Button } from "./button"

// Primary button (pink CTA)
export function PrimaryButton({ children, onClick, disabled, type = 'button', style, className }) {
    return (
        <Button
            type={type}
            onClick={onClick}
            disabled={disabled}
            style={style}
            className={className}
        >
            {children}
        </Button>
    )
}

// Secondary/outline button
export function SecondaryButton({ children, onClick, type = 'button', style, className }) {
    return (
        <Button
            variant="outline"
            type={type}
            onClick={onClick}
            style={style}
            className={className}
        >
            {children}
        </Button>
    )
}

// Icon button (transparent background)
export function IconButton({ children, onClick, title, style, className }) {
    return (
        <Button
            variant="ghost"
            size="icon"
            onClick={onClick}
            title={title}
            style={{ width: '32px', height: '32px', ...style }}
            className={`h-8 w-8 ${className || ''}`}
        >
            {children}
        </Button>
    )
}

// Pill button for action bar
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

// Modal overlay
export function ModalOverlay({ children, onClose }) {
    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                backgroundColor: 'rgba(0, 0, 0, 0.3)',
                backdropFilter: 'blur(4px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 50,
            }}
            onClick={(e) => e.target === e.currentTarget && onClose?.()}
        >
            {children}
        </div>
    )
}

// Modal content box
export function ModalContent({ children, maxWidth = '560px' }) {
    return (
        <div
            style={{
                backgroundColor: COLORS.white,
                borderRadius: RADIUS.lg,
                padding: '40px 48px 56px',
                width: '100%',
                maxWidth,
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
            }}
        >
            {children}
        </div>
    )
}

// Modal header with title and close button
export function ModalHeader({ title, onClose }) {
    return (
        <div style={{
            display: 'flex',
            alignItems: 'flex-start',
            justifyContent: 'space-between',
            marginBottom: '24px',
        }}>
            <h2 style={{
                fontSize: '24px',
                fontWeight: 700,
                color: COLORS.black,
                padding: '4px 8px',
            }}>
                {title}
            </h2>
            {onClose && (
                <IconButton onClick={onClose}>
                    <span style={{ fontSize: '18px' }}>×</span>
                </IconButton>
            )}
        </div>
    )
}

// ============================================
// TAG COMPONENTS
// ============================================

// Removable tag (for language selection etc.)
export function RemovableTag({ label, onRemove }) {
    return (
        <span
            style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                padding: '4px 12px',
                borderRadius: RADIUS.full,
                backgroundColor: COLORS.tagBackground,
                fontSize: '14px',
                color: COLORS.black,
            }}
        >
            {label}
            <button
                type="button"
                onClick={onRemove}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    width: '16px',
                    height: '16px',
                    borderRadius: '50%',
                    border: 'none',
                    backgroundColor: 'transparent',
                    cursor: 'pointer',
                    color: COLORS.black,
                    fontSize: '14px',
                }}
            >
                ×
            </button>
        </span>
    )
}

// Tag container (for multi-select fields)
export function TagContainer({ children }) {
    return (
        <div
            style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '8px',
                padding: '12px 16px',
                borderRadius: RADIUS.md,
                border: `1px solid ${COLORS.border}`,
                minHeight: '48px',
                alignItems: 'center',
            }}
        >
            {children}
        </div>
    )
}

// ============================================
// TABLE COMPONENTS
// ============================================

// Table action icon button
export function TableActionButton({ children, onClick, title }) {
    return (
        <button
            onClick={onClick}
            title={title}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '24px',
                height: '24px',
                borderRadius: '4px',
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                color: COLORS.textSecondary,
            }}
        >
            {children}
        </button>
    )
}

// ============================================
// DROPDOWN COMPONENTS
// ============================================

// Custom styled select dropdown
export function SelectDropdown({ value, onChange, options, placeholder, style }) {
    return (
        <div style={{ position: 'relative', ...style }}>
            <select
                value={value}
                onChange={onChange}
                style={{
                    width: '100%',
                    height: '44px',
                    padding: '0 40px 0 16px',
                    fontSize: '14px',
                    borderRadius: RADIUS.md,
                    border: `1px solid ${COLORS.border}`,
                    outline: 'none',
                    backgroundColor: COLORS.white,
                    cursor: 'pointer',
                    appearance: 'none',
                    color: value ? COLORS.textPrimary : COLORS.textSecondary,
                }}
            >
                {placeholder && <option value="">{placeholder}</option>}
                {options.map(opt => (
                    <option key={opt.value} value={opt.value}>
                        {opt.label}
                    </option>
                ))}
            </select>
            {/* Chevron icon */}
            <div style={{
                position: 'absolute',
                right: '12px',
                top: '50%',
                transform: 'translateY(-50%)',
                pointerEvents: 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}>
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={COLORS.textSecondary} strokeWidth="2">
                    <path d="M6 9l6 6 6-6" />
                </svg>
            </div>
        </div>
    )
}

