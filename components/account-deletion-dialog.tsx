"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { LoaderCircle, Trash2 } from "lucide-react";
import { ConfirmationDialog } from "@/components/confirmation-dialog";
import { clientApi, ClientApiError } from "@/lib/client-api";
import { rememberDeletion, type AccountDeletionResponse } from "@/lib/account-deletion";
import { beginSessionEnd, clearAccountStorage, notifySessionEnded, resumeSession } from "@/lib/session-transition";

export function AccountDeletionDialog({ onDismiss, onBusyChange }: {
  onDismiss: () => void;
  onBusyChange: (busy: boolean) => void;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [uncertain, setUncertain] = useState(false);
  const submitting = useRef(false);
  const password = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (error && !busy) password.current?.focus();
  }, [error, busy]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (submitting.current) return;
    const form = new FormData(event.currentTarget);
    if (form.get("acknowledged") !== "on") return;
    submitting.current = true;
    setBusy(true);
    onBusyChange(true);
    setError("");
    setUncertain(false);
    beginSessionEnd();
    try {
      const response = await clientApi<AccountDeletionResponse>("/api/auth/account-deletion", {
        method: "POST", body: JSON.stringify({ currentPassword: form.get("currentPassword") }),
      });
      rememberDeletion(response);
      clearAccountStorage();
      notifySessionEnded();
      window.location.replace("/exclusao-conta");
    } catch (err) {
      if (err instanceof ClientApiError && err.status === 401 && err.problem?.code !== "INVALID_CREDENTIALS") {
        window.location.replace("/entrar?expired=1");
        return;
      }
      resumeSession();
      if (!(err instanceof ClientApiError) || err.status >= 500) {
        setUncertain(true);
        setError("Não foi possível confirmar o resultado. Confira seu e-mail. Se a exclusão foi agendada, faça login dentro do prazo para confirmar o cancelamento.");
      } else {
        setError(err.problem?.code === "INVALID_CREDENTIALS"
          ? "Senha atual incorreta. Confira a senha e tente novamente."
          : err.status === 429 ? "Muitas tentativas. Aguarde alguns minutos antes de tentar novamente." : err.message);
      }
      if (password.current) password.current.value = "";
      submitting.current = false;
      setBusy(false);
      onBusyChange(false);
    }
  }

  return (
    <ConfirmationDialog titleId="delete-title" descriptionId="delete-description" busy={busy} onDismiss={onDismiss}>
      <h2 id="delete-title" className="display-title text-2xl font-black">Agendar exclusão da conta?</h2>
      <div id="delete-description" className="mt-3 space-y-3 text-sm leading-relaxed text-muted">
        <p>Seu acesso será bloqueado imediatamente. A exclusão será agendada para daqui a 10 dias.</p>
        <p>Suas inscrições de todas as edições, dados pessoais e mídias armazenadas pelo DNA Futsal serão removidos. Votos e registros necessários à apuração serão preservados. Arquivos em serviços de terceiros não serão apagados.</p>
        <p>Para desistir durante os 10 dias, faça login novamente. Antes de entrar, você deverá confirmar o cancelamento da exclusão. Após o prazo, não será possível cancelar.</p>
      </div>
      <form onSubmit={submit} className="mt-5 grid gap-4">
        <label className="grid gap-1.5 text-sm font-bold">
          Senha atual
          <input ref={password} className="field" name="currentPassword" type="password" autoComplete="current-password" maxLength={72} required disabled={busy} />
        </label>
        <label className="flex items-start gap-3 text-sm leading-relaxed">
          <input type="checkbox" name="acknowledged" required disabled={busy} className="mt-1 size-4 shrink-0 accent-coral" />
          Entendi o bloqueio imediato e o prazo para cancelar.
        </label>
        {error && <p role="alert" className="rounded-xl border border-coral/25 bg-coral/8 p-3 text-sm text-[#ffb195]">{error}</p>}
        {uncertain && <a className="text-sm font-bold text-cyan" href="/entrar">Ir para a tela de entrada</a>}
        {busy && <p role="status" className="text-sm text-muted">Agendando exclusão. Aguarde a confirmação.</p>}
        <div className="flex flex-col gap-3 sm:flex-row">
          <button data-dialog-cancel type="button" className="btn-secondary flex-1" disabled={busy} onClick={onDismiss}>Voltar</button>
          <button type="submit" className="btn-secondary flex-1 border-coral/40! text-coral!" disabled={busy || uncertain}>
            {busy ? <LoaderCircle aria-hidden="true" className="size-4 animate-spin" /> : <Trash2 aria-hidden="true" className="size-4" />}
            {busy ? "Agendando..." : "Agendar exclusão"}
          </button>
        </div>
      </form>
    </ConfirmationDialog>
  );
}
