import * as React from "react"
import {
  Settings2,
  Languages,
  BookOpen,
  Library,
  Folder,
  FileText,
  CheckSquare,
  Key,
  Users,
  Bell,
  ChevronDown,
  ChevronRight,
  Edit3,
  Trash2,
  Plus,
  Pencil,
  Sparkles,
} from "lucide-react"

import { NavMain } from "./nav-main"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar"
import { useProjects } from "@/context/ProjectContext"
import { useGlossary } from "@/context/GlossaryContext"
import { usePrompts } from "@/context/PromptContext"
import { useApprovalNotifications } from "@/hooks/useApprovalNotifications"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"
import { ConfirmDialog } from "@/components/dialogs/ConfirmDialog"
import { useAuth } from "@/App"
import { WordFlowLogo } from "@/components/ui/WordFlowLogo"

// WordFlow Logo Component - ChatGPT-style behavior
// Logo navigates home, shows sidebar icon + "Open sidebar" tooltip when collapsed and hovered
function SidebarBrand() {
  const { state, toggleSidebar } = useSidebar()
  const isCollapsed = state === "collapsed"
  const [isHovered, setIsHovered] = React.useState(false)

  // Only show tooltip when collapsed and hovered
  const showTooltip = isCollapsed && isHovered
  // Show sidebar icon instead of logo when collapsed and hovered
  const showSidebarIcon = isCollapsed && isHovered

  const handleClick = (e) => {
    if (isCollapsed) {
      // When collapsed, clicking logo opens sidebar (like ChatGPT)
      e.preventDefault()
      toggleSidebar()
    } else {
      // When expanded, logo navigates to home
      window.location.hash = '#'
    }
  }

  // Sidebar Icon (PanelLeft style) - matches feature icon size
  const SidebarIcon = () => (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-sidebar-foreground group-hover:text-primary transition-colors">
      <rect width="18" height="18" x="3" y="3" rx="2" />
      <path d="M9 3v18" />
    </svg>
  )

  // WordFlow Flower Logo - sized to match feature icons
  // Replaced by shared component
  const FlowerLogo = () => <WordFlowLogo width={28} height={28} />

  return (
    <div
      className="relative group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <button
        onClick={handleClick}
        className="flex items-center gap-2.5 px-1 transition-all cursor-pointer bg-transparent border-none"
        title={isCollapsed ? "Open sidebar" : "Home"}
      >
        {/* Logo Icon - swaps to sidebar icon when collapsed + hovered */}
        <div className="relative flex h-8 w-8 shrink-0 items-center justify-center transition-all">
          {showSidebarIcon ? <SidebarIcon /> : <FlowerLogo />}
        </div>
        {/* Brand Name - hidden when collapsed */}
        {!isCollapsed && (
          <span className="text-lg font-semibold text-sidebar-foreground tracking-tight">
            WordFlow
          </span>
        )}
      </button>

      {/* Tooltip: "Open sidebar" when collapsed and hovered */}
      {showTooltip && (
        <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2 py-1 bg-foreground text-background text-xs rounded shadow-lg whitespace-nowrap z-50">
          Open sidebar
        </div>
      )}
    </div>
  )
}

// Navigation Groups - matching Figma design (reordered to match)
const navEssentials = [
  {
    title: "Projects",
    url: "#projects",
    icon: Folder,
  },
  {
    title: "Glossary",
    url: "#glossary",
    icon: BookOpen,
  },
  {
    title: "Approvals",
    url: "#approvals",
    icon: Edit3,
  },
  {
    title: "Image Translate",
    url: "#image-translate",
    icon: Languages,
  },
  {
    title: "Prompt Library",
    url: "#prompt",
    icon: Library,
  },
]

// Settings sub-items per Figma
const navSettings = [
  {
    title: "Settings",
    icon: Settings2,
    items: [
      { title: "Settings", url: "#settings" },
      { title: "API Keys", url: "#settings/api-keys" },
      { title: "User Roles", url: "#settings/roles" },
      { title: "Notification", url: "#settings/notifications" },
    ],
  },
]

