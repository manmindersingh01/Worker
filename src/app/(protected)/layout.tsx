import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { SidebarProvider } from "~/components/ui/sidebar";
import { getUserSession } from "~/hooks/getUser";
import App_sidebar from "./app_sidebar";
import Logout from "~/components/logout";

const Layout = async ({ children }: { children: React.ReactNode }) => {
  // const session = await getUserSession();

  return (
    <SidebarProvider>
      <App_sidebar />
      <main className="m-2 w-full">
        <div className="flex items-center justify-between gap-2 rounded-lg border border-sidebar-border bg-sidebar p-4">
          {/* <Avatar>
            <AvatarImage src={session.user?.image ?? ""} />
            <AvatarFallback>{session.user?.name ?? "User"}</AvatarFallback>
          </Avatar> */}
          {/* <Logout /> */}
        </div>
        <div className="mt-2 h-screen w-full rounded-lg border border-primary p-2">
          {children}
        </div>
      </main>
    </SidebarProvider>
  );
};

export default Layout;
