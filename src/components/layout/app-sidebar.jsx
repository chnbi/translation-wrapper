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
  useSidebar,
} from "@/components/ui/sidebar"
import { useProjects } from "@/context/ProjectContext"
import { useGlossary } from "@/context/GlossaryContext"
import { usePrompts } from "@/context/PromptContext"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

// WordFlow Logo Component - matching Figma design
function WordFlowLogo() {
  const { state } = useSidebar()
  const isCollapsed = state === "collapsed"

  return (
    <a href="#" className="flex items-center gap-2.5 px-1 hover:opacity-80 transition-opacity cursor-pointer">
      {/* Logo Icon - Pink gradient flower/sparkle */}
      <div className="relative flex h-8 w-8 shrink-0 items-center justify-center">
        <svg
          width="32"
          height="32"
          viewBox="0 0 32 32"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Main flower petals */}
          <path
            d="M16 4C16 4 20 8 20 12C20 16 16 20 16 20C16 20 12 16 12 12C12 8 16 4 16 4Z"
            fill="url(#petal1)"
          />
          <path
            d="M28 16C28 16 24 20 20 20C16 20 12 16 12 16C12 16 16 12 20 12C24 12 28 16 28 16Z"
            fill="url(#petal2)"
          />
          <path
            d="M16 28C16 28 12 24 12 20C12 16 16 12 16 12C16 12 20 16 20 20C20 24 16 28 16 28Z"
            fill="url(#petal3)"
          />
          <path
            d="M4 16C4 16 8 12 12 12C16 12 20 16 20 16C20 16 16 20 12 20C8 20 4 16 4 16Z"
            fill="url(#petal4)"
          />
          {/* Center circle */}
          <circle cx="16" cy="16" r="3" fill="#FF6B9D" />
          <defs>
            <linearGradient id="petal1" x1="16" y1="4" x2="16" y2="20" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FF8FB1" />
              <stop offset="1" stopColor="#FF6B9D" />
            </linearGradient>
            <linearGradient id="petal2" x1="28" y1="16" x2="12" y2="16" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FF8FB1" />
              <stop offset="1" stopColor="#FF6B9D" />
            </linearGradient>
            <linearGradient id="petal3" x1="16" y1="28" x2="16" y2="12" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FF8FB1" />
              <stop offset="1" stopColor="#FF6B9D" />
            </linearGradient>
            <linearGradient id="petal4" x1="4" y1="16" x2="20" y2="16" gradientUnits="userSpaceOnUse">
              <stop stopColor="#FF8FB1" />
              <stop offset="1" stopColor="#FF6B9D" />
            </linearGradient>
          </defs>
        </svg>
      </div>
      {/* Brand Name - hidden when collapsed */}
      {!isCollapsed && (
        <span className="text-lg font-semibold text-sidebar-foreground tracking-tight">
          WordFlow
        </span>
      )}
    </a>
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
    title: "Translate",
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
function ProjectWithPages({ project, pages, isActive, currentHash }) {
  const [isOpen, setIsOpen] = React.useState(isActive)

  return (
    <Collapsible open={isOpen} onOpenChange={setIsOpen}>
      <SidebarMenuItem>
        <CollapsibleTrigger asChild>
          <SidebarMenuButton
            tooltip={project.name}
            isActive={isActive}
          >
            <Folder className="h-4 w-4" />
            <span>{project.name}</span>
            <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub>
            {pages.map((page) => {
              const isActivePage = currentHash.includes(`page=${page.id}`) ||
                (isActive && currentHash === `#project/${project.id}` && pages[0]?.id === page.id)
              return (
                <SidebarMenuSubItem key={page.id}>
                  <SidebarMenuSubButton
                    asChild
                    isActive={isActivePage}
                  >
                    <a href={`#project/${project.id}?page=${page.id}`}>
                      <span>{page.name}</span>
                    </a>
                  </SidebarMenuSubButton>
                </SidebarMenuSubItem>
              )
            })}
          </SidebarMenuSub>
        </CollapsibleContent>
      </SidebarMenuItem>
    </Collapsible>
  )
}

export function AppSidebar({ ...props }) {
  const { projects, getProjectPages, getPageRows, getProjectRows } = useProjects()
  const { terms: glossaryTerms } = useGlossary()
  const { prompts } = usePrompts()
  const [settingsOpen, setSettingsOpen] = React.useState(true)
  const [currentHash, setCurrentHash] = React.useState(window.location.hash)

  // Listen for hash changes
  React.useEffect(() => {
    const handleHashChange = () => setCurrentHash(window.location.hash)
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

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

  const glossaryPendingCount = glossaryTerms.filter(t => t.status === 'review').length
  const projectsInProgress = projects.filter(p => p.status === 'in-progress').length

  // Dynamic nav items with badges
  const navEssentialsWithBadges = [
    { title: "Projects", url: "#projects", icon: Folder, badge: projectsInProgress },
    { title: "Glossary", url: "#glossary", icon: BookOpen, badge: glossaryPendingCount },
    { title: "Approvals", url: "#approvals", icon: Edit3, badge: pendingApprovals },
    { title: "Translate", url: "#image-translate", icon: Languages },
    { title: "Prompt Library", url: "#prompt", icon: Library },
  ]

  // Dynamic projects list (show up to 5 recent, sorted by lastUpdated)
  const navProjects = [...projects]
    .sort((a, b) => new Date(b.lastUpdated || 0) - new Date(a.lastUpdated || 0))
    .slice(0, 5)


  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar" {...props}>
      <SidebarHeader className="bg-sidebar text-sidebar-foreground pt-5 pb-4 px-4 transition-all">
        {/* WordFlow Logo */}
        <WordFlowLogo />
      </SidebarHeader>

      <SidebarContent className="bg-sidebar text-sidebar-foreground/80 px-2 pt-2 gap-4">
        {/* Essentials */}
        <NavMain items={navEssentialsWithBadges} />

        {/* Recent Projects - Hidden when sidebar minimized */}
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel className="text-sidebar-foreground/50 font-medium tracking-wide uppercase text-[10px] mt-2 mb-1 px-2">Recent projects</SidebarGroupLabel>
          <SidebarMenu>
            {navProjects.map((project) => {
              const pages = getProjectPages(project.id)
              const hasPages = pages && pages.length >= 1
              const isActiveProject = currentHash.includes(`project/${project.id}`)

              // If project has multiple pages, show as collapsible
              if (hasPages) {
                return (
                  <ProjectWithPages
                    key={project.id}
                    project={project}
                    pages={pages}
                    isActive={isActiveProject}
                    currentHash={currentHash}
                  />
                )
              }

              // Single page project - simple link
              return (
                <SidebarMenuItem key={project.id}>
                  <SidebarMenuButton
                    asChild
                    tooltip={project.name}
                    isActive={isActiveProject}
                  >
                    <a href={`#project/${project.id}`}>
                      <Folder className="h-4 w-4" />
                      <span>{project.name}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
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
                        <a href="#settings">
                          <Users className="h-3.5 w-3.5" />
                          <span>User Roles</span>
                        </a>
                      </SidebarMenuSubButton>
                    </SidebarMenuSubItem>
                    <SidebarMenuSubItem>
                      <SidebarMenuSubButton asChild>
                        <a href="#settings">
                          <Bell className="h-3.5 w-3.5" />
                          <span>Notification</span>
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