// Component for projects with multiple pages (like "5g advanced" in Figma)
function ProjectWithPages({
  project,
  pages,
  isActive,
  currentHash,
  onDeleteProject,
  onAddPage,
  onDeletePage,
  onRenamePage,
  isExpanded,
  onProjectClick,
  getPageBadge
}) {
  const [hoveredProject, setHoveredProject] = React.useState(false)
  const [hoveredPageId, setHoveredPageId] = React.useState(null)
  const [editingPageId, setEditingPageId] = React.useState(null)
  const [editingName, setEditingName] = React.useState("")
  const [deleteConfirm, setDeleteConfirm] = React.useState(null) // { type: 'project' | 'page', id: string }

  const handleAddPage = (e) => {
    e.stopPropagation()
    e.preventDefault()
    onAddPage(project.id)
  }

  const handleDeleteProject = (e) => {
    e.stopPropagation()
    e.preventDefault()
    setDeleteConfirm({ type: 'project', id: project.id })
  }

  const handleDeletePage = (e, pageId) => {
    e.stopPropagation()
    e.preventDefault()
    setDeleteConfirm({ type: 'page', id: pageId })
  }

  const handleStartRename = (e, page) => {
    e.stopPropagation()
    e.preventDefault()
    setEditingPageId(page.id)
    setEditingName(page.name)
  }

  const handleSaveRename = () => {
    if (editingName.trim() && editingPageId) {
      onRenamePage(project.id, editingPageId, editingName.trim())
    }
    setEditingPageId(null)
    setEditingName("")
  }

  const handleCancelRename = () => {
    setEditingPageId(null)
    setEditingName("")
  }

  const confirmDelete = () => {
    if (deleteConfirm?.type === 'project') {
      onDeleteProject(project.id)
    } else if (deleteConfirm?.type === 'page') {
      onDeletePage(project.id, deleteConfirm.id)
    }
    setDeleteConfirm(null)
  }

  return (
    <>
      <Collapsible open={isExpanded} onOpenChange={() => onProjectClick(project.id)}>
        <SidebarMenuItem>
          <CollapsibleTrigger asChild>
            <SidebarMenuButton
              tooltip={project.name}
              isActive={false}
              onMouseEnter={() => setHoveredProject(true)}
              onMouseLeave={() => setHoveredProject(false)}
              className="group relative"
            >
              <Folder className="h-4 w-4 flex-shrink-0" />
              <span style={{
                flex: 1,
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
                maxWidth: hoveredProject ? '100px' : '140px'
              }}>
                {project.name}
              </span>

              {/* Hover icons for project */}
              {hoveredProject && (
                <div className="flex items-center gap-1 ml-auto" style={{ flexShrink: 0 }}>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={handleDeleteProject}
                    onKeyDown={(e) => e.key === 'Enter' && handleDeleteProject(e)}
                    className="p-0.5 hover:bg-rose-100 rounded transition-colors cursor-pointer"
                    title="Delete project"
                  >
                    <Trash2 className="h-3.5 w-3.5 text-gray-400 hover:text-rose-500" />
                  </span>
                  <span
                    role="button"
                    tabIndex={0}
                    onClick={handleAddPage}
                    onKeyDown={(e) => e.key === 'Enter' && handleAddPage(e)}
                    className="p-0.5 hover:bg-pink-100 rounded transition-colors cursor-pointer"
                    title="Add page"
                  >
                    <Plus className="h-3.5 w-3.5 text-gray-400 hover:text-pink-500" />
                  </span>
                </div>
              )}

              {!hoveredProject && (
                <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
              )}
            </SidebarMenuButton>
          </CollapsibleTrigger>
          <CollapsibleContent>
            <SidebarMenuSub>
              {pages.map((page) => {
                const isActivePage = currentHash.includes(`page=${page.id}`) ||
                  (isActive && currentHash === `#project/${project.id}` && pages[0]?.id === page.id)
                const isHovered = hoveredPageId === page.id
                const isEditing = editingPageId === page.id

                return (
                  <SidebarMenuSubItem
                    key={page.id}
                    onMouseEnter={() => setHoveredPageId(page.id)}
                    onMouseLeave={() => setHoveredPageId(null)}
                  >
                    {isEditing ? (
                      <div className="flex items-center gap-1 px-2 py-1">
                        <input
                          type="text"
                          value={editingName}
                          onChange={(e) => setEditingName(e.target.value)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') handleSaveRename()
                            if (e.key === 'Escape') handleCancelRename()
                          }}
                          onBlur={handleSaveRename}
                          autoFocus
                          className="flex-1 text-sm px-1.5 py-0.5 border rounded outline-none focus:border-pink-400"
                          style={{ minWidth: 0 }}
                        />
                      </div>
                    ) : (
                      <SidebarMenuSubButton
                        asChild
                        isActive={isActivePage}
                        style={{
                          backgroundColor: isActivePage ? 'hsl(329, 100%, 96%)' : undefined,
                          borderRadius: isActivePage ? '8px' : undefined,
                        }}
                      >
                        <a
                          href={`#project/${project.id}?page=${page.id}`}
                          className="flex items-center w-full"
                        >
                          <span style={{
                            flex: 1,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: isHovered ? '90px' : '130px',
                            color: isActivePage ? '#FF0084' : undefined,
                            fontWeight: isActivePage ? 500 : undefined,
                          }}>
                            {page.name}
                          </span>

                          {/* Approval Badge */}
                          {getPageBadge && getPageBadge(page.id) > 0 && (
                            <span className="ml-2 text-[10px] font-semibold text-white bg-[#FF0084] rounded-full px-1.5 h-4 min-w-[16px] flex items-center justify-center">
                              {getPageBadge(page.id)}
                            </span>
                          )}



                          {/* Hover icons for page */}
                          {isHovered && (
                            <div className="flex items-center gap-0.5 ml-auto" style={{ flexShrink: 0 }}>
                              <span
                                role="button"
                                tabIndex={0}
                                onClick={(e) => handleDeletePage(e, page.id)}
                                onKeyDown={(e) => e.key === 'Enter' && handleDeletePage(e, page.id)}
                                className="p-0.5 hover:bg-rose-100 rounded transition-colors cursor-pointer"
                                title="Delete page"
                              >
                                <Trash2 className="h-3 w-3 text-gray-400 hover:text-rose-500" />
                              </span>
                              <span
                                role="button"
                                tabIndex={0}
                                onClick={(e) => handleStartRename(e, page)}
                                onKeyDown={(e) => e.key === 'Enter' && handleStartRename(e, page)}
                                className="p-0.5 hover:bg-blue-100 rounded transition-colors cursor-pointer"
                                title="Rename page"
                              >
                                <Pencil className="h-3 w-3 text-gray-400 hover:text-blue-500" />
                              </span>
                            </div>
                          )}
                        </a>
                      </SidebarMenuSubButton>
                    )}
                  </SidebarMenuSubItem>
                )
              })}
            </SidebarMenuSub>
          </CollapsibleContent>
        </SidebarMenuItem>
      </Collapsible>

      {/* Delete Confirmation Modal */}
      <ConfirmDialog
        open={!!deleteConfirm}
        onClose={() => setDeleteConfirm(null)}
        onConfirm={confirmDelete}
        title={deleteConfirm?.type === 'project' ? 'Delete Project?' : 'Delete Page?'}
        message={deleteConfirm?.type === 'project'
          ? `Are you sure you want to delete "${project?.name}"? This action cannot be undone.`
          : 'Are you sure you want to delete this page? This action cannot be undone.'
        }
        confirmLabel="Delete"
        variant="destructive"
      />
    </>
  )
}

