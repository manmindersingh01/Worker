import "~/styles/globals.css";

import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import { Bricolage_Grotesque } from "next/font/google";
import { type Metadata } from "next";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-bricolage",
  display: "swap",
});
import QueryProvider from "~/lib/queryProvider";
import { useAuthStore } from "~/lib/store";
import { redirect } from "next/navigation";
import { getUserSession } from "~/hooks/getUser";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Levia — Ask your documents, get answers with receipts",
  description:
    "Upload your PDFs and chat with them. Every answer is grounded in your documents and cited to the exact page.",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${GeistSans.variable} ${GeistMono.variable} ${bricolage.variable}`}
    >
      <body>
        <QueryProvider>
          <main>{children}</main>
        </QueryProvider>
      </body>
    </html>
  );
}
