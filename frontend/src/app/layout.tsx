import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import TitleBar from "@/components/TitleBar";
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
  title: "Synap",
  description: "A comprehensive study tool with notes and flashcards",
  icons: {
    icon: "/synap-icon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark h-full">
      <body className={`${geistSans.variable} ${geistMono.variable} h-full w-full overflow-hidden flex flex-col`}>
        <TitleBar />
        <main className="flex-1 min-h-0 w-full relative overflow-hidden flex flex-col">
          {children}
        </main>
      </body>
    </html>
  );
}
