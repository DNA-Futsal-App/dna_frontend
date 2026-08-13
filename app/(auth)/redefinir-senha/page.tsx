"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { KeyRound, LoaderCircle } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { clientApi } from "@/lib/client-api";

export default function ResetPasswordPage() { return <Suspense><ResetPassword /></Suspense>; }

function ResetPassword() {
  const router = useRouter(); const token = useSearchParams().get("token") ?? "";
  const [loading, setLoading] = useState(false); const [error, setError] = useState("");
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); const form = new FormData(event.currentTarget); const newPassword = String(form.get("newPassword") ?? "");
    if (newPassword !== form.get("confirmation")) return setError("As senhas precisam ser iguais.");
    if (!token) return setError("O link de redefinição está incompleto.");
    setLoading(true); setError("");
    try { await clientApi("/api/auth/password-reset/confirm", { method: "POST", body: JSON.stringify({ token, newPassword }) }); router.push("/entrar?passwordChanged=1"); }
    catch (err) { setError(err instanceof Error ? err.message : "Não foi possível alterar a senha."); setLoading(false); }
  }
  return (
    <AuthShell eyebrow="Nova senha" title="Proteja sua conta." description="Use pelo menos 10 caracteres. Todas as sessões antigas serão encerradas." backHref="/entrar">
      <form onSubmit={submit} className="grid gap-4"><label className="grid gap-1.5 text-sm font-bold">Nova senha<input className="field" name="newPassword" type="password" autoComplete="new-password" minLength={10} maxLength={72} required /></label><label className="grid gap-1.5 text-sm font-bold">Confirmar nova senha<input className="field" name="confirmation" type="password" autoComplete="new-password" minLength={10} required /></label>{error ? <p className="text-sm text-coral" role="alert">{error}</p> : null}<button className="btn-primary mt-2 w-full" disabled={loading}>{loading ? <LoaderCircle className="size-5 animate-spin" /> : <KeyRound className="size-5" />}{loading ? "Alterando..." : "Definir nova senha"}</button></form>
    </AuthShell>
  );
}
