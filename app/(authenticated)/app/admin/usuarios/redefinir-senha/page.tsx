"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import { ArrowLeft, CheckCircle2, ClipboardCopy, KeyRound, LoaderCircle, ShieldAlert } from "lucide-react";
import { clientApi } from "@/lib/client-api";

type Access = "checking" | "allowed" | "forbidden" | "error";
type GeneratedLink = { link: string; expiresAt: string };

const messageFor = (link: string) =>
  `Olá! Segue o link para você redefinir sua senha do DNA Futsal:\n${link}\n` +
  "Por segurança, não compartilhe este link com outras pessoas. Ele tem prazo de validade e deixa de funcionar após a troca da senha.";

export default function AdminPasswordResetPage() {
  const [access, setAccess] = useState<Access>("checking");
  const [email, setEmail] = useState("");
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<GeneratedLink | null>(null);
  const [copied, setCopied] = useState<"link" | "message" | null>(null);

  useEffect(() => {
    const controller = new AbortController();
    clientApi<void>("/api/admin/password-reset", { signal: controller.signal, cache: "no-store" })
      .then(() => { if (!controller.signal.aborted) setAccess("allowed"); })
      .catch((reason: unknown) => {
        if (controller.signal.aborted) return;
        const status = reason && typeof reason === "object" && "status" in reason
          ? (reason as { status?: number }).status : undefined;
        setAccess(status === 403 ? "forbidden" : "error");
      });
    return () => controller.abort();
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (generating || access !== "allowed") return;
    setGenerating(true);
    setError("");
    setResult(null);
    setCopied(null);
    try {
      const response = await clientApi<GeneratedLink>("/api/admin/password-reset", {
        method: "POST",
        cache: "no-store",
        body: JSON.stringify({ email: email.trim() }),
      });
      setResult(response);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Não foi possível gerar o link.");
    } finally {
      setGenerating(false);
    }
  }

  async function copy(value: string, kind: "link" | "message") {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(kind);
    } catch {
      setError("Não foi possível copiar automaticamente. Selecione o link abaixo para copiar manualmente.");
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/app/admin/premio-dna" className="inline-flex items-center gap-2 text-sm font-bold text-muted hover:text-cyan">
        <ArrowLeft className="size-4" /> Voltar ao painel administrativo
      </Link>
      <header className="mb-6 mt-6">
        <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-cyan">
          <KeyRound className="size-4" /> Administração de usuários
        </p>
        <h1 className="display-title mt-3 text-3xl sm:text-4xl">Redefinição de senha</h1>
        <p className="mt-3 text-sm leading-relaxed text-muted">
          Gere um link individual para o usuário e compartilhe pelo WhatsApp, Instagram ou canal desejado.
          Nenhum e-mail será enviado por esta operação.
        </p>
      </header>

      <section className="rounded-3xl border border-white/10 bg-panel p-5 sm:p-8">
        {access === "checking" ? (
          <p className="flex items-center gap-2 text-sm text-muted" role="status">
            <LoaderCircle className="size-5 animate-spin" /> Verificando permissão administrativa...
          </p>
        ) : access === "forbidden" ? (
          <p className="flex items-center gap-2 text-sm text-coral" role="alert">
            <ShieldAlert className="size-5" /> Apenas administradores podem usar esta função.
          </p>
        ) : access === "error" ? (
          <p className="text-sm text-coral" role="alert">Não foi possível verificar sua permissão. Recarregue a página.</p>
        ) : (
          <form onSubmit={submit} className="grid gap-5">
            <label className="grid gap-2 text-sm font-bold" htmlFor="reset-email">
              E-mail cadastrado do usuário
              <input
                id="reset-email"
                className="field"
                type="email"
                autoComplete="off"
                inputMode="email"
                maxLength={254}
                required
                placeholder="usuario@exemplo.com"
                value={email}
                onChange={(event) => { setEmail(event.target.value); setResult(null); setCopied(null); }}
                disabled={generating}
              />
            </label>
            <p className="text-xs leading-relaxed text-muted">
              A conta precisa estar ativa. Valem o prazo de expiração configurado no servidor e
              o limite de três solicitações diárias por conta (inclusive solicitações públicas).
            </p>
            <button className="btn-primary w-full sm:w-fit" type="submit" disabled={generating || !email.trim()}>
              {generating ? <LoaderCircle className="size-5 animate-spin" /> : <KeyRound className="size-5" />}
              {generating ? "Gerando link..." : "Gerar link de redefinição"}
            </button>
          </form>
        )}
        {error ? <p className="mt-4 text-sm text-coral" role="alert">{error}</p> : null}
        {result && access === "allowed" ? (
          <section className="mt-6 space-y-4 border-t border-white/10 pt-5" aria-label="Link gerado">
            <p role="status" className="flex items-center gap-2 text-sm font-bold text-cyan">
              <CheckCircle2 className="size-5" /> Link gerado. Copie e envie você mesmo ao usuário.
            </p>
            <label htmlFor="generated-password-reset-link" className="block text-sm font-bold">Link de redefinição</label>
            <input
              id="generated-password-reset-link"
              type="text"
              value={result.link}
              readOnly
              onFocus={(event) => event.currentTarget.select()}
              className="field w-full font-mono text-xs"
              aria-label="Link gerado, selecione e copie"
            />
            <p className="text-xs text-muted">
              Expira em {new Date(result.expiresAt).toLocaleString("pt-BR", {
                timeZone: "America/Sao_Paulo", dateStyle: "short", timeStyle: "short",
              })}. Não publique nem encaminhe a pessoas diferentes do titular.
            </p>
            <div className="flex flex-wrap gap-3">
              <button type="button" className="btn-primary" onClick={() => void copy(result.link, "link")}>
                <ClipboardCopy className="size-4" /> {copied === "link" ? "Link copiado" : "Copiar link"}
              </button>
              <button type="button" className="btn-ghost" onClick={() => void copy(messageFor(result.link), "message")}>
                <ClipboardCopy className="size-4" /> {copied === "message" ? "Mensagem copiada" : "Copiar mensagem pronta"}
              </button>
            </div>
            <p className="text-xs leading-relaxed text-muted">
              A senha será definida exclusivamente pelo usuário na página de redefinição.
              O link desaparece ao sair desta tela e não será recuperado no painel.
            </p>
          </section>
        ) : null}
      </section>
    </div>
  );
}
