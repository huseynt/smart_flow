"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useRequireAuth } from "@/hooks/useRequireAuth";

export default function AccountSettingsPage() {
  const router = useRouter();
  useRequireAuth();

  // Redirect to main profile page
  useEffect(() => {
    router.push("/settings/profile");
  }, [router]);

  return null;
}
