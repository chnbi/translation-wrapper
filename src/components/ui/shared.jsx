// Shared UI Components matching Figma design system
// These components provide consistent styling across the application

import React from 'react'

// ============================================
// STYLE CONSTANTS - Figma Design Tokens
// ============================================

export const COLORS = {
    primary: '#EC407A',
    primaryHover: '#D81B60',
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
export function TextInput({ placeholder, value, onChange, required, ...props }) {
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
            }}
            {...props}
        />
    )
}

// ============================================
// BUTTON COMPONENTS
// ============================================

// Primary button (pink CTA)
export function PrimaryButton({ children, onClick, disabled, type = 'button', style }) {
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '10px 24px',
                fontSize: '12px',
                fontWeight: 600,
                borderRadius: RADIUS.full,
                border: 'none',
                backgroundColor: disabled ? COLORS.border : COLORS.primary,
                color: disabled ? COLORS.textSecondary : COLORS.white,
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'background-color 0.2s',
                ...style,
            }}
        >
            {children}
        </button>
    )
}

// Secondary/outline button
export function SecondaryButton({ children, onClick, type = 'button', style }) {
    return (
        <button
            type={type}
            onClick={onClick}
            style={{
                padding: '10px 24px',
                fontSize: '14px',
                fontWeight: 500,
                borderRadius: RADIUS.full,
                border: `1px solid ${COLORS.border}`,
                backgroundColor: COLORS.white,
                cursor: 'pointer',
                color: COLORS.black,
                transition: 'background-color 0.2s',
                ...style,
            }}
        >
            {children}
        </button>
    )
}

// Icon button (transparent background)
export function IconButton({ children, onClick, title, style }) {
    return (
        <button
            onClick={onClick}
            title={title}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                border: 'none',
                backgroundColor: 'transparent',
                cursor: 'pointer',
                color: COLORS.black,
                ...style,
            }}
        >
            {children}
        </button>
    )
}

// Pill button for action bar
export function PillButton({ children, onClick, disabled, variant = 'outline', style }) {
    const isOutline = variant === 'outline'
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                borderRadius: RADIUS.full,
                height: '32px',
                padding: '0 16px',
                fontSize: '14px',
                fontWeight: 400,
                border: isOutline ? `1px solid ${COLORS.border}` : 'none',
                backgroundColor: isOutline ? COLORS.white : COLORS.primary,
                color: isOutline ? COLORS.black : COLORS.white,
                cursor: disabled ? 'not-allowed' : 'pointer',
                ...style,
            }}
        >
            {children}
        </button>
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
