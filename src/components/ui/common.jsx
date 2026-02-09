// Reusable UI Components - Quick Wins
// These components extract common patterns from pages for consistency and reuse

import React from 'react'
import { Search } from 'lucide-react'
import { COLORS } from '@/lib/constants'

// ============================================
// PAGE HEADER
// ============================================

/**
 * Consistent page title styling
 * @example <PageHeader>Dashboard</PageHeader>
 */
export function PageHeader({ children, description, actions, className = '' }) {
    return (
        <div className={`flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 ${className}`}>
            <div>
                <h1 className="text-3xl font-bold tracking-tight text-foreground">
                    {children}
                </h1>
                {description && (
                    <p className="text-muted-foreground mt-2 text-base">
                        {description}
                    </p>
                )}
            </div>
            {actions && (
                <div className="flex items-center gap-2">
                    {actions}
                </div>
            )}
        </div>
    )
}

// ============================================
// SEARCH INPUT
// ============================================

/**
 * Search input with icon
 * @example <SearchInput value={query} onChange={setQuery} placeholder="Search..." />
 */
export function SearchInput({
    value,
    onChange,
    placeholder = 'Search...',
    width = '200px',
    style = {}
}) {
    return (
        <div style={{ position: 'relative', width, ...style }}>
            <Search
                style={{
                    position: 'absolute',
                    left: '12px',
                    top: '50%',
                    transform: 'translateY(-50%)',
                    width: '16px',
                    height: '16px',
                    color: 'hsl(220, 9%, 46%)'
                }}
            />
            <input
                type="text"
                placeholder={placeholder}
                value={value}
                onChange={(e) => onChange(e.target.value)}
                style={{
                    borderRadius: '12px',
                    height: '36px',
                    width: '100%',
                    fontSize: '14px',
                    padding: '0 12px 0 36px',
                    border: '1px solid hsl(220, 13%, 91%)',
                    outline: 'none',
                    backgroundColor: 'white'
                }}
            />
        </div>
    )
}

// ============================================
// STATUS DOT
// ============================================

const STATUS_COLORS = {
    draft: COLORS.light.darkGrey,      // gray
    pending: COLORS.light.darkGrey,    // gray
    review: COLORS.warning,            // amber
    completed: COLORS.positive,        // green
    done: COLORS.positive,             // green
    approved: COLORS.positive,         // green
    error: COLORS.negative,            // red
    rejected: COLORS.negative,         // red
}

const STATUS_LABELS = {
    draft: 'Draft',
    pending: 'Draft',
    review: 'review',
    completed: 'Done',
    done: 'Done',
    approved: 'Approved',
    error: 'Error',
    rejected: 'Rejected',
}

/**
 * Small colored dot with status label
 * @example <StatusDot status="review" />
 */
export function StatusDot({ status, showLabel = true, size = 6 }) {
    const color = STATUS_COLORS[status] || STATUS_COLORS.draft
    const label = STATUS_LABELS[status] || status || 'Draft'

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <span
                style={{
                    width: `${size}px`,
                    height: `${size}px`,
                    borderRadius: '50%',
                    backgroundColor: color
                }}
            />
            {showLabel && (
                <span style={{ fontSize: '14px', color: 'hsl(220, 9%, 46%)' }}>
                    {label}
                </span>
            )}
        </div>
    )
}

// ============================================
// CATEGORY FILTER TABS
// ============================================

/**
 * Pill-style category filter tabs
 * @example
 * <CategoryFilterTabs
 *   categories={['All', 'Marketing', 'Legal']}
 *   active="All"
 *   onChange={setActive}
 * />
 */
export function CategoryFilterTabs({ categories, active, onChange }) {
    return (
        <div
            style={{
                display: 'flex',
                gap: '8px',
                marginBottom: '16px',
                overflowX: 'auto',
                paddingBottom: '4px'
            }}
        >
            {categories.map((category) => (
                <button
                    key={category}
                    onClick={() => onChange(category)}
                    style={{
                        padding: '8px 16px',
                        borderRadius: '9999px',
                        fontSize: '13px',
                        fontWeight: 500,
                        border: 'none',
                        cursor: 'pointer',
                        whiteSpace: 'nowrap',
                        backgroundColor: active === category
                            ? 'hsl(340, 82%, 59%)'
                            : 'hsl(220, 14%, 96%)',
                        color: active === category
                            ? 'white'
                            : 'hsl(220, 9%, 46%)',
                        transition: 'all 0.15s'
                    }}
                >
                    {category}
                </button>
            ))}
        </div>
    )
}

