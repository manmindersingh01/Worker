import { redirect } from "next/navigation";
import Link from "next/link";
import { BookOpenText, FileText } from "lucide-react";

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
} from "../../../../components/ui/sidebar";
import { db } from "~/server/db";
import { auth } from "~/server/auth";

export async function AppSidebar() {
  const session = await auth();
  if (!session?.user) {
    redirect("/signin");
  }

  const items = await db.pdfChatSession.findMany({
    where: {
      userId: session.user.id,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <Sidebar>
      <SidebarHeader>
        <Link href="/chatroom" className="flex items-center gap-2 px-1 py-1.5">
          <span className="grid h-8 w-8 shrink-0 place-items-center rounded-lg bg-gradient-to-br from-[hsl(var(--grad-from))] via-[hsl(var(--grad-via))] to-[hsl(var(--grad-to))] text-background shadow-[0_0_18px_-4px_hsl(var(--grad-from)/0.7)]">
            <BookOpenText className="h-4 w-4" aria-hidden />
          </span>
          <span className="text-base font-bold tracking-tight">Levia</span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Your PDF chats</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.id}>
                  <SidebarMenuButton asChild>
                    <Link href={`/pdfchat/${item.id}`}>
                      <FileText className="h-4 w-4 shrink-0" aria-hidden />
                      <span className="truncate">{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
              {items.length === 0 && (
                <p className="px-2 py-1.5 text-xs text-muted-foreground">
                  No chats yet.
                </p>
              )}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
