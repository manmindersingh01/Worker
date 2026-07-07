import React from "react";
import { SidebarProvider } from "~/components/ui/sidebar";
import { AppSidebar } from "./appsidebar";

const layout = async ({ children }: { children: React.ReactNode }) => {
  return (
    <SidebarProvider>
      <AppSidebar />
      {/* flex-1 + min-w-0 so the workspace fills the space left by the sidebar
          instead of overflowing the viewport (w-full would push it off-screen).
          The sidebar toggle now lives inside the workspace top bar. */}
      <main className="relative flex h-svh min-w-0 flex-1 flex-col overflow-hidden">
        {children}
      </main>
    </SidebarProvider>
  );
};

export default layout;
