import { ServiceWorkerRegister } from "@/components/pwa/ServiceWorkerRegister";
import { SyncProvider } from "@/components/pwa/SyncProvider";
import { UpdateBanner } from "@/components/pwa/UpdateBanner";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import type { Metadata, Viewport } from "next";
import {
  Bricolage_Grotesque,
  IBM_Plex_Mono,
  IBM_Plex_Sans,
} from "next/font/google";
import "./globals.css";

const display = Bricolage_Grotesque({
  variable: "--font-display-face",
  subsets: ["latin"],
  display: "swap",
});

const body = IBM_Plex_Sans({
  variable: "--font-body-face",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const mono = IBM_Plex_Mono({
  variable: "--font-mono-face",
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Jacked",
    template: "%s · Jacked",
  },
  description:
    "Personal fitness partner for logging workouts, tracking body weight, and honest progression.",
  applicationName: "Jacked",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Jacked",
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/icons/apple-touch-icon.png", sizes: "180x180" }],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#C3FA08" },
    { media: "(prefers-color-scheme: dark)", color: "#C3FA08" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      suppressHydrationWarning
      className={`${display.variable} ${body.variable} ${mono.variable} h-full`}
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){try{var k='jacked.theme';var p=localStorage.getItem(k)||'system';var d=window.matchMedia('(prefers-color-scheme: dark)').matches;var r=p==='dark'|| (p!=='light'&&d);var e=document.documentElement;e.classList.toggle('dark',r);e.style.colorScheme=r?'dark':'light';}catch(e){}})();`,
          }}
        />
      </head>
      <body className="min-h-full font-sans antialiased">
        <ThemeProvider>
          <SyncProvider>
            {children}
            <UpdateBanner />
            <ServiceWorkerRegister />
          </SyncProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
