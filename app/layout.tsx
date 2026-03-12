import type { Metadata } from "next";
import { Geist } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "YaGo BrainGames",
  description: "Train your brain with fun games",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} font-sans antialiased`}>
        <header className="border-b border-gray-200 bg-white">
          <div className="mx-auto flex max-w-5xl items-center justify-between px-6 py-4">
            <Link href="/" className="text-xl font-bold tracking-tight text-gray-900">
              YaGo BrainGames
            </Link>
          </div>
        </header>
        <main className="mx-auto max-w-5xl px-6 py-8">
          {children}
        </main>
      </body>
    </html>
  );
}
