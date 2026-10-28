"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";
import { User } from "@supabase/supabase-js";
import { useRouter, usePathname } from "next/navigation";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  signOut: () => Promise<void>;
}

const ADMIN_EMAIL = "mantovanicaue@gmail.com";

const AuthContext = createContext<AuthContextType>({ user: null, loading: true, isAdmin: false, signOut: async () => {} });

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const router = useRouter();
  const pathname = usePathname();

  const isAdmin = user?.email === ADMIN_EMAIL;

  useEffect(() => {
    if (!isSupabaseConfigured) return;

    const fetchSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
    };

    void fetchSession().catch(() => {
      setUser(null);
      setLoading(false);
    });

    const { data: authListener } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);
      if (event === "SIGNED_IN") router.push("/");
      if (event === "SIGNED_OUT") router.push("/login");
    });

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [router]);

  useEffect(() => {
    if (!loading && !user && pathname === "/") {
      router.push("/login");
    }
    if (!loading && user && pathname === "/login") {
      router.replace("/");
    }
  }, [user, loading, pathname, router]);

  const signOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, isAdmin, signOut }}>
      {pathname === "/login" || (!loading && user) ? children : (
        <div className="grid min-h-screen place-items-center bg-parchment text-sm text-muted">Carregando Argila…</div>
      )}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
