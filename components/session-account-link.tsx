"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { CircleUserRound, LoaderCircle } from "lucide-react";

type SessionStatus = "checking" | "authenticated" | "guest" | "unavailable";

type Props = {
  className?: string;
  loginHref?: string;
  loginLabel?: string;
};

// Páginas públicas não devem redirecionar em um 401 esperado.
// O BFF /api/me valida os cookies HttpOnly e renova o access token se necessário.
export function SessionAccountLink({
  className = "btn-ghost",
  loginHref = "/entrar",
  loginLabel = "Entrar",
}: Props) {
  const [status, setStatus] = useState<SessionStatus>("checking");

  useEffect(() => {
    let active = true;
    let revision = 0;

    function checkSession() {
      const current = ++revision;
      void fetch("/api/me", {
        credentials: "same-origin",
        cache: "no-store",
      })
        .then((response) => {
          if (!active || current !== revision) return;
          setStatus(response.ok
            ? "authenticated"
            : response.status === 401 ? "guest" : "unavailable");
        })
        .catch(() => {
          if (active && current === revision) setStatus("unavailable");
        });
    }

    checkSession();
    // Reflete login/logout em outra aba quando o usuário volta para esta aba.
    window.addEventListener("focus", checkSession);
    return () => {
      active = false;
      window.removeEventListener("focus", checkSession);
    };
  }, []);

  if (status === "checking") {
    return <span className={className} role="status" aria-label="Verificando sessão">
      <LoaderCircle className="size-4 animate-spin" aria-hidden="true" />
    </span>;
  }

  if (status === "authenticated") {
    return <Link href="/app/perfil" className={className}>
      <CircleUserRound className="size-4" aria-hidden="true" /> Meu perfil
    </Link>;
  }

  if (status === "unavailable") {
    // Não declarar o usuário deslogado quando a API estiver indisponível.
    return <Link href="/app" className={className}>Minha conta</Link>;
  }

  return <Link href={loginHref} className={className}>{loginLabel}</Link>;
}
