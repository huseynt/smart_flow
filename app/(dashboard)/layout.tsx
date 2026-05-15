'use client';

import { Sidebar } from "@/components/dashboard/Sidebar";
import { Header } from "@/components/dashboard/Header";

export const dynamic = 'force-dynamic';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col md:ml-0">
        <Header />
        <main className="flex-1 overflow-auto bg-gray-50 dark:bg-gray-800 p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
