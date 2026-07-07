import React from "react";
import { redirect } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { SidebarProvider } from "~/components/ui/sidebar";
import { getUserSession } from "~/hooks/getUser";
import App_sidebar from "./app_sidebar";
import Logout from "~/components/logout";
import { auth } from "~/server/auth";

const Layout = async ({ children }: { children: React.ReactNode }) => {
  const data = await auth();

  if (!data?.user) {
    redirect("/signin");
  }

  return (
    <SidebarProvider>
      <App_sidebar />
      <main className="m-2 w-full">
        <div className="flex items-center justify-between gap-2 rounded-lg border border-sidebar-border bg-sidebar p-4">
          <h1 className="text-base sm:text-lg">
            <span className="text-muted-foreground">Welcome</span>{" "}
            <span className="text-gradient font-semibold">
              {data?.user?.name ?? "User"}
            </span>
          </h1>
          <div className="flex items-center gap-3">
            <Avatar className="border border-border">
              <AvatarImage src={data?.user?.image ?? ""} />
              <AvatarFallback className="bg-secondary text-xs font-semibold text-foreground">
                {(data?.user?.name ?? "User")
                  .split(" ")
                  .map((w) => w[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <Logout />
          </div>
        </div>
        <div className="mt-2 min-h-[calc(100dvh-7rem)] w-full rounded-lg border border-border p-2">
          {children}
        </div>
      </main>
    </SidebarProvider>
  );
};

export default Layout;
