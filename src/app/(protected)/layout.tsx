import React from "react";
import { Avatar, AvatarFallback, AvatarImage } from "~/components/ui/avatar";
import { SidebarProvider } from "~/components/ui/sidebar";
import { getUserSession } from "~/hooks/getUser";
import App_sidebar from "./app_sidebar";
import Logout from "~/components/logout";
import { auth } from "~/server/auth";

const Layout = async ({ children }: { children: React.ReactNode }) => {
  const data = await auth();

  return (
    <SidebarProvider>
      <App_sidebar />
      <main className="m-2 w-full">
        <div className="flex items-center justify-between gap-2 rounded-lg border border-sidebar-border bg-sidebar p-4">
          <h1 className="">
            <span>Welcome</span>{" "}
            <span className="bg-gradient-to-r from-primary to-transparent bg-clip-text text-lg font-semibold text-transparent sm:text-xl">
              {data.user?.name ?? "User"}
            </span>
          </h1>
          <Avatar>
            <AvatarImage src={data.user?.image ?? ""} />
            <AvatarFallback>{data.user?.name ?? "User"}</AvatarFallback>
          </Avatar>
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