export function AppSidebar({ ...props }) {
  const {
    projects,
    getProjectPages,
    getPageRows,
    getProjectRows,
    deleteProject,
    addProjectPage,
    deleteProjectPage,
    renameProjectPage,
  } = useProjects()
  const { terms: glossaryTerms } = useGlossary()
  const { prompts } = usePrompts()
  const { getNewApprovalCount } = useApprovalNotifications()
  const { isManager } = useAuth()
  const [settingsOpen, setSettingsOpen] = React.useState(true)
  const [currentHash, setCurrentHash] = React.useState(window.location.hash)
  const [expandedProjectId, setExpandedProjectId] = React.useState(null)

  // Listen for hash changes
  React.useEffect(() => {
    const handleHashChange = () => setCurrentHash(window.location.hash)
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  // Auto-expand the active project
  React.useEffect(() => {
    const match = currentHash.match(/project\/([^?]+)/)
    if (match) {
      setExpandedProjectId(match[1])
    }
  }, [currentHash])

  // Handler: Project click - expand and navigate to first page
  const handleProjectClick = (projectId) => {
    // Always expand
    setExpandedProjectId(projectId)

    // Navigate to first page if available
    const pages = getProjectPages(projectId)
    if (pages && pages.length > 0) {
      // Navigate to first page
      window.location.hash = `#project/${projectId}?page=${pages[0].id}`
    }
  }

  // Handler: Add new page to project
  const handleAddPage = async (projectId) => {
    const pages = getProjectPages(projectId) || []
    const newPageName = `Page ${pages.length + 1}`
    const newPage = await addProjectPage(projectId, { name: newPageName })

    // Redirect to the new page if created successfully
    if (newPage?.id) {
      window.location.hash = `#project/${projectId}?page=${newPage.id}`
      // Also expand the project to show the new page in the list
      setExpandedProjectId(projectId)
    }
  }

  // Handler: Delete project
  const handleDeleteProject = async (projectId) => {
    await deleteProject(projectId)
    // Navigate away if we're on this project
    if (currentHash.includes(`project/${projectId}`)) {
      window.location.hash = '#projects'
    }
  }

  // Handler: Delete page
  const handleDeletePage = async (projectId, pageId) => {
    const pages = getProjectPages(projectId) || []
    // If deleting last page, delete the entire project
    if (pages.length <= 1) {
      await deleteProject(projectId)
      if (currentHash.includes(`project/${projectId}`)) {
        window.location.hash = '#projects'
      }
    } else {
      await deleteProjectPage(projectId, pageId)
      // Navigate to first page if we're on the deleted page
      if (currentHash.includes(`page=${pageId}`)) {
        const remainingPages = pages.filter(p => p.id !== pageId)
        if (remainingPages.length > 0) {
          window.location.hash = `#project/${projectId}?page=${remainingPages[0].id}`
        }
      }
    }
  }

  // Handler: Rename page
  const handleRenamePage = async (projectId, pageId, newName) => {
    await renameProjectPage(projectId, pageId, newName)
  }

  // Compute badge counts


  const pendingApprovals = React.useMemo(() => {
    let count = 0
    // Count project rows pending review
    for (const project of projects) {
      const pages = getProjectPages(project.id) || []
      if (pages.length > 0) {
        for (const page of pages) {
          const rows = getPageRows(project.id, page.id) || []
          count += rows.filter(r => r.status === 'review').length
        }
      } else {
        const rows = getProjectRows(project.id) || []
        count += rows.filter(r => r.status === 'review').length
      }
    }
    // Count glossary terms pending review
    count += glossaryTerms.filter(t => t.status === 'review').length
    return count
  }, [projects, getProjectPages, getPageRows, getProjectRows, glossaryTerms])

  const glossaryNewApprovals = getNewApprovalCount('glossary', 'main', glossaryTerms)
  const projectsInProgress = projects.filter(p => p.status === 'in-progress').length

  // Dynamic nav items with badges (filter by role)
  const navEssentialsWithBadges = [
    // Only show Approvals to Managers
    ...(isManager ? [{ title: "Approvals", url: "#approvals", icon: Edit3, badge: pendingApprovals > 0 ? pendingApprovals : undefined }] : []),
    // Only show My Submissions to Editors
    ...(!isManager ? [{ title: "My Submissions", url: "#submissions", icon: CheckSquare, badge: pendingApprovals > 0 ? pendingApprovals : undefined }] : []),
    { title: "Quick Check", url: "#quick-check", icon: Sparkles },
    { title: "Image Translation", url: "#image-translate", icon: Languages },
    { title: "Glossary", url: "#glossary", icon: BookOpen, badge: glossaryNewApprovals > 0 ? glossaryNewApprovals : undefined },
    { title: "Prompt Library", url: "#prompt", icon: Library },
  ]

  // Dynamic projects list (show up to 5 recent, sorted by lastUpdated)
  const navProjects = [...projects]
    .sort((a, b) => new Date(b.lastUpdated || 0) - new Date(a.lastUpdated || 0))
    .slice(0, 5)


  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar" {...props}>
      <SidebarHeader className="bg-sidebar text-sidebar-foreground pt-5 pb-4 px-4 transition-all">
        {/* WordFlow Logo and Toggle */}
        <div className="flex items-center justify-between">
          <SidebarBrand />
          {/* Toggle button - hidden when collapsed, icon size matches feature icons */}
          <SidebarTrigger className="h-8 w-8 text-sidebar-foreground/60 hover:text-primary hover:bg-sidebar-accent rounded-md transition-colors group-data-[collapsible=icon]:hidden [&>svg]:h-[20px] [&>svg]:w-[20px]" />
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-sidebar text-sidebar-foreground/80 px-2 pt-2 gap-4">
        {/* Essentials */}
        <NavMain items={navEssentialsWithBadges} />

        {/* Recent Projects - Hidden when sidebar minimized */}
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel className="text-sidebar-foreground/50 font-medium tracking-wide uppercase text-[10px] mt-2 mb-1 px-2">Recent projects</SidebarGroupLabel>
          <SidebarMenu>
            {navProjects.map((project) => {
              const pages = getProjectPages(project.id) || []
              const isActiveProject = currentHash.includes(`project/${project.id}`)

              // Always show as collapsible dropdown (even with 1 page)
              return (
                <ProjectWithPages
                  key={project.id}
                  project={project}
                  pages={pages}
                  isActive={isActiveProject}
                  currentHash={currentHash}
                  onDeleteProject={handleDeleteProject}
                  onAddPage={handleAddPage}
                  onDeletePage={handleDeletePage}
                  onRenamePage={handleRenamePage}
                  isExpanded={expandedProjectId === project.id}
                  onProjectClick={handleProjectClick}
                  getPageBadge={(pageId) => {
                    const rows = getPageRows(project.id, pageId)
                    return getNewApprovalCount(project.id, pageId, rows)
                  }}
                />
              )
            })}
          </SidebarMenu>
        </SidebarGroup>

        {/* Settings - Hidden when sidebar minimized */}
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel className="text-sidebar-foreground/50 font-medium tracking-wide uppercase text-[10px] mt-2 mb-1 px-2">Settings</SidebarGroupLabel>
          <SidebarMenu>
            <Collapsible open={settingsOpen} onOpenChange={setSettingsOpen}>
              <SidebarMenuItem>
                <CollapsibleTrigger asChild>
                  <SidebarMenuButton>
                    <Settings2 className="h-4 w-4" />
                    <span>Settings</span>
                    <ChevronRight className={`ml-auto h-4 w-4 transition-transform ${settingsOpen ? 'rotate-90' : ''}`} />
                  </SidebarMenuButton>
                </CollapsibleTrigger>
                <CollapsibleContent>
                  <SidebarMenuSub>
                    {/* Manager-only items */}
                    {isManager && (
                      <>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild>
                            <a href="#settings">
                              <Key className="h-3.5 w-3.5" />
                              <span>API Keys</span>
                            </a>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                        <SidebarMenuSubItem>
                          <SidebarMenuSubButton asChild>
                            <a href="#users">
                              <Users className="h-3.5 w-3.5" />
                              <span>Users</span>
                            </a>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      </>
                    )}
                    {/* All users can see Notifications */}
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild>
                        <a href="#settings">
                          <Bell className="h-3.5 w-3.5" />
                          <span>Notifications</span>
                        </a>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                  </SidebarMenuSub>
                </CollapsibleContent>
              </SidebarMenuItem>
            </Collapsible>
          </SidebarMenu>
        </SidebarGroup >
      </SidebarContent >

      <SidebarFooter className="bg-sidebar p-0" />
    </Sidebar >
  )
}
