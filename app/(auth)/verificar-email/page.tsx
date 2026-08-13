"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { CheckCircle2, LoaderCircle, MailCheck } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { clientApi } from "@/lib/client-api";

export default function VerifyEmailPage() { return <Suspense><VerifyEmail /></Suspense>; }

function VerifyEmail() {
  const login = useSearchParams().get("login") ?? "";
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState("");
  async function resend() {
    setLoading(true); setError("");
    try { await clientApi("/api/auth/email-verification/resend", { method: "POST", body: JSON.stringify({ login }) }); setSent(true); }
    catch (err) { setError(err instanceof Error ? err.message : "Não foi possível reenviar."); }
    finally { setLoading(false); }
  }
  return (
    <AuthShell eyebrow="Último passo" title="Confira seu e-mail." description={`Enviamos um link de confirmação${login ? ` para ${login}` : ""}. Ele fica válido por 24 horas.`}>
      <div className="rounded-2xl border border-cyan/15 bg-cyan/6 p-5 text-center"><MailCheck className="mx-auto size-12 text-cyan" /><p className="mt-4 font-bold text-ivory">Abra o link no e-mail para ativar sua conta.</p><p className="mt-2 text-sm leading-relaxed text-muted">Não encontrou? Verifique spam, promoções ou aguarde um minuto.</p></div>
      {sent ? <p className="mt-4 flex items-center justify-center gap-2 rounded-xl bg-cyan/8 px-3 py-3 text-sm font-bold text-cyan"><CheckCircle2 className="size-4" />Novo e-mail solicitado.</p> : null}
      {error ? <p className="mt-4 text-center text-sm text-coral" role="alert">{error}</p> : null}
      <button type="button" onClick={resend} className="btn-ghost mt-5 w-full" disabled={loading || !login}>{loading ? <LoaderCircle className="size-4 animate-spin" /> : null}{loading ? "Enviando..." : "Reenviar e-mail"}</button>
      <Link href="/entrar" className="mt-3 flex min-h-12 items-center justify-center text-sm font-bold text-amber hover:text-white">Já confirmei, quero entrar</Link>
    </AuthShell>
  );
}
