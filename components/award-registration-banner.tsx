"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  ArrowRight,
  CheckCircle2,
  Sparkles,
  Trophy,
} from "lucide-react";

import {
  ClientApiError,
  clientApi,
} from "@/lib/client-api";

import type {
  AwardRegistrationResponse,
} from "@/lib/award-registration-types";

type RegistrationState =
  | "LOADING"
  | "NONE"
  | "ACTIVE"
  | "CANCELLED";

export function AwardRegistrationBanner() {
  const [
    registrationState,
    setRegistrationState,
  ] = useState<RegistrationState>(
    "LOADING",
  );

  useEffect(() => {
    let active = true;

    clientApi<AwardRegistrationResponse>(
      "/api/awards/registrations/current",
    )
      .then((registration) => {
        if (!active) {
          return;
        }

        setRegistrationState(
          registration.status ===
            "CANCELLED"
            ? "CANCELLED"
            : "ACTIVE",
        );
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        if (
          error instanceof ClientApiError &&
          error.status === 404
        ) {
          setRegistrationState(
            "NONE",
          );

          return;
        }

        setRegistrationState(
          "NONE",
        );
      });

    return () => {
      active = false;
    };
  }, []);

  const hasRegistration =
    registrationState === "ACTIVE";

  const cancelled =
    registrationState ===
    "CANCELLED";

  const href =
    hasRegistration ||
    cancelled
      ? "/app/premio/minha-inscricao"
      : "/app/premio/inscricao";

  const buttonLabel =
    hasRegistration
      ? "Ver minha inscrição"
      : cancelled
        ? "Reinscrever atleta"
        : "Fazer minha inscrição";

  return (
    <section className="relative mb-6 overflow-hidden rounded-[1.75rem] border border-amber/20 bg-linear-to-br from-amber/12 via-panel to-night shadow-[0_20px_70px_rgba(0,0,0,.22)]">
      <div
        className="pointer-events-none absolute -right-16 -top-20 size-64 rounded-full border-30px border-amber/5"
        aria-hidden="true"
      />

      <div
        className="pointer-events-none absolute -bottom-20 right-24 size-48 rounded-full bg-cyan/5 blur-3xl"
        aria-hidden="true"
      />

      <div className="relative grid items-center gap-6 p-5 sm:p-7 lg:grid-cols-[1fr_auto] lg:p-8">
        <div className="max-w-2xl">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-2 rounded-full border border-amber/20 bg-amber/8 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.15em] text-amber">
              <Trophy className="size-3.5" />

              Prêmio legacy
            </span>

            {hasRegistration ? (
              <span className="inline-flex items-center gap-1.5 rounded-full border border-cyan/20 bg-cyan/7 px-3 py-1.5 text-[10px] font-black uppercase tracking-wider text-cyan">
                <CheckCircle2 className="size-3.5" />

                Inscrição realizada
              </span>
            ) : null}
          </div>

          <div className="mt-4 flex items-start gap-3">
            <span className="hidden size-12 shrink-0 items-center justify-center rounded-2xl bg-amber/10 text-amber sm:inline-flex">
              <Sparkles className="size-6" />
            </span>

            <div>
              <h2 className="display-title text-2xl font-black leading-tight text-ivory sm:text-3xl lg:text-4xl">
                {hasRegistration
                  ? "Sua candidatura está no Prêmio Legacy."
                  : cancelled
                    ? "Quer voltar para a disputa?"
                    : "Seu talento merece estar no Prêmio Legacy."}
              </h2>

              <p className="mt-2 max-w-xl text-sm leading-relaxed text-muted sm:text-base">
                {hasRegistration
                  ? "Acompanhe suas categorias, vídeos enviados e o andamento da sua inscrição."
                  : cancelled
                    ? "Você retirou suas candidaturas, mas pode reinscrever o atleta e enviar novos vídeos."
                    : "Inscreva o atleta nas categorias do prêmio, envie seus melhores vídeos e participe da premiação."}
              </p>
            </div>
          </div>
        </div>

        <div className="flex lg:justify-end">
          <Link
            href={href}
            className="group inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber px-5 text-sm font-black text-ink transition hover:brightness-110 sm:w-auto lg:min-w-52"
          >
            {buttonLabel}

            <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </section>
  );
}