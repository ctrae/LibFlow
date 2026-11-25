import type { Metadata } from "next";
import { Geist, Hepta_Slab } from "next/font/google";
import { AuthProvider } from "../hooks/useAuth";
import { Toaster } from "../ui/toaster";
import "./globals.css";
import { TanStackQueryClientProvider } from "./shared/providers/QueryClientProvider";

const heptaSlab = Hepta_Slab({
  variable: "--font-hepta-slab",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "LIBFLOW",
  description: "Library session and occupancy management",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${heptaSlab.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <TanStackQueryClientProvider>{children}</TanStackQueryClientProvider>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
