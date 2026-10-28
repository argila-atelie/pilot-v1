"use client";

import { useState } from "react";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export default function LoginPage() {
  const [isRegistering, setIsRegistering] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccessMsg("");

    if (!isSupabaseConfigured) {
      setError("Configure NEXT_PUBLIC_SUPABASE_URL e NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY (ou NEXT_PUBLIC_SUPABASE_ANON_KEY) para ativar o acesso.");
      setLoading(false);
      return;
    }

    try {
      if (isRegistering) {
        const { error: signUpError } = await supabase.auth.signUp({ email, password });
        if (signUpError) {
          setError(signUpError.message);
        } else {
          setSuccessMsg("Conta criada com sucesso! Faça login ou verifique seu e-mail.");
          setIsRegistering(false);
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) setError(signInError.message);
      }
    } catch (authError) {
      setError(authError instanceof Error ? authError.message : "Não foi possível conectar ao serviço de autenticação.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-parchment px-4">
      <div className="bg-white border border-border shadow-2xl rounded p-8 w-full max-w-md">
        <div className="flex flex-col items-center mb-8">
          <div className="font-playfair text-3xl font-black text-gold tracking-wider mb-2">
            Argila
          </div>
          <p className="text-sm text-muted">Gestão de ateliê cerâmico.</p>
        </div>

        {error && (
          <div className="bg-[#fdebea] border border-[#f5b3b3] text-[#8b2020] text-xs p-3 rounded mb-4">
            {error}
          </div>
        )}
        
        {successMsg && (
          <div className="bg-[#e8f5e9] border border-[#a5d6a7] text-[#2e7d32] text-xs p-3 rounded mb-4">
            {successMsg}
          </div>
        )}

        <form onSubmit={handleAuth} className="space-y-5">
          <div>
            <label className="block text-[0.72rem] font-semibold text-muted mb-1.5 tracking-wider uppercase">E-mail</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full font-sans text-sm px-3.5 py-3 border border-border rounded bg-parchment text-ink focus:border-gold outline-none transition-colors"
              placeholder="voce@seuatelie.com.br"
            />
          </div>
          <div>
             <label className="block text-[0.72rem] font-semibold text-muted mb-1.5 tracking-wider uppercase">Senha</label>
             <input 
              type="password" 
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full font-sans text-sm px-3.5 py-3 border border-border rounded bg-parchment text-ink focus:border-gold outline-none transition-colors"
              placeholder="••••••••"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            className={`w-full inline-flex items-center justify-center gap-2 px-4 py-3.5 rounded-[3px] text-sm font-semibold tracking-wider uppercase text-white transition-all shadow-md mt-2 disabled:opacity-50 ${isRegistering ? 'bg-ink hover:bg-black' : 'bg-gold hover:bg-gold-light'}`}
          >
            {loading ? "Processando..." : (isRegistering ? "Criar Conta Segura" : "Acessar Plataforma")}
          </button>
        </form>

        <div className="mt-6 text-center text-xs text-muted">
           {isRegistering ? "Já tem sua conta?" : "Ainda não tem conta?"} 
           <button 
             onClick={() => { setIsRegistering(!isRegistering); setError(""); setSuccessMsg(""); }}
             className="text-gold font-semibold underline ml-1 cursor-pointer bg-transparent border-none"
           >
             {isRegistering ? "Faça login" : "Criar acesso restrito"}
           </button>
        </div>
      </div>
    </div>
  );
}
