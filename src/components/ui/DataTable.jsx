
import React from 'react'
import { Check, CheckSquare, Square, ArrowUpDown } from 'lucide-react'

// ==========================================
// STANDARDIZED TABLE STYLES (Figma-based)
// Export for use in other components like Quick Check
// ==========================================
// ==========================================
// STANDARDIZED TABLE STYLES (Figma-based)
// ==========================================
export const TABLE_STYLES = {
    // Container
    container: 'rounded-2xl bg-white dark:bg-slate-900 overflow-hidden border border-gray-100 dark:border-slate-800',

    // Padding values (kept for style props that need strict values)
    cellPaddingX: '12px',
    cellPaddingY: '12px',
    headerPaddingY: '14px',
    checkboxColumnWidth: '52px',

    // Tailwind Classes equivalents for direct use
    fontSize: '13px', // Single source of truth for font size
    textClass: 'text-[13px]',
    headerClass: 'px-4 py-3.5 text-left text-[13px] font-medium text-muted-foreground select-none',
    cellClass: 'px-3 py-3 text-[13px] text-foreground',

    // Colors (CSS Variables preferred for proper theme support)
    borderColor: 'var(--border)',
    primaryColor: 'hsl(var(--primary))',
    mutedColor: 'hsl(var(--muted-foreground))',

    get headerPadding() { return `${this.headerPaddingY} ${this.cellPaddingX}` },
    get cellPadding() { return `${this.cellPaddingY} ${this.cellPaddingX}` },
}

/**
 * Reusable Data Table Component
 * Enforces consistent styling, checkbox widths, and interaction patterns across the app.
 * 
 * @param {Array} columns - Column definitions: { header: string, accessor: string|func, width: string, minWidth: string, align: 'left'|'center'|'right', render: func }
 * @param {Array} data - Array of data objects
 * @param {Set|Array} selectedIds - Set or Array of selected row IDs
 * @param {Function} onToggleSelect - Handler for row selection toggle (id) => void
 * @param {Function} onToggleSelectAll - Handler for select all () => void
 * @param {Function} onRowClick - Optional handler for row click (row) => void
 * @param {Object} sortConfig - Optional sort config { key, direction }
 * @param {Function} onSort - Optional sort handler (key) => void
 * @param {Boolean} scrollable - If true, table is horizontally scrollable with minWidth columns
 */
