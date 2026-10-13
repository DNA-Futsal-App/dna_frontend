"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useEffect, useRef, useState } from "react";
import { Eye, EyeOff, LoaderCircle, LogIn } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { clientApi, ClientApiError } from "@/lib/client-api";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { clearDeletionNotice } from "@/lib/account-deletion";
import type { CoachInviteInfo } from "@/lib/awards-types";

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const params = useSearchParams();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [inviteChecked, setInviteChecked] = useState(false);
  const [pendingCoachInvite, setPendingCoachInvite] = useState(false);
  const [confirmationOpen, setConfirmationOpen] = useState(false);
  const [notice, setNotice] = useState("");
  const pendingCredentials = useRef<{ login: string; password: string } | null>(null);
  const passwordInput = useRef<HTMLInputElement>(null);
  const submitting = useRef(false);
  const [error, setError] = useState(
    params.get("expired")
      ? "Sua sessão expirou. Entre novamente para continuar."
      : "",
  );

  useEffect(() => {
    let active = true;

    clientApi<CoachInviteInfo>("/api/awards/coach-invite/current")
      .then((invite) => {
        if (active) setPendingCoachInvite(invite.available);
      })
      .catch(() => {
        if (active) setPendingCoachInvite(false);
      })
      .finally(() => {
        if (active) setInviteChecked(true);
      });

    return () => {
      active = false;
    };
  }, []);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await login({ login: String(form.get("login") ?? ""), password: String(form.get("password") ?? "") });
  }

  async function login(credentials: { login: string; password: string }, confirmAccountDeletionCancellation = false) {
    if (submitting.current) return;
    submitting.current = true;
    setLoading(true);
    setError("");
    setNotice("");
    try {
      await clientApi("/api/auth/login", {
        method: "POST",
        body: JSON.stringify({ ...credentials, confirmAccountDeletionCancellation }),
      });
      pendingCredentials.current = null;
      clearDeletionNotice();
      // A confirmação de reativação leva à página inicial, conforme o fluxo da conta.
      if (confirmAccountDeletionCancellation) {
        window.location.replace("/app");
        return;
      }
      if (pendingCoachInvite) {
        await clientApi("/api/awards/coach-invite/claim", {
          method: "POST",
        });

        window.location.replace("/app/votacao-treinador-v2");
        return;
      }

      window.location.replace("/app");
    } catch (err) {
      if (err instanceof ClientApiError && err.status === 403
        && err.problem?.code === "ACCOUNT_PENDING_DELETION" && !confirmAccountDeletionCancellation) {
        pendingCredentials.current = credentials;
        if (passwordInput.current) passwordInput.current.value = "";
        setConfirmationOpen(true);
        return;
      }
      pendingCredentials.current = null;
      setConfirmationOpen(false);
      if (passwordInput.current) passwordInput.current.value = "";
      if (err instanceof ClientApiError && err.problem?.code === "ACCOUNT_DELETION_CANCELLED_LOGIN_REQUIRED") {
        clearDeletionNotice();
      }
      setError(
        confirmAccountDeletionCancellation && (!(err instanceof ClientApiError) || err.problem?.code === "BACKEND_UNAVAILABLE")
          ? "Não foi possível confirmar o resultado. Tente entrar novamente; se a exclusão ainda estiver agendada, pediremos sua confirmação."
          : err instanceof Error
          ? err.message
          : "Não foi possível entrar na sua conta.",
      );
    } finally {
      submitting.current = false;
      setLoading(false);
    }
  }

  function declineCancellation() {
    if (submitting.current) return;
    pendingCredentials.current = null;
    setConfirmationOpen(false);
    setError("");
    setNotice("Você não confirmou o cancelamento. A exclusão continua agendada.");
  }

  return (
    <AuthShell
      eyebrow="Bem-vindo de volta"
      title="Entre em quadra."
      description="Use seu e-mail ou telefone e acompanhe tudo do seu time."
    >
      <form onSubmit={submit} className="grid gap-4">
        <label className="grid gap-1.5 text-sm font-bold text-ivory">
          E-mail ou telefone
          <input
            className="field"
            name="login"
            maxLength={254}
            disabled={loading || confirmationOpen}
            autoComplete="username"
            inputMode="email"
            required
            placeholder="voce@email.com ou (11) 99999-9999"
          />
        </label>
        <label className="grid gap-1.5 text-sm font-bold text-ivory">
          Senha
          <span className="relative">
            <input
              ref={passwordInput}
              className="field pr-12"
              name="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              maxLength={72}
              disabled={loading || confirmationOpen}
              placeholder="Sua senha"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute inset-y-0 right-0 inline-flex w-12 items-center justify-center text-muted hover:text-cyan"
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword ? (
                <EyeOff className="size-5" />
              ) : (
                <Eye className="size-5" />
              )}
            </button>
          </span>
        </label>
        <div className="flex justify-end">
          <Link
            href="/esqueci-senha"
            className="text-sm font-bold text-cyan hover:text-white"
          >
            Esqueci minha senha
          </Link>
        </div>
        {error ? (
          <p
            className="rounded-xl border border-coral/25 bg-coral/8 px-3.5 py-3 text-sm text-[#ffb195]"
            role="alert"
          >
            {error}
          </p>
        ) : null}
        {notice && <p role="status" className="rounded-xl bg-amber/10 p-3 text-sm text-amber">{notice}</p>}
        <button className="btn-primary mt-1 w-full" disabled={loading || confirmationOpen || !inviteChecked}>
          {loading ? (
            <LoaderCircle className="size-5 animate-spin" />
          ) : (
            <LogIn className="size-5" />
          )}
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
      {confirmationOpen && (
        <ConfirmationDialog titleId="cancel-deletion-title" descriptionId="cancel-deletion-description" busy={loading} onDismiss={declineCancellation}>
          <h2 id="cancel-deletion-title" className="display-title text-2xl font-black">Cancelar a exclusão e entrar?</h2>
          <p id="cancel-deletion-description" className="mt-3 text-sm leading-relaxed text-muted">
            Sua conta tem uma exclusão agendada e ainda está dentro do prazo de 10 dias. Ao continuar, a exclusão será cancelada e você irá para a página inicial. Deseja continuar?
          </p>
          {loading && <p role="status" className="mt-4 text-sm text-muted">Cancelando a exclusão e entrando...</p>}
          <div className="mt-6 flex flex-col gap-3">
            <button type="button" className="btn-primary" disabled={loading} onClick={() => {
              if (pendingCredentials.current) void login(pendingCredentials.current, true);
            }}>
              {loading && <LoaderCircle aria-hidden="true" className="size-4 animate-spin" />}
              {loading ? "Entrando..." : "Sim, cancelar exclusão e entrar"}
            </button>
            <button data-dialog-cancel type="button" className="btn-secondary" disabled={loading} onClick={declineCancellation}>
              Não, manter exclusão e voltar
            </button>
          </div>
        </ConfirmationDialog>
      )}
      <p className="mt-6 text-center text-sm text-muted">
        Ainda não faz parte?{" "}
        <Link
          href="/cadastro"
          className="font-black text-amber hover:text-white"
        >
          Crie sua conta
        </Link>
      </p>
    </AuthShell>
  );
}
