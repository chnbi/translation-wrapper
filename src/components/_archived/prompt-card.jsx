import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { MoreHorizontal, Play, Copy, Edit2 } from "lucide-react"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

export default function PromptCard({ template, onEdit, onDuplicate, onUse }) {
    const Icon = template.icon

    return (
        <div className="group relative bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-2xl p-5 hover:shadow-md transition-all duration-300 hover:border-zinc-300 dark:hover:border-zinc-700">
            {/* Header */}
            <div className="flex justify-between items-start mb-4">
                <div className="flex gap-4">
                    <div className={`w-12 h-12 rounded-xl ${template.iconBg} flex items-center justify-center shrink-0`}>
                        <Icon className={`w-6 h-6 ${template.iconColor}`} />
                    </div>
                    <div>
                        <h3 className="font-semibold text-zinc-900 dark:text-zinc-100 text-base leading-tight mb-1">
                            {template.name}
                        </h3>
                        <p className="text-xs text-zinc-500 dark:text-zinc-400 font-medium">
                            {template.author || 'System Default'}
                        </p>
                    </div>
                </div>

                <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-8 w-8 -mt-1 -mr-1 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-300">
                            <MoreHorizontal className="w-4 h-4" />
                        </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => onEdit(template)}>
                            <Edit2 className="w-4 h-4 mr-2" /> Edit
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => onDuplicate(template)}>
                            <Copy className="w-4 h-4 mr-2" /> Duplicate
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>

            {/* Content */}
            <div className="space-y-4">
                <p className="text-sm text-zinc-600 dark:text-zinc-400 line-clamp-2 min-h-[40px]">
                    {template.description}
                </p>

                {/* Tags */}
                <div className="flex flex-wrap gap-2">
                    {template.tags?.slice(0, 3).map((tag, i) => (
                        <Badge
                            key={i}
                            variant="secondary"
                            className="bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700"
                        >
                            {tag}
                        </Badge>
                    ))}
                    {template.tags?.length > 3 && (
                        <Badge variant="outline" className="text-xs text-zinc-400 border-dashed">
                            +{template.tags.length - 3}
                        </Badge>
                    )}
                </div>
            </div>

            {/* Footer */}
            <div className="mt-5 pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
                <div className="text-xs text-zinc-400 flex items-center gap-2">
                    <div className="w-2 h-2 rounded-full bg-emerald-500" />
                    {template.variables?.length || 0} variables
                </div>

                <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 hover:text-emerald-700"
                    onClick={() => onUse(template)}
                >
                    <Play className="w-3.5 h-3.5 mr-1.5" />
                    Use Prompt
                </Button>
            </div>
        </div>
    )
}
