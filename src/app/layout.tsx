import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { DevelopmentBar } from "@/components/development-bar-view";
import Navbar from "@/components/Navbar";
import ServiceWorkerRegister from "@/components/sw-register";
import { currentSite } from "@/lib/site";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: "#ffffff",
  colorScheme: "light",
};

// The whole app renders per request: four brands selected from the request
// host, database reads on every page, and search params everywhere.
// Nothing here can produce a static shell, so opt the tree out of
// static-shell validation (dynamic rendering, like the uploads route).
export const instant = false;

export async function generateMetadata(): Promise<Metadata> {
  const site = await currentSite();
  return {
    title: site.name,
    description: `Listing your ${site.noun} for sale is free.`,
    manifest: "/manifest.webmanifest",
    appleWebApp: {
      capable: true,
      statusBarStyle: "default",
    },
    icons: {
      icon: [
        { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
        { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      ],
      apple: [
        {
          url: "/icons/apple-touch-icon.png",
          sizes: "180x180",
          type: "image/png",
        },
      ],
    },
  };
}

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="flex min-h-dvh flex-col overflow-x-hidden bg-white text-zinc-900 antialiased">
        <Navbar />
        {children}
        <DevelopmentBar />
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
