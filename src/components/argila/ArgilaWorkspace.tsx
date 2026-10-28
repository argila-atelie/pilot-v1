"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type ArgilaMessage = {
  type: "ARGILA_READY" | "ARGILA_SAVE" | "ARGILA_SIGN_OUT";
  payload?: Record<string, unknown>;
};

export function ArgilaWorkspace() {
  const { user, signOut } = useAuth();
  const frameRef = useRef<HTMLIFrameElement>(null);
  const revisionRef = useRef(0);
  const frameReadyRef = useRef(false);
  const cloudReadyRef = useRef(false);
  const pendingPayloadRef = useRef<Record<string, unknown> | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveQueueRef = useRef<Promise<void>>(Promise.resolve());
  const savePendingRef = useRef<() => Promise<void>>(async () => {});
  const dirtyRef = useRef(false);
  const [ready, setReady] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [recoveryPayload, setRecoveryPayload] = useState<Record<string, unknown> | null>(null);
  const recoveryKey = `argila_recovery_${user?.id ?? ""}`;

  const hydrateFrame = useCallback((payload: Record<string, unknown> | null) => {
    frameRef.current?.contentWindow?.postMessage(
      { type: "ARGILA_HYDRATE", payload },
      window.location.origin,
    );
  }, []);

  useEffect(() => {
    if (!user || !isSupabaseConfigured) return;
    let active = true;

    const loadWorkspace = async () => {
      const { data, error: loadError } = await supabase
        .from("argila_workspace_data")
        .select("payload, revision")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!active) return;
      if (loadError) {
        setError(`Não foi possível carregar os dados. Confira a migração SQL do Argila: ${loadError.message}`);
        return;
      }

      revisionRef.current = data?.revision ?? 0;
      pendingPayloadRef.current = data?.payload ?? null;
      try {
        const savedRecovery = window.localStorage.getItem(recoveryKey);
        if (savedRecovery) {
          const parsed: unknown = JSON.parse(savedRecovery);
          if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
            setRecoveryPayload(parsed as Record<string, unknown>);
          }
        }
      } catch {
        window.localStorage.removeItem(recoveryKey);
      }
      cloudReadyRef.current = true;
      if (frameReadyRef.current) {
        hydrateFrame(pendingPayloadRef.current);
        setReady(true);
      }
    };

    void loadWorkspace();
    return () => {
      active = false;
      cloudReadyRef.current = false;
      frameReadyRef.current = false;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [hydrateFrame, recoveryKey, user]);

  useEffect(() => {
    if (!user) return;

    savePendingRef.current = () => {
      if (!dirtyRef.current || !pendingPayloadRef.current) return saveQueueRef.current;

      saveQueueRef.current = saveQueueRef.current.then(async () => {
        if (!dirtyRef.current || !pendingPayloadRef.current) return;
        const payloadSnapshot = pendingPayloadRef.current;
        dirtyRef.current = false;
        setSaving(true);
        const { data: newRevision, error: saveError } = await supabase.rpc("save_argila_workspace", {
          p_payload: payloadSnapshot,
          p_expected_revision: revisionRef.current,
        });

        if (saveError) {
          try {
            window.localStorage.setItem(recoveryKey, JSON.stringify(pendingPayloadRef.current ?? payloadSnapshot));
            setRecoveryPayload(pendingPayloadRef.current ?? payloadSnapshot);
          } catch {
            setError("Não foi possível sincronizar nem criar uma cópia local de recuperação. Evite fechar esta página.");
          }
          if (saveError.message.includes("ARGILA_CONFLICT")) {
            dirtyRef.current = false;
            const { data: latest } = await supabase
              .from("argila_workspace_data")
              .select("payload, revision")
              .eq("user_id", user.id)
              .maybeSingle();
            if (latest) {
              revisionRef.current = latest.revision;
              pendingPayloadRef.current = latest.payload;
              hydrateFrame(latest.payload);
            }
            setError("Os dados foram alterados em outra sessão. A versão da nuvem foi carregada e suas alterações locais foram guardadas para recuperação.");
          } else {
            dirtyRef.current = true;
            setError(`Falha ao salvar na nuvem: ${saveError.message}`);
          }
        } else {
          revisionRef.current = Number(newRevision);
          if (pendingPayloadRef.current !== payloadSnapshot) dirtyRef.current = true;
          if (!dirtyRef.current) {
            window.localStorage.removeItem(recoveryKey);
            setRecoveryPayload(null);
          }
          setError("");
        }
        setSaving(false);
      }).catch((saveFailure: unknown) => {
        dirtyRef.current = true;
        try {
          const snapshot = pendingPayloadRef.current;
          if (snapshot) {
            window.localStorage.setItem(recoveryKey, JSON.stringify(snapshot));
            setRecoveryPayload(snapshot);
          }
        } catch {
          // Preserve the unsynced in-memory payload and report the storage failure below.
        }
        setError(saveFailure instanceof Error ? `Falha ao salvar na nuvem: ${saveFailure.message}` : "Falha inesperada ao salvar na nuvem.");
        setSaving(false);
      });

      return saveQueueRef.current;
    };

    const onMessage = async (event: MessageEvent<ArgilaMessage>) => {
      if (event.origin !== window.location.origin || event.source !== frameRef.current?.contentWindow) return;

      if (event.data?.type === "ARGILA_READY") {
        frameReadyRef.current = true;
        if (cloudReadyRef.current) {
          hydrateFrame(pendingPayloadRef.current);
          setReady(true);
        }
        return;
      }

      if (event.data?.type === "ARGILA_SIGN_OUT") {
        if (saveTimerRef.current) {
          clearTimeout(saveTimerRef.current);
          saveTimerRef.current = null;
        }
        await savePendingRef.current();
        await saveQueueRef.current;
        if (dirtyRef.current) {
          setError("Ainda há alterações sem sincronizar. Confira a conexão e tente sair novamente.");
          return;
        }
        window.localStorage.removeItem("argila_db");
        await signOut();
        return;
      }

      if (event.data?.type !== "ARGILA_SAVE" || !event.data.payload || !cloudReadyRef.current) return;

      pendingPayloadRef.current = event.data.payload;
      dirtyRef.current = true;
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(() => {
        saveTimerRef.current = null;
        void savePendingRef.current();
      }, 500);
    };

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [hydrateFrame, recoveryKey, signOut, user]);

  const recoverLocalChanges = () => {
    if (!recoveryPayload) return;
    pendingPayloadRef.current = recoveryPayload;
    dirtyRef.current = true;
    hydrateFrame(recoveryPayload);
    setError("");
    void savePendingRef.current();
  };

  if (!isSupabaseConfigured) {
    return <div className="p-8 text-sm">Configure as credenciais públicas do Supabase para iniciar o Argila.</div>;
  }

  return (
    <div className="relative h-[100dvh] w-full overflow-hidden bg-[#FAF6F0]">
      <iframe
        ref={frameRef}
        title="Argila — Gestão de Ateliê"
        src="/argila/index.html"
        onLoad={() => {
          frameReadyRef.current = true;
          if (cloudReadyRef.current) {
            hydrateFrame(pendingPayloadRef.current);
            setReady(true);
          }
        }}
        className="h-full w-full border-0"
        allow="clipboard-read; clipboard-write"
      />
      {!ready && (
        <div className="absolute inset-0 z-50 flex items-start justify-center bg-white/85 px-4 pt-6">
          <div className={`max-w-2xl rounded-lg px-4 py-3 text-sm shadow-lg ${error ? "bg-red-50 text-red-800" : "bg-white text-[#6B4C35]"}`}>
            {error || "Carregando seus dados do Argila…"}
          </div>
        </div>
      )}
      {ready && (error || recoveryPayload) && (
        <div className="absolute inset-x-0 top-0 z-50 flex justify-center px-4 pt-3 pointer-events-none">
          <div className={`pointer-events-auto max-w-2xl rounded-lg px-4 py-2 text-sm shadow-lg ${error ? "bg-red-50 text-red-800" : "bg-amber-50 text-amber-900"}`}>
            <p>{error || "Há alterações locais guardadas que ainda não foram sincronizadas com a nuvem."}</p>
            {recoveryPayload && (
              <button type="button" onClick={recoverLocalChanges} className="mt-2 rounded bg-red-800 px-3 py-1.5 font-medium text-white">
                Recuperar e tentar salvar minhas alterações
              </button>
            )}
          </div>
        </div>
      )}
      {ready && !error && saving && (
        <div className="absolute right-3 top-3 z-40 rounded-md bg-white/90 px-2.5 py-1 text-[11px] text-[#6B4C35] shadow-sm pointer-events-none">
          Salvando na nuvem…
        </div>
      )}
    </div>
  );
}
