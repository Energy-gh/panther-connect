import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Panther Connect",
  description: "Inteligencia em lubrificantes automotivos",
  metadataBase: new URL("https://web-luiz-2712s-projects.vercel.app"),
  openGraph: {
    title: "Panther Connect",
    description: "Inteligencia em lubrificantes automotivos",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#0a0a0f",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className={`${geistSans.variable} h-full antialiased dark`} suppressHydrationWarning>
      <body className="min-h-full bg-background text-foreground">
        {children}
      </body>
    </html>
  );
}
