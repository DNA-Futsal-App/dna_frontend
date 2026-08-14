"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AppShell } from "@/components/app-shell";
import { hasValidClientSession } from "@/lib/client-session";

export default function AuthenticatedLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const [authorized, setAuthorized] = useState(false);

  useEffect(() => {
    if (!hasValidClientSession()) {
      router.replace("/entrar");
      return;
    }

    setAuthorized(true);
  }, [router]);

  if (!authorized) {
    return (
      <main className="grid min-h-dvh place-items-center bg-night">
        <div
          className="size-8 animate-spin rounded-full border-2 border-cyan border-t-transparent"
          aria-label="Verificando sessão"
        />
      </main>
    );
  }

  return <AppShell>{children}</AppShell>;
}