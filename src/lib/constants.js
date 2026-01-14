// Centralized constants for the application
// These are shared across multiple components and pages

// ============================================
// STATUS CONFIGURATION
// Used for status badges, filters, and displays
// ============================================

export const STATUS_CONFIG = {
    // Common statuses for projects, glossary, translations
    draft: {
        id: 'draft',
        label: 'Draft',
        color: '#94a3b8',  // slate-400
    },
    review: {
        id: 'review',
        label: 'In Review',
        color: '#3b82f6',  // blue-500
    },
    approved: {
        id: 'approved',
        label: 'Approved',
        color: '#10b981',  // emerald-500
    },
    changes: {
        id: 'changes',
        label: 'Need Changes',
        color: '#ef4444',  // red-500
    },
    // Approvals-specific statuses
    pending: {
        id: 'pending',
        label: 'Pending',
        color: '#f59e0b',  // amber-500
    },
    rejected: {
        id: 'rejected',
        label: 'Rejected',
        color: '#ef4444',  // red-500
    },
    // Prompt-specific statuses
    published: {
        id: 'published',
        label: 'Published',
        color: '#10b981',  // emerald-500
    },
    // Legacy statuses for backward compatibility
    completed: {
        id: 'completed',
        label: 'Approved',
        color: '#10b981',  // Maps to approved color
    },
    error: {
        id: 'error',
        label: 'Error',
        color: '#ef4444',  // red-500
    },
}

// Helper to get status config with fallback
export const getStatusConfig = (status, fallback = 'draft') => {
    return STATUS_CONFIG[status] || STATUS_CONFIG[fallback]
}

// Status options for filter dropdowns
export const STATUS_FILTER_OPTIONS = [
    STATUS_CONFIG.draft,
    STATUS_CONFIG.review,
    STATUS_CONFIG.approved,
    STATUS_CONFIG.changes,
]

// ============================================
// LANGUAGE CONFIGURATION
// ============================================

export const LANGUAGES = {
    en: { id: 'en', code: 'en', label: 'English', nativeLabel: 'English' },
    my: { id: 'my', code: 'my', label: 'Bahasa Malaysia', nativeLabel: 'Bahasa Malaysia' },
    zh: { id: 'zh', code: 'zh', label: 'Simplified Chinese', nativeLabel: '中文' },
}

// Languages available for translation targets (excludes source language)
export const AVAILABLE_TARGET_LANGUAGES = [
    LANGUAGES.my,
    LANGUAGES.zh,
]

// Get language label by code
export const getLanguageLabel = (code) => {
    return LANGUAGES[code]?.label || code
}

// ============================================
// DESIGN TOKENS
// Centralized styling values
// ============================================

export const DESIGN_TOKENS = {
    fontSize: {
        xs: '11px',
        sm: '12px',
        md: '14px',
        lg: '16px',
        xl: '18px',
        '2xl': '24px',
    },
    radius: {
        sm: '6px',
        md: '12px',
        lg: '16px',
        xl: '24px',
        full: '9999px',
    },
    colors: {
        textPrimary: 'hsl(222, 47%, 11%)',
        textSecondary: 'hsl(220, 9%, 46%)',
        border: 'hsl(220, 13%, 91%)',
        background: 'hsl(220, 14%, 96%)',
        // New Pink Color System
        primary: '#FF0084',        // Main brand pink
        primaryHover: '#E60077',   // Darker for hover
        secondary: '#FF4AA7',      // Secondary pink (buttons)
        light: '#FFB9DD',          // Light pink (backgrounds)
    },
}
