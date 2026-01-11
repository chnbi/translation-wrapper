// Dashboard - Quick Actions + Recent Projects Table
import { useState } from "react"
import { Plus, Upload, FileText, Settings, LayoutGrid, List, FileSpreadsheet, MoreHorizontal, Pencil, Trash2, CheckSquare } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ImportExcelDialog } from "@/components/dialogs"
import NewProjectForm from "@/components/NewProjectForm"
import { useProjects } from "@/context/ProjectContext"
import { useAuth, ACTIONS } from "@/App"

const quickActions = [
    {
        id: "new",
        icon: Plus,
        label: "New Project",
        description: "Start with a blank file",
        color: "bg-primary text-primary-foreground",
        iconColor: "text-primary-foreground"
    },
    {
        id: "import",
        icon: Upload,
        label: "Import File",
        description: "Excel, CSV & more",
        color: "bg-amber-50 dark:bg-amber-900/20",
        iconColor: "text-amber-600 dark:text-amber-400"
    },
    {
        id: "template",
        icon: FileText,
        label: "Use Template",
        description: "Choose from templates",
        color: "bg-blue-50 dark:bg-blue-900/20",
        iconColor: "text-blue-600 dark:text-blue-400"
    },
    {
        id: "settings",
        icon: Settings,
        label: "Settings",
        description: "Configure preferences",
        color: "bg-zinc-100 dark:bg-zinc-800",
        iconColor: "text-zinc-600 dark:text-zinc-400"
    },
]

const statusColors = {
    "draft": "bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
    "in-progress": "bg-amber-50 text-amber-600 dark:bg-amber-900/30 dark:text-amber-400",
    "completed": "bg-emerald-50 text-emerald-600 dark:bg-emerald-900/30 dark:text-emerald-400",
}

