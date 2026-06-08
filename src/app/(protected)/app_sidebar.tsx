"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "~/components/ui/sidebar";
import { BookOpenText } from "lucide-react";
import { cn } from "~/lib/utils";

const items = [
  {
    label: "Home",
    href: "/",
  },
  {
    label: "Chat Room",
    href: "/chatroom",
  },
  {
    label: "Settings",
    href: "/settings",
  },
];

const App_sidebar = () => {
  const pathname = usePathname();
  return (
    <Sidebar collapsible="icon" variant="floating">
      <SidebarHeader>
        <Link href="/" className="flex items-center gap-2 px-1 py-1.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[hsl(var(--grad-from))] via-[hsl(var(--grad-via))] to-[hsl(var(--grad-to))] text-background shadow-[0_0_18px_-4px_hsl(var(--grad-from)/0.7)]">
            <BookOpenText className="h-4 w-4" aria-hidden />
          </span>
          <span className="text-base font-bold tracking-tight">Levia</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.label}>
                  <SidebarMenuButton asChild>
                    <Link
                      href={item.href}
                      className={cn({
                        "!bg-primary !text-white": pathname === item.href,
                      })}
                    >
                      {item.label}
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
};

export default App_sidebar;
