import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";
import { PostHogProvider } from "@/components/analytics/posthog-provider";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_APP_URL || "https://grantaq.com"),
  title: "GrantAQ — AI-Powered Grant Discovery",
  description: "Find, track, and win grants with AI-powered matching and writing assistance.",
  icons: {
    icon: [
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-48.png", sizes: "48x48", type: "image/png" },
    ],
    apple: "/apple-touch-icon.png",
  },
  openGraph: {
    type: "website",
    siteName: "GrantAQ",
    title: "GrantAQ — Find Grants You Actually Qualify For",
    description:
      "AI matches your organization to 6,000+ active federal, state, and foundation grants — verified nightly. Built for nonprofits and small businesses.",
    // Note: the /og-image.png static file in /public is superseded by
    // src/app/opengraph-image.tsx which generates a proper 1200×630
    // link-preview card at build time. Leave these image URLs out so
    // Next.js picks up the dynamic file conventions.
  },
  twitter: {
    card: "summary_large_image",
    title: "GrantAQ — Find Grants You Actually Qualify For",
    description:
      "AI matches your organization to 6,000+ active grants — verified nightly.",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <PostHogProvider>
            {children}
            <Toaster richColors position="bottom-right" />
          </PostHogProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
