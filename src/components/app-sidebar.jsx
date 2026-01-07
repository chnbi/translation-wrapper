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
} from "lucide-react"

import { NavMain } from "@/components/nav-main"
import { NavUser } from "@/components/nav-user"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
} from "@/components/ui/sidebar"
import { useAuth } from "@/App"
import { useProjects } from "@/context/ProjectContext"

// Navigation Groups
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
    title: "Prompt Library",
    url: "#prompt",
    icon: Library,
  },
  {
    title: "Manage Approvals",
    url: "#approvals",
    icon: CheckSquare,
  },
  {
    title: "Image Translation",
    url: "#image-translate",
    icon: Languages,
  },
]

const navManagement = [
  {
    title: "Settings",
    url: "#settings",
    icon: Settings2,
  },
]

export function AppSidebar({ ...props }) {
  const { user } = useAuth()
  const { projects } = useProjects()

  // Dynamic projects list (show up to 5 recent, sorted by lastUpdated)
  const navProjects = [...projects]
    .sort((a, b) => new Date(b.lastUpdated || 0) - new Date(a.lastUpdated || 0))
    .slice(0, 5)
    .map(project => ({
      title: project.name,
      url: `#project/${project.id}`,
      icon: FileText,
    }))

  return (
    <Sidebar collapsible="icon" className="border-r border-sidebar-border bg-sidebar" {...props}>
      <SidebarHeader className="bg-sidebar text-sidebar-foreground pt-6 pb-2 px-4 transition-all">
        {/* User Profile at Top */}
        <NavUser user={{
          name: user?.displayName || 'Jeffrey',
          email: user?.email || 'jeff@repliq.com',
          avatar: user?.photoURL || '',
        }} />

        {/* Search Bar */}
        <div className="mt-4 relative group-data-[collapsible=icon]:hidden">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-sidebar-foreground/50" />
          <input
            type="text"
            placeholder="Search..."
            className="w-full bg-white/50 hover:bg-white/80 focus:bg-white text-sidebar-foreground placeholder:text-sidebar-foreground/50 rounded-xl py-2 pl-9 pr-4 text-sm outline-none transition-colors border border-transparent focus:border-sidebar-primary/20 shadow-sm"
          />
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-sidebar text-sidebar-foreground/80 px-2 pt-2 gap-6">
        <NavMain label="Essentials" items={navEssentials} />
        <NavMain label="Recent Projects" items={navProjects} />
        <NavMain label="Management" items={navManagement} />
      </SidebarContent>

      <SidebarFooter className="bg-sidebar p-0" />
      <SidebarRail />
    </Sidebar>
  )
}
