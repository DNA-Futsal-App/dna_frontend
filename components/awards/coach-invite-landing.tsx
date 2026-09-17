"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  BadgeCheck,
  LoaderCircle,
  ShieldCheck,
  UserRoundPlus,
} from "lucide-react";
import { BrandLogo } from "@/components/brand-logo";
import { clientApi } from "@/lib/client-api";
import type {
  CatalogCategory,
  CatalogItem,
} from "@/lib/types";
import type { CoachInviteInfo } from "@/lib/awards-types";

export function CoachInviteLanding() {
  const [invite, setInvite] = useState<CoachInviteInfo | null>(null);
  const [divisionName, setDivisionName] = useState("");
  const [categoryName, setCategoryName] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    clientApi<CoachInviteInfo>("/api/awards/coach-invite/current")
      .then(async (result) => {
        if (!active) return;

        if (!result.available) {
          setError("Este convite não está mais disponível.");
          return;
        }

        setInvite(result);

        const divisions = await clientApi<CatalogItem[]>(
          "/api/catalog/divisions",
        ).catch(() => []);

        if (!active) return;

        setDivisionName(
          divisions.find((item) => item.id === result.divisionId)?.name ??
            `Divisão ${result.divisionId}`,
        );

        const categories = await clientApi<CatalogCategory[]>(
          `/api/catalog/categories?divisionId=${encodeURIComponent(
            String(result.divisionId),
          )}`,
        ).catch(() => []);

        if (!active) return;

        setCategoryName(
          categories.find((item) => item.id === result.categoryId)?.name ??
            `Categoria ${result.categoryId}`,
        );
      })
      .catch((err) => {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Não foi possível carregar o convite.",
          );
        }
      });

    return () => {
      active = false;
    };
  }, []);

  const context = useMemo(
    () =>
      invite
        ? [
            divisionName || `Divisão ${invite.divisionId}`,
            categoryName || `Categoria ${invite.categoryId}`,
            invite.teamName,
          ]
        : [],
    [categoryName, divisionName, invite],
  );

  return (
    <main className="min-h-dvh bg-night px-4 py-8 text-ivory sm:px-6">
      <div className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center gap-3">
          <BrandLogo size={54} priority />
          <div>
            <strong className="display-title block text-xl">DNA Futsal</strong>
            <span className="text-xs font-bold uppercase tracking-[.16em] text-cyan">
              Prêmio DNA Futsal
            </span>
          </div>
        </div>

        {error ? (
          <section className="rounded-3xl border border-coral/25 bg-panel p-6">
            <h1 className="display-title text-3xl">Convite indisponível</h1>
            <p className="mt-3 text-sm leading-relaxed text-muted">{error}</p>
            <Link href="/" className="btn-ghost mt-6 w-full sm:w-auto">
              Voltar ao DNA Futsal
            </Link>
          </section>
        ) : !invite ? (
          <section className="flex min-h-72 items-center justify-center rounded-3xl border border-white/8 bg-panel">
            <LoaderCircle className="size-9 animate-spin text-cyan" />
          </section>
        ) : (
          <section className="overflow-hidden rounded-3xl border border-cyan/15 bg-panel shadow-2xl shadow-black/20">
            <div className="border-b border-white/8 bg-gradient-to-br from-cyan/10 to-transparent p-6 sm:p-8">
              <div className="flex items-center gap-2 text-xs font-black uppercase tracking-[.16em] text-cyan">
                <BadgeCheck className="size-5" />
                Convite validado
              </div>
              <h1 className="display-title mt-4 text-3xl sm:text-4xl">
                Votação dos treinadores
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted sm:text-base">
                Olá, <strong className="text-ivory">{invite.coachName}</strong>.
                Este convite é pessoal e foi vinculado ao contexto abaixo.
              </p>
            </div>

            <div className="grid gap-6 p-6 sm:p-8">
              <div className="grid gap-3 rounded-2xl border border-white/8 bg-night/40 p-4 sm:grid-cols-3">
                {context.map((value, index) => (
                  <div key={value}>
                    <small className="block text-[10px] font-black uppercase tracking-wider text-muted">
                      {index === 0
                        ? "Divisão"
                        : index === 1
                          ? "Categoria"
                          : "Time que você treina"}
                    </small>
                    <strong className="mt-1 block text-sm text-ivory">
                      {value}
                    </strong>
                  </div>
                ))}
              </div>

              <div>
                <h2 className="text-lg font-black">Como participar</h2>
                <ol className="mt-4 grid gap-3 text-sm leading-relaxed text-muted">
                  <li>1. Confira se divisão, categoria e equipe acima estão corretas.</li>
                  <li>2. Crie sua conta DNA Futsal ou entre em uma conta que já possui.</li>
                  <li>3. Confirme seu e-mail caso esteja criando uma conta nova.</li>
                  <li>4. Após entrar, a aba “Votação” ficará disponível no aplicativo.</li>
                  <li>5. Escolha um nome para cada posição e confirme o voto apenas quando tiver certeza.</li>
                </ol>
              </div>

              <div className="flex gap-3 rounded-2xl border border-amber/20 bg-amber/5 p-4 text-sm leading-relaxed text-muted">
                <ShieldCheck className="mt-0.5 size-5 shrink-0 text-amber" />
                <p>
                  O voto é definitivo depois da confirmação. Na categoria Técnico,
                  seu próprio nome não ficará disponível para seleção.
                </p>
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <Link href="/cadastro-treinador" className="btn-primary w-full">
                  <UserRoundPlus className="size-5" />
                  Fazer cadastro
                </Link>
                <Link href="/entrar" className="btn-ghost w-full">
                  Já tenho conta
                </Link>
              </div>

              <p className="text-center text-xs text-muted">
                Se os dados do convite estiverem incorretos, não prossiga com o
                cadastro. Solicite a correção à organização do Prêmio DNA Futsal.
              </p>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
