"use client"

import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

export function NavMain({
  items,
  label
}) {
  return (
    <SidebarGroup>
      {label && <SidebarGroupLabel className="text-sidebar-foreground/50 font-medium tracking-wide uppercase text-[10px] mt-2 mb-1 px-2">{label}</SidebarGroupLabel>}
      <SidebarGroupContent>
        <SidebarMenu>
          {items.map((item) => (
            <SidebarMenuItem key={item.url || item.title}>
              <SidebarMenuButton asChild tooltip={item.title} className="text-sidebar-foreground/70 hover:text-sidebar-primary hover:bg-sidebar-accent active:bg-sidebar-accent active:text-sidebar-primary data-[active=true]:bg-sidebar-accent data-[active=true]:text-sidebar-primary data-[active=true]:shadow-sm transition-all rounded-xl h-10 font-medium">
                <a href={item.url}>
                  {item.icon && <item.icon className="opacity-70 group-hover:opacity-100" />}
                  <span>{item.title}</span>
                </a>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  );
}
