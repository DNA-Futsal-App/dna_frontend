"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { LoaderCircle } from "lucide-react";
import { clientApi } from "@/lib/client-api";
import type { CoachInviteInfo } from "@/lib/awards-types";

const statusMessage: Record<string, string> = {
  CLAIMED: "Este convite já foi utilizado.",
  REVOKED: "Este convite foi revogado pela organização.",
  EXPIRED: "Este convite expirou.",
  EDITION_CLOSED: "A edição desta premiação já foi encerrada.",
  CANDIDATE_INACTIVE: "Este cadastro de treinador não está mais ativo.",
};

export default function CoachInviteTokenPage() {
  const params = useParams<{ token: string }>();
  const router = useRouter();
  const [error, setError] = useState("");
  const token = params.token;
  const displayError = error || (!token ? "O link de convite está incompleto." : "");

  useEffect(() => {
    if (!token) {
      return;
    }

    clientApi<CoachInviteInfo>("/api/awards/coach-invite/start", {
      method: "POST",
      body: JSON.stringify({ token }),
    })
      .then((invite) => {
        if (!invite.available) {
          setError(
            statusMessage[invite.status] ??
              "Este convite não está disponível.",
          );
          return;
        }

        router.replace("/premio-dna/treinadores/convite");
      })
      .catch((err) =>
        setError(
          err instanceof Error
            ? err.message
            : "Não foi possível validar o convite.",
        ),
      );
  }, [token, router]);

  return (
    <main className="flex min-h-dvh items-center justify-center bg-night px-4 text-ivory">
      <div className="max-w-md text-center">
        {displayError ? (
          <>
            <h1 className="display-title text-3xl">Convite indisponível</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted">
              {displayError}
            </p>
          </>
        ) : (
          <>
            <LoaderCircle className="mx-auto size-10 animate-spin text-cyan" />
            <p className="mt-4 text-sm font-bold text-muted">
              Validando seu convite de treinador...
            </p>
          </>
        )}
      </div>
    </main>
  );
}
