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
// Central source of truth for all supported languages
// ============================================

export const LANGUAGES = {
    en: { id: 'en', code: 'en', label: 'English', nativeLabel: 'English', direction: 'ltr' },
    my: { id: 'my', code: 'my', label: 'Bahasa Malaysia', nativeLabel: 'Bahasa Malaysia', direction: 'ltr' },
    zh: { id: 'zh', code: 'zh', label: 'Simplified Chinese', nativeLabel: '简体中文', direction: 'ltr' },
    ja: { id: 'ja', code: 'ja', label: 'Japanese', nativeLabel: '日本語', direction: 'ltr' },
    ko: { id: 'ko', code: 'ko', label: 'Korean', nativeLabel: '한국어', direction: 'ltr' },
    th: { id: 'th', code: 'th', label: 'Thai', nativeLabel: 'ไทย', direction: 'ltr' },
    vi: { id: 'vi', code: 'vi', label: 'Vietnamese', nativeLabel: 'Tiếng Việt', direction: 'ltr' },
    id: { id: 'id', code: 'id', label: 'Indonesian', nativeLabel: 'Bahasa Indonesia', direction: 'ltr' },
    ar: { id: 'ar', code: 'ar', label: 'Arabic', nativeLabel: 'العربية', direction: 'rtl' },
    hi: { id: 'hi', code: 'hi', label: 'Hindi', nativeLabel: 'हिन्दी', direction: 'ltr' },
    fr: { id: 'fr', code: 'fr', label: 'French', nativeLabel: 'Français', direction: 'ltr' },
    de: { id: 'de', code: 'de', label: 'German', nativeLabel: 'Deutsch', direction: 'ltr' },
    es: { id: 'es', code: 'es', label: 'Spanish', nativeLabel: 'Español', direction: 'ltr' },
    pt: { id: 'pt', code: 'pt', label: 'Portuguese', nativeLabel: 'Português', direction: 'ltr' },
    tl: { id: 'tl', code: 'tl', label: 'Filipino', nativeLabel: 'Filipino', direction: 'ltr' },
}

// Default source language (can be overridden per project)
export const DEFAULT_SOURCE_LANGUAGE = 'en'

// Default target languages for new projects
export const DEFAULT_TARGET_LANGUAGES = ['my', 'zh']

// Get all language codes as array
export const getLanguageCodes = () => Object.keys(LANGUAGES)

// Get languages as array for dropdowns
export const getLanguagesArray = () => Object.values(LANGUAGES)

// Get language label by code
export const getLanguageLabel = (code) => {
    return LANGUAGES[code]?.label || code
}

// Get native label by code (for display in that language)
export const getNativeLabel = (code) => {
    return LANGUAGES[code]?.nativeLabel || LANGUAGES[code]?.label || code
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
}

// ============================================
// COLORS - Single Source of Truth
// All colors used across the application
// ============================================

export const COLORS = {
    // === CORE COLORS ===
    core: {
        fuchsia: '#FF0084',       // Primary brand color
        blue: '#5174FF',          // Blue accent
        spaceCadet: '#1C2541',    // Dark navy
        black: '#0D0D0D',
        white: '#FFFFFF',
    },

    // === ACCENT COLORS ===
    accents: {
        aquamarine: '#76E5E0',
        jasmine: '#F9E784',
        salmon: '#FFA69E',
        yorkieBlue: '#82A3CC',
    },

    // === BASE COLORS (Light Mode) ===
    light: {
        paperWhite: '#F9F9F9',    // Main background
        ghostwater: '#F1F1F3',    // Card backgrounds
        lightGrey: '#E5E6EB',     // Subtle backgrounds
        darkGrey: '#B4B6C1',      // Muted elements
    },

    // === BASE COLORS (Dark Mode) ===
    dark: {
        paperWhite: '#1A1A24',    // Main background
        ghostwater: '#252532',    // Card backgrounds
        lightGrey: '#32323E',     // Subtle backgrounds
        darkGrey: '#47475A',      // Muted elements
        black: '#0A0A0F',         // Deepest black
    },

    // === STROKE COLORS ===
    stroke: {
        light: {
            strokeGrey: '#E5E6EB',
            midGrey: '#D1D2D9',
        },
        dark: {
            strokeGrey: '#32323E',
            midGrey: '#47475A',
        },
    },

    // === CONTENT/TEXT COLORS ===
    content: {
        light: {
            black: '#0D0D0D',
            darkGrey: '#52535E',
            midGrey: '#7E7F8A',
            lightGrey: '#B4B6C1',
            white: '#FFFFFF',
        },
        dark: {
            white: '#FFFFFF',
            lightGrey: '#B4B6C1',
            midGrey: '#7E7F8A',
            darkGrey: '#52535E',
            black: '#0D0D0D',
        },
    },

    // === STATE COLORS ===
    states: {
        positive: {
            DEFAULT: '#10B981',   // Emerald-500
            hover: '#059669',     // Darker
            light: '#D1FAE5',     // Light background
        },
        warning: {
            DEFAULT: '#F59E0B',   // Amber-500
            hover: '#D97706',     // Darker
            light: '#FEF3C7',     // Light background
        },
        negative: {
            DEFAULT: '#EF4444',   // Red-500
            hover: '#DC2626',     // Darker
            light: '#FEE2E2',     // Light background
        },
    },

    // === PINK SYSTEM (Brand Primary) ===
    pink: {
        fuchsia: '#FF0084',       // Primary pink (buttons, highlights)
        fuchsiaHover: '#E60077',  // Hover state
        secondary: '#FF4AA7',     // Secondary pink
        medium: '#FF85C0',        // Medium pink (icons, accents)
        light: '#FFB9DD',         // Light pink (backgrounds, tags)
        lightest: '#FFE5EC',      // Lightest pink (subtle backgrounds)
        pressed: '#CC006A',       // Pressed/active state
    },

    // === BUTTON COLORS ===
    buttons: {
        primary: {
            DEFAULT: '#FF0084',
            hover: '#E60077',
            pressed: '#CC006A',
        },
        secondary: {
            DEFAULT: '#F9F9F9',
            hover: '#E5E6EB',
            pressed: '#D1D2D9',
        },
        tertiary: {
            DEFAULT: 'transparent',
            hover: '#FFE5EC',
            pressed: '#FFB9DD',
        },
    },

    // === SEMANTIC ALIASES ===
    // Use these in components for consistent theming
    primary: '#FF0084',
    primaryHover: '#E60077',
    primaryLight: '#FFB9DD',
    primaryLightest: '#FFE5EC',

    textPrimary: '#0D0D0D',
    textSecondary: '#52535E',
    textMuted: '#7E7F8A',

    border: '#E5E6EB',
    background: '#F9F9F9',
    surface: '#FFFFFF',
}

// Helper to get color with optional opacity
export const getColor = (colorPath, opacity = 1) => {
    const parts = colorPath.split('.')
    let value = COLORS
    for (const part of parts) {
        value = value?.[part]
    }
    if (!value || typeof value !== 'string') return colorPath
    if (opacity === 1) return value
    // Convert hex to rgba
    const hex = value.replace('#', '')
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)
    return `rgba(${r}, ${g}, ${b}, ${opacity})`
}
