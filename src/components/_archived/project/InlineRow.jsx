// InlineRow - Displays translation row in card format with inline editing
import { CheckSquare, Square, Loader2, AlertCircle, Tag } from "lucide-react"
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

export default function InlineRow({
    row,
    isSelected,
    editingCell,
    editValue,
    onToggleSelection,
    onCellClick,
    onEditChange,
    onCellSave,
    onKeyDown,
    promptName,
}) {
    const isTranslating = row.status === 'translating'
    const isError = row.status === 'error'

    const EditableCell = ({ lang, value }) => {
        const isEditing = editingCell?.rowId === row.id && editingCell?.field === lang
        const isEmpty = !value

        if (isEditing) {
            return (
                <input
                    autoFocus
                    value={editValue}
                    onChange={(e) => onEditChange(e.target.value)}
                    onBlur={onCellSave}
                    onKeyDown={onKeyDown}
                    className="flex-1 text-sm px-2 py-1 border rounded bg-background focus:ring-2 focus:ring-primary/20 min-w-0"
                />
            )
        }

        return (
            <div
                onClick={() => onCellClick(row.id, lang, value)}
                className={`flex-1 text-sm px-2 py-1 rounded cursor-text hover:bg-muted/50 truncate min-w-0 ${isEmpty ? 'text-muted-foreground italic' : ''}`}
            >
                {value || '—'}
            </div>
        )
    }

    return (
        <div className={`rounded-xl border p-4 transition-all ${isSelected ? 'border-primary/40 bg-primary/5 ring-1 ring-primary/20' :
            isTranslating ? 'border-violet-300 dark:border-violet-700 bg-violet-50/50 dark:bg-violet-900/10' :
                isError ? 'border-red-300 dark:border-red-700' :
                    'border-border hover:border-border/80 bg-card'
            }`}>
            {/* Header */}
            <div className="flex items-center gap-3 mb-3">
                <button
                    onClick={onToggleSelection}
                    className="p-0.5 hover:bg-muted rounded flex-shrink-0"
                >
                    {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-primary" />
                    ) : (
                        <Square className="w-4 h-4 text-muted-foreground" />
                    )}
                </button>

                <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{row.en || row.source}</p>
                </div>

                {promptName && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400 flex-shrink-0 flex items-center gap-1">
                        <Tag className="w-3 h-3" />
                        {promptName}
                    </span>
                )}

                <Badge variant="secondary" className={`text-xs flex-shrink-0 ${statusColors[row.status] || statusColors.pending}`}>
                    {isTranslating && <Loader2 className="w-3 h-3 mr-1 animate-spin" />}
                    {isError && <AlertCircle className="w-3 h-3 mr-1" />}
                    {statusLabels[row.status] || 'Pending'}
                </Badge>
            </div>

            {/* Translations Row */}
            <div className="flex items-center gap-3 pl-7">
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-xs text-muted-foreground w-6 flex-shrink-0">🇲🇾</span>
                    <EditableCell lang="my" value={row.my} />
                </div>
                <div className="w-px h-6 bg-border flex-shrink-0" />
                <div className="flex items-center gap-2 flex-1 min-w-0">
                    <span className="text-xs text-muted-foreground w-6 flex-shrink-0">🇨🇳</span>
                    <EditableCell lang="zh" value={row.zh} />
                </div>
            </div>
        </div>
    )
}
