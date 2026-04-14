import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { AppRouterCacheProvider } from "@mui/material-nextjs/v14-appRouter";
import { Providers } from "@/components/Providers";
import { Header } from "@/components/Header";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "500"],
});

export const metadata: Metadata = {
  title: "MorphoClaude - AI DeFi Yield Optimizer",
  description:
    "AI-powered Morpho Vault allocation optimization using Claude Agent SDK",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${jetbrainsMono.variable} dark antialiased`}>
      <body className="min-h-screen bg-[#0a0a0f] text-[#f0f0f5]">
        {/* Aurora gradient background */}
        <div className="aurora-bg" />
        <AppRouterCacheProvider options={{ enableCssLayer: true }}>
          <Providers>
            <Header />
            {children}
          </Providers>
        </AppRouterCacheProvider>
        <Toaster />
      </body>
    </html>
  );
}