export default function Dashboard() {
    const { projects, addProject, deleteProject, isLoading, dataSource, addProjectPage } = useProjects()
    const { canDo } = useAuth()
    const [searchQuery, setSearchQuery] = useState("")
    const [viewMode, setViewMode] = useState("list")
    const [isImportOpen, setIsImportOpen] = useState(false)
    const [isNewProjectOpen, setIsNewProjectOpen] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState(null)

    const filteredProjects = projects.filter(p =>
        p.name?.toLowerCase().includes(searchQuery.toLowerCase())
    )

    const handleDelete = async (id) => {
        await deleteProject(id)
        setDeleteConfirm(null)
    }

    const handleImport = async (data) => {
        // Calculate total rows from all pages
        const totalRows = data.pages?.reduce((sum, p) => sum + (p.rows?.length || 0), 0) || 0

        const newProject = {
            name: data.projectName,
            pages: data.pages?.length || 1,
            totalRows: totalRows,
            sourceLanguage: 'English',
            targetLanguages: ['Bahasa Malaysia', 'Chinese'],
            team: [],
            color: 'bg-gradient-to-br from-indigo-500 to-indigo-600',
        }

        const created = await addProject(newProject)

        if (created?.id) {
            // Add pages with actual row data using context function
            for (const page of (data.pages || [])) {
                if (page.rows && page.rows.length > 0) {
                    try {
                        await addProjectPage(created.id, { name: page.name }, page.rows)
                    } catch (error) {
                        console.error('Error creating page:', error)
                    }
                }
            }

            // Navigate to the new project
            window.location.hash = `#project/${created.id}`
        }
    }

    const handleNewProject = async (projectData) => {
        const created = await addProject(projectData)
        if (created?.id) {
            window.location.hash = `#project/${created.id}`
        }
    }

    const handleQuickAction = (actionId) => {
        switch (actionId) {
            case "import":
                setIsImportOpen(true)
                break
            case "settings":
                window.location.hash = "#settings"
                break
            case "new":
                setIsNewProjectOpen(true)
                break
            case "template":
                window.location.hash = "#prompt"
                break
        }
    }

    return (
        <div className="space-y-8 w-full max-w-7xl mx-auto pb-10">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="relative w-80">
                    <Input
                        placeholder="Search projects..."
                        className="rounded-xl"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {/* Quick Actions */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {quickActions.map((action, i) => {
                    const Icon = action.icon
                    return (
                        <button
                            key={i}
                            onClick={() => handleQuickAction(action.id)}
                            className={`p-5 rounded-2xl text-left transition-all hover:shadow-card-hover hover:scale-[1.02] ${action.color} ${i === 0 ? '' : 'border border-border/50'}`}
                        >
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-4 ${i === 0 ? 'bg-white/20' : 'bg-white dark:bg-zinc-900'}`}>
                                <Icon className={`w-5 h-5 ${action.iconColor}`} />
                            </div>
                            <p className={`font-semibold ${i === 0 ? 'text-primary-foreground' : 'text-foreground'}`}>
                                {action.label}
                            </p>
                            <p className={`text-sm mt-0.5 ${i === 0 ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                                {action.description}
                            </p>
                        </button>
                    )
                })}

                {/* Manager Shortcut */}
                {canDo('approve_translation') && (
                    <button
                        onClick={() => window.location.hash = "#approvals"}
                        className="p-5 rounded-2xl text-left transition-all hover:shadow-card-hover hover:scale-[1.02] bg-violet-50 dark:bg-violet-900/20 border border-violet-200 dark:border-violet-800"
                    >
                        <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 bg-white dark:bg-zinc-900">
                            <CheckSquare className="w-5 h-5 text-violet-600 dark:text-violet-400" />
                        </div>
                        <p className="font-semibold text-foreground">
                            Manage Approvals
                        </p>
                        <p className="text-sm mt-0.5 text-muted-foreground">
                            Review pending translations
                        </p>
                    </button>
                )}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center justify-end">
                <div className="flex items-center gap-1 p-1 bg-muted/50 rounded-lg">
                    <button
                        onClick={() => setViewMode("grid")}
                        className={`p-2 rounded-md transition-colors ${viewMode === "grid" ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    >
                        <LayoutGrid className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => setViewMode("list")}
                        className={`p-2 rounded-md transition-colors ${viewMode === "list" ? "bg-card shadow-sm" : "text-muted-foreground hover:text-foreground"}`}
                    >
                        <List className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* Projects Table */}
            <div className="rounded-2xl bg-card shadow-card overflow-hidden">
                {/* Table Header */}
                <div className="grid grid-cols-12 gap-4 px-6 py-4 bg-muted/30 border-b text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                    <div className="col-span-5 flex items-center gap-1">
                        <FileSpreadsheet className="w-3.5 h-3.5" />
                        Project name
                    </div>
                    <div className="col-span-2">Status</div>
                    <div className="col-span-2">Progress</div>
                    <div className="col-span-2">Last modified</div>
                    <div className="col-span-1"></div>
                </div>

                {/* Table Rows */}
                <div className="divide-y divide-border/50">
                    {filteredProjects.map((project) => (
                        <a
                            key={project.id}
                            href={`#project/${project.id}`}
                            className="grid grid-cols-12 gap-4 px-6 py-4 items-center hover:bg-accent/30 transition-colors"
                        >
                            {/* Project Name */}
                            <div className="col-span-5 flex items-center gap-3">
                                <div className={`w-8 h-8 rounded-lg ${project.color || 'bg-primary/10'} flex items-center justify-center`}>
                                    <FileSpreadsheet className="w-4 h-4 text-white" />
                                </div>
                                <div>
                                    <p className="font-medium text-foreground">{project.name}</p>
                                    <p className="text-xs text-muted-foreground">
                                        {project.totalRows || 0} rows • {project.sourceLanguage} → {project.targetLanguages?.join(', ')}
                                    </p>
                                </div>
                            </div>

                            {/* Status */}
                            <div className="col-span-2">
                                <Badge variant="secondary" className={`text-xs ${statusColors[project.status] || statusColors.draft}`}>
                                    {(project.status || 'draft').replace("-", " ")}
                                </Badge>
                            </div>

                            {/* Progress */}
                            <div className="col-span-2">
                                <div className="flex items-center gap-2">
                                    <div className="flex-1 h-1.5 bg-muted rounded-full overflow-hidden">
                                        <div
                                            className="h-full bg-primary rounded-full transition-all"
                                            style={{ width: `${project.progress || 0}%` }}
                                        />
                                    </div>
                                    <span className="text-xs text-muted-foreground w-8">{project.progress || 0}%</span>
                                </div>
                            </div>

                            {/* Last Modified */}
                            <div className="col-span-2 flex items-center gap-2">
                                <div className="flex -space-x-2">
                                    {(project.team || []).slice(0, 3).map((c, i) => (
                                        <Avatar key={i} className="h-6 w-6 border-2 border-card">
                                            <AvatarFallback className="text-[10px] bg-muted">
                                                {c.initials}
                                            </AvatarFallback>
                                        </Avatar>
                                    ))}
                                </div>
                                <span className="text-sm text-muted-foreground">
                                    {project.lastUpdated
                                        ? new Date(project.lastUpdated).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
                                        : 'Recently'}
                                </span>
                            </div>

                            {/* Actions */}
                            <div className="col-span-1 flex justify-end" onClick={e => e.preventDefault()}>
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="ghost" size="icon" className="h-8 w-8">
                                            <MoreHorizontal className="w-4 h-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent align="end">
                                        <DropdownMenuItem onClick={() => window.location.hash = `#project/${project.id}`}>
                                            <Pencil className="w-4 h-4 mr-2" /> Open
                                        </DropdownMenuItem>
                                        {canDo(ACTIONS.DELETE_PROJECT) && (
                                            <DropdownMenuItem
                                                onClick={() => setDeleteConfirm(project.id)}
                                                className="text-destructive focus:text-destructive"
                                            >
                                                <Trash2 className="w-4 h-4 mr-2" /> Delete
                                            </DropdownMenuItem>
                                        )}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            </div>
                        </a>
                    ))}

                    {/* Empty State */}
                    {filteredProjects.length === 0 && (
                        <div className="py-16 text-center">
                            <div className="w-12 h-12 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
                                <FileSpreadsheet className="w-6 h-6 text-muted-foreground" />
                            </div>
                            <h3 className="font-semibold mb-1">No projects found</h3>
                            <p className="text-muted-foreground text-sm">
                                {searchQuery ? `No results for "${searchQuery}"` : "Import a file or create a new project to get started."}
                            </p>
                        </div>
                    )}
                </div>
            </div>

            {/* Delete Confirmation Dialog */}
            {deleteConfirm && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-card rounded-2xl p-6 max-w-sm w-full mx-4 shadow-xl">
                        <h3 className="text-lg font-semibold mb-2">Delete Project?</h3>
                        <p className="text-muted-foreground text-sm mb-4">
                            This action cannot be undone. The project and all its translations will be permanently deleted.
                        </p>
                        <div className="flex gap-3 justify-end">
                            <Button variant="outline" onClick={() => setDeleteConfirm(null)}>
                                Cancel
                            </Button>
                            <Button variant="destructive" onClick={() => handleDelete(deleteConfirm)}>
                                Delete
                            </Button>
                        </div>
                    </div>
                </div>
            )}

            <ImportExcelDialog
                open={isImportOpen}
                onOpenChange={setIsImportOpen}
                onImport={handleImport}
            />

            <NewProjectForm
                isOpen={isNewProjectOpen}
                onClose={() => setIsNewProjectOpen(false)}
                onSubmit={(data) => {
                    handleNewProject(data)
                    setIsNewProjectOpen(false)
                }}
            />
        </div>
    )
}
