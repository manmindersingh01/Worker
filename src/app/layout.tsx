import "~/styles/globals.css";

import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";
import QueryProvider from "~/lib/queryProvider";
import { useAuthStore } from "~/lib/store";
import { redirect } from "next/navigation";
import { getUserSession } from "~/hooks/getUser";

export const metadata: Metadata = {
  title: "Cheater",
  description: "Chaeters app",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable}`}>
      <body>
        <QueryProvider>
          <main>{children}</main>
        </QueryProvider>
      </body>
    </html>
  );
}
