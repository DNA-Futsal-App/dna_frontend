"use client";

import Link from "next/link";
import { useSyncExternalStore } from "react";
import { AuthShell } from "@/components/auth/auth-shell";
import { readDeletionDeadline } from "@/lib/account-deletion";

const subscribe = () => () => {};

export default function AccountDeletionPage() {
  const deadline = useSyncExternalStore(subscribe, readDeletionDeadline, () => null);
  return (
    <AuthShell eyebrow="Sua conta" title={deadline ? "Exclusão agendada." : "Exclusão de conta."}
      description={deadline ? "Seu acesso foi bloqueado e suas sessões foram encerradas." : "Consulte no e-mail de confirmação a data de uma solicitação de exclusão."}
      backHref="/entrar">
      <div className="space-y-4 text-sm leading-relaxed text-muted">
        {deadline && <p role="status" className="rounded-xl border border-amber/25 bg-amber/10 p-4 text-ivory">A exclusão está agendada para <strong>{deadline}</strong>, no fuso deste dispositivo. Você pode cancelar antes desse horário.</p>}
        <p>Para cancelar dentro dos 10 dias, faça login novamente. Antes de ir para a página inicial, você será informado sobre o cancelamento e poderá confirmar ou manter a exclusão agendada.</p>
        <p>A confirmação do agendamento será enviada por e-mail. A limpeza dos arquivos pode terminar após a data agendada. Votos e registros necessários à apuração serão preservados.</p>
        <Link href="/entrar" className="btn-primary w-full">Ir para entrar</Link>
      </div>
    </AuthShell>
  );
}
