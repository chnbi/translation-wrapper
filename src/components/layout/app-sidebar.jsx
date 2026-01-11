import * as React from "react"
import {
  Settings2,
  Languages,
  BookOpen,
  Library,
  Folder,
  Search,
  FileText,
  CheckSquare,
  LayoutDashboard,
  Key,
  Users,
  Bell,
  ChevronDown,
  ChevronRight,
} from "lucide-react"

import { NavMain } from "./nav-main"
import { NavUser } from "./nav-user"
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
} from "@/components/ui/sidebar"
import { useAuth } from "@/App"
import { useProjects } from "@/context/ProjectContext"
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible"

// Navigation Groups - matching Figma design
const navEssentials = [
  {
    title: "Overview",
    url: "#",
    icon: LayoutDashboard,
  },
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
    title: "Prompt Library",
    url: "#prompt",
    icon: Library,
  },
  {
    title: "Approvals",
    url: "#approvals",
    icon: CheckSquare,
  },
  {
    title: "Translate",
    url: "#image-translate",
    icon: Languages,
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
            className={isActive ? 'bg-pink-50 text-pink-600 font-medium rounded-lg' : 'hover:bg-gray-50'}
          >
            <Folder className="h-4 w-4" />
            <span>{project.name}</span>
            <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
          </SidebarMenuButton>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <SidebarMenuSub style={{ paddingLeft: '24px', marginTop: '4px' }}>
            {pages.map((page) => {
              const isActivePage = currentHash.includes(`page=${page.id}`) ||
                (isActive && currentHash === `#project/${project.id}` && pages[0]?.id === page.id)
              return (
                <SidebarMenuSubItem key={page.id} style={{ marginBottom: '2px' }}>
                  <SidebarMenuSubButton
                    asChild
                    isActive={isActivePage}
                    className={isActivePage ? 'bg-pink-50 text-pink-600 font-medium' : 'hover:bg-gray-50'}
                    style={{
                      padding: '8px 12px',
                      fontSize: '14px'
                    }}
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
  const { user } = useAuth()
  const { projects, getProjectPages } = useProjects()
  const [settingsOpen, setSettingsOpen] = React.useState(true)
  const [currentHash, setCurrentHash] = React.useState(window.location.hash)

  // Listen for hash changes
  React.useEffect(() => {
    const handleHashChange = () => setCurrentHash(window.location.hash)
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  // Dynamic projects list (show up to 5 recent, sorted by lastUpdated)
  const navProjects = [...projects]
    .sort((a, b) => new Date(b.lastUpdated || 0) - new Date(a.lastUpdated || 0))
    .slice(0, 5)


  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar" {...props}>
      <SidebarHeader className="bg-sidebar text-sidebar-foreground pt-6 pb-2 px-4 transition-all">
        {/* User Profile at Top */}
        <NavUser user={{
          name: user?.displayName || 'Dev User',
          email: user?.email || 'dev@example.com',
          avatar: user?.photoURL || '',
        }} />

        {/* Search Bar */}
        <div className="mt-4 relative group-data-[collapsible=icon]:hidden">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-sidebar-foreground/50" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full bg-white/70 hover:bg-white focus:bg-white text-sidebar-foreground placeholder:text-sidebar-foreground/50 rounded-lg py-2 pl-9 pr-4 text-sm outline-none transition-colors border border-sidebar-border focus:border-sidebar-primary/30 shadow-sm"
          />
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-sidebar text-sidebar-foreground/80 px-2 pt-2 gap-4">
        {/* Essentials */}
        <NavMain label="Essentials" items={navEssentials} />

        {/* Recent Projects - Hidden when sidebar minimized */}
        <SidebarGroup className="group-data-[collapsible=icon]:hidden">
          <SidebarGroupLabel className="text-sidebar-foreground/50 font-medium tracking-wide uppercase text-[10px] mt-2 mb-1 px-2">Recent projects</SidebarGroupLabel>
          <SidebarMenu>
            {navProjects.map((project) => {
              const pages = getProjectPages(project.id)
              const hasPages = pages && pages.length > 1
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
                    className={isActiveProject ? 'bg-pink-50 text-pink-600 font-medium rounded-lg' : 'hover:bg-gray-50'}
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
