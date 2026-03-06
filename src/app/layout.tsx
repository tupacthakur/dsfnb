import type { Metadata } from "next";
import { Syne, DM_Sans, JetBrains_Mono } from "next/font/google";
import "./globals.css";
import { PageWrapper } from "@/components/layout/PageWrapper";

const syne = Syne({
  subsets: ["latin"],
  weight: ["600", "700", "800"],
  variable: "--font-syne",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500"],
  variable: "--font-dm-sans",
});

const jetBrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  weight: ["400", "500", "600"],
  variable: "--font-jetbrains-mono",
});

export const metadata: Metadata = {
  title: "Koravo Command Centre",
  description: "Koravo — Constraint-aware F&B intelligence layer",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body
        className={`${syne.variable} ${dmSans.variable} ${jetBrainsMono.variable} antialiased min-h-screen bg-[var(--surface)] text-[var(--text-primary)]`}
      >
        <PageWrapper>{children}</PageWrapper>
      </body>
    </html>
  );
}
