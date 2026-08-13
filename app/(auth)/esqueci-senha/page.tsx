"use client";

import { FormEvent, useState } from "react";
import { CheckCircle2, LoaderCircle, Send } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { clientApi } from "@/lib/client-api";

export default function ForgotPasswordPage() {
  const [loading, setLoading] = useState(false); const [sent, setSent] = useState(false); const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); setLoading(true); setError("");
    const login = new FormData(event.currentTarget).get("login");
    try { await clientApi("/api/auth/password-reset/request", { method: "POST", body: JSON.stringify({ login }) }); setSent(true); }
    catch (err) { setError(err instanceof Error ? err.message : "Não foi possível enviar o link."); }
    finally { setLoading(false); }
  }
  return (
    <AuthShell eyebrow="Recuperar acesso" title="Vamos redefinir." description="Informe seu e-mail ou telefone. Se a conta existir, enviaremos um link seguro para seu e-mail." backHref="/entrar">
      {sent ? <div className="text-center"><CheckCircle2 className="mx-auto size-14 text-cyan" /><p className="mt-4 font-bold text-ivory">Solicitação recebida.</p><p className="mt-2 text-sm text-muted">Confira sua caixa de entrada. Por segurança, o limite é de três solicitações por dia.</p></div> : <form onSubmit={submit} className="grid gap-4"><label className="grid gap-1.5 text-sm font-bold">E-mail ou telefone<input className="field" name="login" autoComplete="username" required placeholder="voce@email.com ou telefone" /></label>{error ? <p className="text-sm text-coral" role="alert">{error}</p> : null}<button className="btn-primary mt-2 w-full" disabled={loading}>{loading ? <LoaderCircle className="size-5 animate-spin" /> : <Send className="size-5" />}{loading ? "Enviando..." : "Enviar link seguro"}</button></form>}
    </AuthShell>
  );
}
