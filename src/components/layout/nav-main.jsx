"use client"

import * as React from "react"
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuBadge,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

export function NavMain({
  items,
  label
}) {
  // Track current hash to determine active item
  const [currentHash, setCurrentHash] = React.useState(window.location.hash)

  React.useEffect(() => {
    const handleHashChange = () => setCurrentHash(window.location.hash)
    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

  // Determine if an item is active based on current hash
  const isItemActive = (itemUrl) => {
    const hash = currentHash.replace('#', '') || ''
    const url = itemUrl?.replace('#', '') || ''

    // Overview is active when hash is empty or /
    if (url === '' && (hash === '' || hash === '/')) return true

    // Exact match for other items
    if (url && hash === url) return true

    // Check if current route starts with item url (for nested routes)
    if (url && url !== '' && hash.startsWith(url + '/')) return true

    return false
  }

  return (
    <SidebarGroup>
      {label && <SidebarGroupLabel className="text-sidebar-foreground/50 font-medium tracking-wide uppercase text-[10px] mt-2 mb-1 px-2">{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => {
            const active = isItemActive(item.url);
            return (
              <SidebarMenuItem key={item.url || item.title}>
                <SidebarMenuButton
                  asChild
                  tooltip={item.title}
                  isActive={active}
                  className={cn(
                    "text-gray-900", // Keep base text color, variants handle hover/active
                    active && "font-bold"
                  )}
                >
                  <a href={item.url}>
                    {item.icon && <item.icon className={cn(active ? "text-sidebar-primary-foreground" : "text-gray-500")} />}
                    <span>{item.title}</span>
                  </a>
                </SidebarMenuButton>
                {item.badge > 0 && (
                  <div className="absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none">
                    <span className="flex items-center justify-center min-w-[20px] h-[20px] rounded-full bg-secondary-pink text-white text-[10px] font-bold px-1">
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  </div>
                )}
              </SidebarMenuItem>
            )
          })}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
