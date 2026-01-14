// StatusBadge - Reusable status display component
// Uses centralized STATUS_CONFIG for consistent styling
import { getStatusConfig } from '@/lib/constants'

/**
 * Status badge with optional dot and label
 * @param {string} status - Status key (draft, review, approved, changes, etc.)
 * @param {boolean} showDot - Whether to show the colored dot
 * @param {boolean} showLabel - Whether to show the text label
 * @param {string} size - Size variant: 'sm' | 'md' | 'lg'
 * @param {object} style - Additional inline styles
 */
export function StatusBadge({
    status,
    showDot = true,
    showLabel = true,
    size = 'md',
    style = {}
}) {
    const config = getStatusConfig(status)

    const sizes = {
        sm: { dot: '6px', font: '11px', gap: '4px' },
        md: { dot: '8px', font: '13px', gap: '6px' },
        lg: { dot: '10px', font: '14px', gap: '8px' },
    }

    const sizeConfig = sizes[size] || sizes.md

    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: sizeConfig.gap,
            ...style
        }}>
            {showDot && (
                <span style={{
                    width: sizeConfig.dot,
                    height: sizeConfig.dot,
                    borderRadius: '50%',
                    backgroundColor: config.color,
                    flexShrink: 0,
                }} />
            )}
            {showLabel && (
                <span style={{
                    fontSize: sizeConfig.font,
                    color: config.color,
                    fontWeight: 500,
                }}>
                    {config.label}
                </span>
            )}
        </span>
    )
}

/**
 * Status pill badge (full background color)
 * @param {string} status - Status key
 * @param {string} size - Size variant
 */
export function StatusPill({ status, size = 'md' }) {
    const config = getStatusConfig(status)

    const sizes = {
        sm: { padding: '2px 8px', font: '11px' },
        md: { padding: '4px 12px', font: '12px' },
        lg: { padding: '6px 16px', font: '13px' },
    }

    const sizeConfig = sizes[size] || sizes.md

    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: sizeConfig.padding,
            borderRadius: '9999px',
            backgroundColor: `${config.color}15`, // 15 = ~8% opacity
            fontSize: sizeConfig.font,
            fontWeight: 500,
            color: config.color,
        }}>
            <span style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: config.color,
            }} />
            {config.label}
        </span>
    )
}
