"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";
import { CheckCircle2, LoaderCircle, XCircle } from "lucide-react";
import { AuthShell } from "@/components/auth/auth-shell";
import { clientApi } from "@/lib/client-api";

export default function ConfirmEmailPage() { return <Suspense><ConfirmEmail /></Suspense>; }

function ConfirmEmail() {
  const token = useSearchParams().get("token") ?? "";
  const [state, setState] = useState<"loading" | "success" | "error">(token ? "loading" : "error");
  const [message, setMessage] = useState(token ? "" : "O link de confirmação está incompleto.");
  useEffect(() => {
    if (!token) return;
    clientApi<{ message: string }>(`/api/auth/email-verification/confirm?token=${encodeURIComponent(token)}`)
      .then((data) => { setState("success"); setMessage(data.message); })
      .catch((err) => { setState("error"); setMessage(err instanceof Error ? err.message : "O link não é mais válido."); });
  }, [token]);
  return (
    <AuthShell eyebrow="Confirmação de conta" title={state === "success" ? "Conta confirmada!" : state === "error" ? "Link inválido." : "Validando seu link..."} description={state === "loading" ? "Só um instante enquanto confirmamos seu e-mail." : message}>
      <div className="text-center">{state === "loading" ? <LoaderCircle className="mx-auto size-14 animate-spin text-cyan" /> : state === "success" ? <CheckCircle2 className="mx-auto size-14 text-cyan" /> : <XCircle className="mx-auto size-14 text-coral" />}</div>
      {state !== "loading" ? <Link href={state === "success" ? "/entrar" : "/verificar-email"} className="btn-primary mt-6 w-full">{state === "success" ? "Entrar no DNA Futsal" : "Solicitar novo link"}</Link> : null}
    </AuthShell>
  );
}