export function DataTable({
    columns = [],
    data = [],
    selectedIds = new Set(), // Can accept Set or Array, normalized internally
    onToggleSelect,
    onToggleSelectAll,
    onRowClick,
    sortConfig,
    onSort,
    scrollable = false,
    getRowStyle,
    children
}) {
    // Refs for drag detection
    const mouseDownPos = React.useRef({ x: 0, y: 0 })
    const isDragging = React.useRef(false)

    // Normalize selection check
    const isSelected = (id) => {
        if (Array.isArray(selectedIds)) return selectedIds.includes(id)
        if (selectedIds instanceof Set) return selectedIds.has(id)
        return false
    }

    const selectedCount = Array.isArray(selectedIds) ? selectedIds.length : selectedIds.size
    const isAllSelected = data.length > 0 && selectedCount === data.length

    return (
        <div className={TABLE_STYLES.container}>
            <div style={{ overflowX: scrollable ? 'auto' : 'visible' }}>
                <table className="w-full border-collapse" style={{ tableLayout: scrollable ? 'auto' : 'fixed', minWidth: scrollable ? 'max-content' : undefined }}>
                    {/* Colgroup defines fixed column widths */}
                    <colgroup>
                        {onToggleSelect && <col style={{ width: TABLE_STYLES.checkboxColumnWidth }} />}
                        {columns.map((col, idx) => (
                            <col key={idx} style={{ width: col.width || 'auto' }} />
                        ))}
                    </colgroup>
                    <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-gray-100 dark:border-slate-800">
                        <tr>
                            {/* Checkbox Column */}
                            {onToggleSelect && (
                                <th style={{ padding: TABLE_STYLES.headerPadding, textAlign: 'center' }} className="first:rounded-tl-xl last:rounded-tr-xl">
                                    <button
                                        onClick={onToggleSelectAll}
                                        className="flex items-center justify-center w-full cursor-pointer border-none bg-transparent"
                                    >
                                        {isAllSelected ? (
                                            <CheckSquare className="w-4 h-4 text-primary" />
                                        ) : (
                                            <Square className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                                        )}
                                    </button>
                                </th>
                            )}

                            {/* Data Columns */}
                            {columns.map((col, idx) => (
                                <th
                                    key={idx}
                                    className="first:rounded-tl-xl last:rounded-tr-xl text-xs font-medium text-slate-500 dark:text-slate-400 select-none"
                                    style={{
                                        padding: TABLE_STYLES.headerPadding,
                                        textAlign: col.align || 'left',
                                        cursor: col.sortable ? 'pointer' : 'default',
                                    }}
                                    onClick={() => col.sortable && onSort && onSort(col.accessor)}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: col.align === 'center' ? 'center' : 'flex-start' }}>
                                        {col.header}
                                        {col.sortable && (
                                            <ArrowUpDown
                                                className={`w-3 h-3 ${sortConfig?.key === col.accessor ? 'text-primary opacity-100' : 'text-slate-400 opacity-40'}`}
                                            />
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-slate-800">
                        {data.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length + (onToggleSelect ? 1 : 0)} className="p-8 text-center text-slate-500 dark:text-slate-400">
                                    No data found
                                </td>
                            </tr>
                        ) : (
                            data.map((row, rowIndex) => {
                                const selected = onToggleSelect ? isSelected(row.id) : false
                                const customStyle = getRowStyle ? getRowStyle(row) : {}

                                return (
                                    <tr
                                        key={row.id || rowIndex}
                                        onMouseDown={(e) => {
                                            mouseDownPos.current = { x: e.clientX, y: e.clientY }
                                            isDragging.current = false
                                        }}
                                        onMouseMove={(e) => {
                                            if (!mouseDownPos.current) return
                                            const distance = Math.sqrt(
                                                Math.pow(e.clientX - mouseDownPos.current.x, 2) +
                                                Math.pow(e.clientY - mouseDownPos.current.y, 2)
                                            )
                                            if (distance > 5) {
                                                isDragging.current = true
                                            }
                                        }}
                                        onClick={(e) => {
                                            if (isDragging.current) {
                                                e.preventDefault()
                                                e.stopPropagation()
                                                return
                                            }
                                            onRowClick && onRowClick(row)
                                        }}
                                        className={`transition-colors text-slate-900 dark:text-slate-100 ${selected ? 'bg-primary/5 dark:bg-primary/10' : 'bg-transparent'
                                            } ${onRowClick ? "cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-800/50" : ""}`}
                                        style={customStyle}
                                    >
                                        {/* Checkbox Cell */}
                                        {onToggleSelect && (
                                            <td style={{ padding: TABLE_STYLES.cellPadding, textAlign: 'center' }}>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        onToggleSelect(row.id)
                                                    }}
                                                    className="flex items-center justify-center w-full cursor-pointer border-none bg-transparent"
                                                >
                                                    {selected ? (
                                                        <CheckSquare className="w-4 h-4 text-primary" />
                                                    ) : (
                                                        <Square className="w-4 h-4 text-slate-400 dark:text-slate-500" />
                                                    )}
                                                </button>
                                            </td>
                                        )}

                                        {/* Data Cells */}
                                        {columns.map((col, colIdx) => {
                                            let cellContent = row[col.accessor]
                                            if (col.render) {
                                                cellContent = col.render(row)
                                            }

                                            return (
                                                <td
                                                    key={colIdx}
                                                    style={{
                                                        padding: TABLE_STYLES.cellPadding,
                                                        fontSize: TABLE_STYLES.fontSize,
                                                        textAlign: col.align || 'left',
                                                        color: col.color
                                                    }}
                                                    className={!col.color ? 'text-slate-700 dark:text-slate-200' : ''}
                                                >
                                                    {cellContent}
                                                </td>
                                            )
                                        })}
                                    </tr>
                                )
                            })
                        )}
                        {children}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
