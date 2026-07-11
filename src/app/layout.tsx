import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  title: "Finance Tracker",
  description: "Personal finance tracker",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full">
      <body className="h-full flex bg-gray-50 text-gray-900">
        <aside className="w-56 bg-white border-r border-gray-200 flex flex-col p-6 gap-2">
          <span className="text-lg font-bold mb-6">Finance Tracker</span>
          <Link href="/" className="px-3 py-2 rounded hover:bg-gray-100">Dashboard</Link>
          <Link href="/accounts" className="px-3 py-2 rounded hover:bg-gray-100">Accounts</Link>
          <Link href="/transactions" className="px-3 py-2 rounded hover:bg-gray-100">Transactions</Link>
          <Link href="/portfolio" className="px-3 py-2 rounded hover:bg-gray-100">Portfolio</Link>
        </aside>
        <main className="flex-1 p-8 overflow-y-auto">
          {children}
        </main>
      </body>
    </html>
  );
}
