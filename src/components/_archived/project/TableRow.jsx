// TableRow - Displays translation row in table format with inline editing
import { CheckSquare, Square, Loader2 } from "lucide-react"
import { Badge } from "@/components/ui/badge"

// Status styling maps
const statusColors = {
    'completed': 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400',
    'review': 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400',
    'pending': 'bg-zinc-200 text-zinc-600 dark:bg-zinc-700 dark:text-zinc-300',
    'queued': 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-400',
    'translating': 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-400',
    'error': 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400',
}

const statusLabels = {
    'completed': 'Done',
    'review': 'Review',
    'pending': 'Pending',
    'queued': 'Queued',
    'translating': 'Translating',
    'error': 'Error',
}

export default function TableRow({
    row,
    isSelected,
    editingCell,
    editValue,
    onToggleSelection,
    onCellClick,
    onEditChange,
    onCellSave,
    onKeyDown,
}) {
    const isTranslating = row.status === 'translating'

    const EditableTableCell = ({ lang, value }) => {
        const isEditing = editingCell?.rowId === row.id && editingCell?.field === lang

        if (isEditing) {
            return (
                <input
                    autoFocus
                    value={editValue}
                    onChange={(e) => onEditChange(e.target.value)}
                    onBlur={onCellSave}
                    onKeyDown={onKeyDown}
                    className="w-full text-sm px-2 py-1 border rounded bg-background"
                />
            )
        }

        return (
            <div
                onClick={() => onCellClick(row.id, lang, value)}
                className={`text-sm cursor-text hover:bg-muted/50 px-2 py-1 rounded truncate ${!value ? 'text-muted-foreground italic' : ''}`}
            >
                {value || '—'}
            </div>
        )
    }

    return (
        <tr className={`border-b border-border/50 ${isSelected ? 'bg-primary/5' : 'hover:bg-muted/30'}`}>
            <td className="p-3 w-10">
                <button onClick={onToggleSelection} className="p-0.5">
                    {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-primary" />
                    ) : (
                        <Square className="w-4 h-4 text-muted-foreground" />
                    )}
                </button>
            </td>
            <td className="p-3 max-w-xs">
                <p className="text-sm truncate">{row.en || row.source}</p>
            </td>
            <td className="p-3 max-w-xs">
                <EditableTableCell lang="my" value={row.my} />
            </td>
            <td className="p-3 max-w-xs">
                <EditableTableCell lang="zh" value={row.zh} />
            </td>
            <td className="p-3 w-28">
                <Badge variant="secondary" className={`text-xs ${statusColors[row.status] || statusColors.pending}`}>
                    {isTranslating && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                    {statusLabels[row.status] || 'Pending'}
                </Badge>
            </td>
        </tr>
    )
}
