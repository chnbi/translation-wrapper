
import React from 'react'
import { Check, CheckSquare, Square, ArrowUpDown } from 'lucide-react'

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
    // Normalize selection check
    const isSelected = (id) => {
        if (Array.isArray(selectedIds)) return selectedIds.includes(id)
        if (selectedIds instanceof Set) return selectedIds.has(id)
        return false
    }

    const selectedCount = Array.isArray(selectedIds) ? selectedIds.length : selectedIds.size
    const isAllSelected = data.length > 0 && selectedCount === data.length

    return (
        <div className="rounded-2xl bg-card shadow-card overflow-visible border border-border/50">
            <div style={{ overflowX: scrollable ? 'auto' : 'visible' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: scrollable ? 'auto' : 'fixed', minWidth: scrollable ? 'max-content' : undefined }}>
                    {/* Colgroup defines fixed column widths */}
                    <colgroup>
                        {onToggleSelect && <col style={{ width: '52px' }} />}
                        {columns.map((col, idx) => (
                            <col key={idx} style={{ width: col.width || 'auto' }} />
                        ))}
                    </colgroup>
                    <thead>
                        <tr style={{ borderBottom: '1px solid hsl(220, 13%, 91%)', backgroundColor: 'hsl(220, 14%, 96%, 0.3)' }}>
                            {/* Checkbox Column */}
                            {onToggleSelect && (
                                <th style={{ padding: '14px 16px', textAlign: 'center' }}>
                                    <button
                                        onClick={onToggleSelectAll}
                                        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', cursor: 'pointer', border: 'none', background: 'none' }}
                                    >
                                        {isAllSelected ? (
                                            <CheckSquare style={{ width: '16px', height: '16px', color: 'hsl(340, 82%, 59%)' }} />
                                        ) : (
                                            <Square style={{ width: '16px', height: '16px', color: 'hsl(220, 9%, 46%, 0.4)' }} />
                                        )}
                                    </button>
                                </th>
                            )}

                            {/* Data Columns */}
                            {columns.map((col, idx) => (
                                <th
                                    key={idx}
                                    style={{
                                        padding: '14px 16px',
                                        textAlign: col.align || 'left',
                                        fontSize: '14px',
                                        fontWeight: 400,
                                        color: 'hsl(220, 9%, 46%)',
                                        cursor: col.sortable ? 'pointer' : 'default',
                                        userSelect: 'none'
                                    }}
                                    onClick={() => col.sortable && onSort && onSort(col.accessor)}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', justifyContent: col.align === 'center' ? 'center' : 'flex-start' }}>
                                        {col.header}
                                        {col.sortable && (
                                            <ArrowUpDown style={{
                                                width: '12px',
                                                height: '12px',
                                                opacity: sortConfig?.key === col.accessor ? 1 : 0.4,
                                                color: sortConfig?.key === col.accessor ? 'hsl(340, 82%, 59%)' : 'inherit'
                                            }} />
                                        )}
                                    </div>
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {data.length === 0 ? (
                            <tr>
                                <td colSpan={columns.length + (onToggleSelect ? 1 : 0)} style={{ padding: '32px', textAlign: 'center', color: 'hsl(220, 9%, 46%)' }}>
                                    No data found
                                </td>
                            </tr>
                        ) : (
                            data.map((row, rowIndex) => {
                                const selected = onToggleSelect ? isSelected(row.id) : false
                                const customStyle = getRowStyle ? getRowStyle(row) : {}
                                const bgColor = selected ? 'hsl(340, 82%, 59%, 0.05)' : (customStyle.backgroundColor || 'transparent')

                                return (
                                    <tr
                                        key={row.id || rowIndex}
                                        onClick={() => onRowClick && onRowClick(row)}
                                        style={{
                                            borderBottom: '1px solid hsl(220, 13%, 91%)',
                                            backgroundColor: bgColor,
                                            cursor: onRowClick ? 'pointer' : 'default',
                                            transition: 'background-color 0.1s',
                                            ...customStyle,
                                            // Ensure backgroundColor is handled above to avoid conflict
                                            backgroundColor: bgColor
                                        }}
                                        className={onRowClick ? "hover:bg-slate-50/50" : ""}
                                    >
                                        {/* Checkbox Cell */}
                                        {onToggleSelect && (
                                            <td style={{ padding: '14px 16px', textAlign: 'center' }}>
                                                <button
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        onToggleSelect(row.id)
                                                    }}
                                                    style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: '100%', cursor: 'pointer', border: 'none', background: 'none' }}
                                                >
                                                    {selected ? (
                                                        <CheckSquare style={{ width: '16px', height: '16px', color: 'hsl(340, 82%, 59%)' }} />
                                                    ) : (
                                                        <Square style={{ width: '16px', height: '16px', color: 'hsl(220, 9%, 46%, 0.4)' }} />
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
                                                        padding: '12px 16px',
                                                        fontSize: '14px',
                                                        textAlign: col.align || 'left',
                                                        color: col.color || 'hsl(222, 47%, 11%)'
                                                    }}
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
