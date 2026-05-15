"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";

export default function RootPage() {
  const router = useRouter();
  const { firebaseUser, loading } = useAuth();

  useEffect(() => {
    if (!loading) {
      if (firebaseUser) {
        router.push("/home");
      } else {
        router.push("/login");
      }
    }
  }, [firebaseUser, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
        <p className="text-gray-600 dark:text-gray-400">Yüklənir...</p>
      </div>
    </div>
  );
}

