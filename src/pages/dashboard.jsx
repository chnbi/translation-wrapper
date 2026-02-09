import { useState, useRef } from "react"
import { Folder, MoreHorizontal, Plus, Upload } from "lucide-react"
import NewProjectForm from "@/components/NewProjectForm"
import { useProjects } from "@/context/ProjectContext"
import { toast } from "sonner"
import * as XLSX from "xlsx"
import { parseExcelFile } from "@/lib/excel"
import { parseFile, detectFileType } from "@/lib/document"
import { PageHeader, SearchInput } from "@/components/ui/common"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from "@/components/ui/table"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Button } from "@/components/ui/button"
import { ConfirmDialog } from "@/components/dialogs"
import Pagination from "@/components/Pagination"

export default function Dashboard() {
    const { projects, deleteProject, addProject } = useProjects()
    const [isNewProjectOpen, setIsNewProjectOpen] = useState(false)
    const [deleteConfirm, setDeleteConfirm] = useState(null)
    const [currentPage, setCurrentPage] = useState(1)
    const itemsPerPage = 10
    const handleCreateProject = async (projectData) => {
        const result = await addProject(projectData)
        setIsNewProjectOpen(false)
        if (result?.id) {
            toast.success(projectData.sheets ? "Project imported successfully!" : "New project created!")
            window.location.hash = `#project/${result.id}${result.firstPageId ? `?page=${result.firstPageId}` : ''}`
        }
    }

    // Compute Stats
    const totalProjects = projects.length
    const drafts = projects.filter(p => !p.status || p.status === 'draft').length
    const pendingApproval = projects.filter(p => p.status === 'review').length
    const completed = projects.filter(p => p.status === 'approved' || p.status === 'completed').length

    // Sort and paginate projects
    const sortedProjects = [...projects]
        .sort((a, b) => new Date(b.lastUpdated || 0) - new Date(a.lastUpdated || 0))

    const totalItems = sortedProjects.length
    const startIndex = (currentPage - 1) * itemsPerPage
    const endIndex = startIndex + itemsPerPage
    const paginatedProjects = sortedProjects.slice(startIndex, endIndex)

    // Helper for relative time
    const timeAgo = (dateStr) => {
        if (!dateStr) return '-'
        const date = new Date(dateStr)
        const now = new Date()
        const diffInSeconds = Math.floor((now - date) / 1000)

        if (diffInSeconds < 60) return 'a second ago'
        if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)} minutes ago`
        if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)} hours ago`
        return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
    }

    const getStatusColor = (status) => {
        switch (status) {
            case 'review': return 'bg-orange-400'
            case 'approved': return 'bg-emerald-400'
            case 'completed': return 'bg-emerald-400'
            case 'in-progress': return 'bg-blue-400'
            case 'draft':
            default: return 'bg-slate-300'
        }
    }

    const getStatusLabel = (status) => {
        if (!status) return 'Draft'
        if (status === 'review') return 'Review'
        if (status === 'in-progress') return 'In Progress'
        return status.charAt(0).toUpperCase() + status.slice(1)
    }

    return (
        <div className="w-full pb-10 space-y-8">
            {/* Page Title */}
            {/* Page Title */}
            <h1 style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em' }} className="text-foreground">
                Overview
            </h1>

            {/* Stats Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {[
                    { label: 'Total projects', count: totalProjects },
                    { label: 'Drafts', count: drafts },
                    { label: 'Pending Approval', count: pendingApproval },
                    { label: 'Completed', count: completed }
                ].map((stat, i) => (
                    <div key={i} className="rounded-3xl p-6 flex items-center gap-6 h-32 border bg-card/50" style={{ backgroundColor: 'var(--card)', borderColor: 'var(--border)' }}>
                        {/* Note: User previously requested styling, but here we standardize to card/border variables for dark mode compat */}
                        {/* Actually, the previous pink style was requested. To support dark mode, we must remove hardcoded #FFF0F7 backgrounds if they clash. */}
                        {/* Let's use a subtle conditional or keep it if it looks okay in dark. Pink #FFF0F7 is very light. In dark mode it will be blinding. */}
                        {/* Strategy: Use semantic colors, but if they wanted pink, maybe use primary/10? */}
                        {/* Let's try to keep the requested pink style ONLY in light mode if possible, but simplest is to use card bg. */}
                        {/* Reverting to 'bg-card' is safest for "Sleek Dark Mode". */}
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0 bg-primary/10">
                            <Folder className="w-6 h-6 text-primary" />
                        </div>
                        <div>
                            <p className="text-muted-foreground text-sm font-medium mb-1">{stat.label}</p>
                            <h3 className="text-4xl font-bold text-foreground leading-none">{stat.count}</h3>
                        </div>
                    </div>
                ))}
            </div>

            {/* Recent Projects */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-foreground">Recent projects</h2>
                    <div className="flex items-center gap-2">
                        <Button onClick={() => setIsNewProjectOpen(true)} className="bg-primary hover:bg-primary/90 text-white rounded-full px-4 h-9">
                            <Plus className="w-4 h-4 mr-2" /> New Project
                        </Button>
                    </div>
                </div>

                <div className="rounded-2xl border-x border-t border-b-0 border-border bg-card overflow-hidden">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent border-b border-border">
                                <TableHead className="w-[30%] pl-6 bg-card text-muted-foreground">Project</TableHead>
                                <TableHead className="w-[140px] bg-card text-muted-foreground">Status</TableHead>
                                <TableHead className="w-[20%] bg-card text-muted-foreground">Progress</TableHead>
                                <TableHead className="bg-card text-muted-foreground">Last modified</TableHead>
                                <TableHead className="w-[120px] bg-card text-muted-foreground">Category</TableHead>
                                <TableHead className="w-[50px] bg-card"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {paginatedProjects.map((project) => (
                                <TableRow key={project.id} className="hover:bg-muted/50 border-b border-border last:border-0 cursor-pointer" onClick={() => window.location.hash = `#project/${project.id}`}>
                                    <TableCell className="pl-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 bg-muted">
                                                <Folder className="w-4 h-4 text-muted-foreground" />
                                            </div>
                                            <span className="font-medium text-foreground">{project.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${getStatusColor(project.status)}`} />
                                            <span className="text-sm text-muted-foreground">{getStatusLabel(project.status)}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            {/* Progress Bar styled to match image (Teal/Blue) */}
                                            <Progress value={project.progress || 0} className="h-1.5 bg-muted w-24 [&>div]:bg-blue-500" />
                                            <span className="text-xs text-muted-foreground w-8">{project.progress || 0}%</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm text-foreground font-medium whitespace-nowrap">
                                            {timeAgo(project.lastUpdated || project.createdAt)}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="bg-muted text-muted-foreground hover:bg-muted font-normal border-0">
                                            Default
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0" onClick={e => e.stopPropagation()}>
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4 text-muted-foreground" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); setDeleteConfirm({ project }) }} className="text-destructive focus:text-destructive">
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {paginatedProjects.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-muted-foreground">
                                        No recent projects found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>

                    {/* Pagination */}
                    {totalItems > 0 && (
                        <Pagination
                            currentPage={currentPage}
                            totalItems={totalItems}
                            itemsPerPage={itemsPerPage}
                            onPageChange={setCurrentPage}
                        />
                    )}
                </div>
            </div>
            <NewProjectForm
                isOpen={isNewProjectOpen}
                onClose={() => setIsNewProjectOpen(false)}
                onSubmit={handleCreateProject}
            />

            <ConfirmDialog
                open={!!deleteConfirm}
                onClose={() => setDeleteConfirm(null)}
                onConfirm={async () => {
                    if (deleteConfirm) {
                        await deleteProject(deleteConfirm.project.id)
                        setDeleteConfirm(null)
                        toast.success("Project deleted")
                    }
                }}
                title="Delete Project?"
                message={`Are you sure you want to delete "${deleteConfirm?.project?.name}"? This action cannot be undone.`}
                confirmLabel="Delete"
                variant="destructive"
            />
        </div>
    )
}
