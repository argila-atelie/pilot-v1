"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { AuthProvider } from "@/context/AuthContext";

export function ClientLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const isSupportedRoute = pathname === "/" || pathname === "/login";

  useEffect(() => {
    if (!isSupportedRoute) router.replace("/");
  }, [isSupportedRoute, router]);

  return (
    <AuthProvider>
      {isSupportedRoute ? children : (
        <div className="grid min-h-screen place-items-center bg-parchment text-sm text-muted">Abrindo Argila…</div>
      )}
    </AuthProvider>
  );
}
