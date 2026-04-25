import type { Metadata } from "next";
import localFont from "next/font/local";
import { Geist_Mono } from "next/font/google";
import "./globals.css";

const restartSoft = localFont({
  src: [
    { path: "./fonts/RestartSoft-Light.otf", weight: "300", style: "normal" },
    { path: "./fonts/RestartSoft-SemiBold.otf", weight: "600", style: "normal" },
  ],
  variable: "--font-heading",
  display: "swap",
  adjustFontFallback: "Arial",
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Wayfinder — Your crypto agent, your way.",
  description:
    "Deploy autonomous terminal agents that navigate the blockchain landscape. High-performance infrastructure for the next generation of digital finance.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`dark ${restartSoft.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground font-sans">
        {children}
      </body>
    </html>
  );
}
