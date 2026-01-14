import { useState, useRef } from "react"
import { Folder, MoreHorizontal, Plus, Upload } from "lucide-react"
import NewProjectForm from "@/components/NewProjectForm"
import { useProjects } from "@/context/ProjectContext"
import { toast } from "sonner"
import * as XLSX from "xlsx"
import { parseExcelFile } from "@/lib/excel"
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

export default function Dashboard() {
    const { projects, deleteProject, addProject } = useProjects()
    const [isNewProjectOpen, setIsNewProjectOpen] = useState(false)
    const fileInputRef = useRef(null)

    const handleCreateProject = async (projectData) => {
        const result = await addProject(projectData)
        setIsNewProjectOpen(false)
        if (result?.id) {
            toast.success("New project created!")
            window.location.hash = `#project/${result.id}${result.firstPageId ? `?page=${result.firstPageId}` : ''}`
        }
    }

    const handleImportProject = async (e) => {
        const file = e.target.files?.[0]
        if (!file) return

        try {
            const data = await parseExcelFile(file)
            // Data is { Sheet1: { entries: [...] }, Sheet2: { entries: [...] } }
            // We need to map this to { Sheet1: [...rows], Sheet2: [...rows] }

            const sheets = {}
            Object.values(data).forEach(sheet => {
                sheets[sheet.name] = sheet.entries.map(entry => ({
                    en: entry.english || '',
                    my: entry.malay || '',
                    zh: entry.chinese || ''
                }))
            })

            const projectName = file.name.replace(/\.[^/.]+$/, "")
            const result = await addProject({
                name: projectName,
                description: 'Imported from Excel',
                targetLanguages: ['my', 'zh'],
                sheets: sheets // Pass processed sheets
            })

            if (result?.id) {
                toast.success(`Imported "root" successfully! Redirecting...`)
                // Use setTimeout to allow toast to be seen briefly/ensure state update
                setTimeout(() => {
                    window.location.hash = `#project/${result.id}${result.firstPageId ? `?page=${result.firstPageId}` : ''}`
                }, 500)
            }

        } catch (error) {
            console.error("Import failed:", error)
            toast.error("Failed to import project: " + error.message)
        } finally {
            if (fileInputRef.current) fileInputRef.current.value = ''
        }
    }

    // Compute Stats
    const totalProjects = projects.length
    const drafts = projects.filter(p => !p.status || p.status === 'draft').length
    const pendingApproval = projects.filter(p => p.status === 'review').length
    const completed = projects.filter(p => p.status === 'approved' || p.status === 'completed').length

    // Sort Recent Projects - showing top 5
    const recentProjects = [...projects]
        .sort((a, b) => new Date(b.lastUpdated || 0) - new Date(a.lastUpdated || 0))
        .slice(0, 5)

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
            <h1 style={{ fontSize: '24px', fontWeight: 700, letterSpacing: '-0.02em', color: 'hsl(222, 47%, 11%)' }}>
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
                    <div key={i} className="rounded-3xl p-6 flex items-center gap-6 h-32 border" style={{ backgroundColor: '#FFF0F7', borderColor: '#FFD1E6' }}>
                        <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0" style={{ backgroundColor: '#FF4AA7' }}>
                            <Folder className="w-6 h-6 text-white" />
                        </div>
                        <div>
                            <p className="text-gray-500 text-sm font-medium mb-1">{stat.label}</p>
                            <h3 className="text-4xl font-bold text-gray-900 leading-none">{stat.count}</h3>
                        </div>
                    </div>
                ))}
            </div>

            {/* Recent Projects */}
            <div className="space-y-4">
                <div className="flex items-center justify-between">
                    <h2 className="text-xl font-semibold text-gray-900">Recent projects</h2>
                    <div className="flex items-center gap-2">
                        <input
                            type="file"
                            ref={fileInputRef}
                            onChange={handleImportProject}
                            accept=".xlsx,.xls,.csv"
                            className="hidden"
                        />
                        <Button
                            onClick={() => fileInputRef.current?.click()}
                            variant="outline"
                            className="rounded-full px-4 h-9 bg-gray-100 border-0 hover:bg-gray-200 text-gray-700"
                        >
                            <Upload className="w-4 h-4 mr-2" /> Import file
                        </Button>
                        <Button onClick={() => setIsNewProjectOpen(true)} className="bg-[#FF0084] hover:bg-[#E60077] text-white rounded-full px-4 h-9">
                            <Plus className="w-4 h-4 mr-2" /> New Project
                        </Button>
                    </div>
                </div>

                <div className="rounded-xl border border-gray-100 bg-white overflow-hidden shadow-sm">
                    <Table>
                        <TableHeader>
                            <TableRow className="hover:bg-transparent border-b border-gray-100">
                                <TableHead className="w-[30%] pl-6 bg-white">Project</TableHead>
                                <TableHead className="bg-white">Status</TableHead>
                                <TableHead className="w-[20%] bg-white">Progress</TableHead>
                                <TableHead className="bg-white">Last modified</TableHead>
                                <TableHead className="bg-white">Category</TableHead>
                                <TableHead className="w-[50px] bg-white"></TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {recentProjects.map((project) => (
                                <TableRow key={project.id} className="hover:bg-slate-50/50 border-b border-gray-100 last:border-0 cursor-pointer" onClick={() => window.location.hash = `#project/${project.id}`}>
                                    <TableCell className="pl-6 py-4">
                                        <div className="flex items-center gap-3">
                                            <div className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: '#9CA3AF' }}>
                                                <Folder className="w-4 h-4 text-white" />
                                            </div>
                                            <span className="font-medium text-gray-900">{project.name}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <div className={`w-2 h-2 rounded-full ${getStatusColor(project.status)}`} />
                                            <span className="text-sm text-gray-500">{getStatusLabel(project.status)}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            {/* Progress Bar styled to match image (Teal/Blue) */}
                                            <Progress value={project.progress || 0} className="h-1.5 bg-gray-100 w-24 [&>div]:bg-[#5174FF]" />
                                            <span className="text-xs text-gray-400 w-8">{project.progress || 0}%</span>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="text-sm text-gray-900 font-medium whitespace-nowrap">
                                            {timeAgo(project.lastUpdated || project.createdAt)}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        <Badge variant="secondary" className="bg-gray-100 text-gray-500 hover:bg-gray-100 font-normal border-0">
                                            Default
                                        </Badge>
                                    </TableCell>
                                    <TableCell>
                                        <DropdownMenu>
                                            <DropdownMenuTrigger asChild>
                                                <Button variant="ghost" className="h-8 w-8 p-0" onClick={e => e.stopPropagation()}>
                                                    <span className="sr-only">Open menu</span>
                                                    <MoreHorizontal className="h-4 w-4 text-gray-400" />
                                                </Button>
                                            </DropdownMenuTrigger>
                                            <DropdownMenuContent align="end">
                                                <DropdownMenuItem onClick={(e) => { e.stopPropagation(); deleteProject(project.id) }} className="text-red-600 focus:text-red-600">
                                                    Delete
                                                </DropdownMenuItem>
                                            </DropdownMenuContent>
                                        </DropdownMenu>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {recentProjects.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={6} className="h-32 text-center text-gray-500">
                                        No recent projects found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </div>
            <NewProjectForm
                isOpen={isNewProjectOpen}
                onClose={() => setIsNewProjectOpen(false)}
                onSubmit={handleCreateProject}
            />
        </div>
    )
}
