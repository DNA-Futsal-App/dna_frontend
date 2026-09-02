"use client";

import {
  Suspense,
  useMemo,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import { Layers3 } from "lucide-react";

import {
  EmptyState,
  ErrorState,
  LoadingCards,
} from "@/components/feedback";

import { MatchCard } from "@/components/match-card";
import { PageIntro } from "@/components/page-intro";

import type {
  MatchCalendar,
} from "@/lib/types";

import { useApiData } from "@/lib/use-api-data";

export default function MatchesPage() {
  return (
    <Suspense>
      <Matches />
    </Suspense>
  );
}

function Matches() {
  const searchParams =
    useSearchParams();

  const initialTab =
    searchParams.get("tab") === "played"
      ? "played"
      : "upcoming";

  const [tab, setTab] =
    useState<
      "upcoming" |
      "played" |
      "pending"
    >(initialTab);

  const [selectedPhase, setSelectedPhase] =
    useState<string | null>(null);

  const {
    data,
    loading,
    error,
    reload,
  } =
    useApiData<MatchCalendar>(
      "/api/matches",
    );

  const phases =
    useMemo(() => {
      if (!data) {
        return [];
      }

      const values =
        [
          ...data.played,
          ...data.upcoming,
        ]
          .map(
            (match) =>
              match.phase?.trim(),
          )
          .filter(
            (
              phase,
            ): phase is string =>
              Boolean(phase),
          );

      return Array.from(
        new Set(values),
      );
    }, [data]);

  const matches =
    useMemo(() => {
      if (!data) {
        return [];
      }

      const source =
        tab === "played"
          ? data.played
          : tab === "pending"
            ? data.pendingResults
            : data.upcoming;

      if (!selectedPhase) {
        return source;
      }

      return source.filter(
        (match) =>
          match.phase ===
          selectedPhase,
      );
    }, [
      data,
      tab,
      selectedPhase,
    ]);

  if (loading) {
    return (
      <LoadingCards count={4} />
    );
  }

  if (error || !data) {
    return (
      <ErrorState
        message={
          error ||
          "Não foi possível carregar os jogos."
        }
        onRetry={reload}
      />
    );
  }

  return (
    <div>
      <PageIntro
        eyebrow={`Temporada ${new Date().getFullYear()}`}
        title="Jogos"
        description="Acompanhe os próximos confrontos e todos os resultados da competição."
        action={
          <div className="inline-flex rounded-full border border-white/10 bg-ink/35 p-1">
            <Tab
              active={
                tab === "upcoming"
              }
              onClick={() =>
                setTab(
                  "upcoming",
                )
              }
            >
              Próximos
            </Tab>

            <Tab
              active={
                tab === "played"
              }
              onClick={() =>
                setTab(
                  "played",
                )
              }
            >
              Encerrados
            </Tab>
          </div>
        }
      />

      {data.currentPhase ? (
        <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-cyan/15 bg-cyan/8 px-3 py-2 text-xs font-black text-cyan">
          <Layers3 className="size-4" />

          Fase atual:
          {" "}
          {data.currentPhase}
        </div>
      ) : null}

      {data.pendingResults.length ? (
        <Tab
          active={tab === "pending"}
          onClick={() =>
            setTab("pending")
          }
        >
          Aguardando resultado
        </Tab>
      ) : null}

      {phases.length > 1 ? (
        <div className="mb-5 flex flex-wrap gap-2">
          <PhaseButton
            active={
              selectedPhase === null
            }
            onClick={() =>
              setSelectedPhase(
                null,
              )
            }
          >
            Todas
          </PhaseButton>

          {phases.map(
            (phase) => (
              <PhaseButton
                key={phase}
                active={
                  selectedPhase ===
                  phase
                }
                onClick={() =>
                  setSelectedPhase(
                    phase,
                  )
                }
              >
                {phase}
              </PhaseButton>
            ),
          )}
        </div>
      ) : null}

      {!matches.length ? (
        <EmptyState
          title="Nenhum jogo por aqui"
          description={
            tab === "upcoming"
              ? "Assim que novos confrontos forem confirmados, eles aparecerão aqui."
              : "Os resultados serão exibidos após a conclusão das partidas."
          }
        />
      ) : (
        <div className="grid gap-3 lg:grid-cols-2">
          {matches.map(
            (match, index) => (
              <div key={match.id}>
                {index === 0 &&
                  !selectedPhase ? (
                  <p className="mb-2 text-[10px] font-black uppercase tracking-[0.14em] text-muted">
                    {tab ===
                      "upcoming"
                      ? "Próximo jogo"
                      : "Último resultado"}
                  </p>
                ) : null}

                <MatchCard
                  match={match}
                />
              </div>
            ),
          )}
        </div>
      )}
    </div>
  );
}

function Tab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`min-h-10 rounded-full px-4 text-xs font-black transition ${active
        ? "bg-cyan text-ink"
        : "text-muted hover:text-ivory"
        }`}
    >
      {children}
    </button>
  );
}

function PhaseButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-full border px-3 py-2 text-xs font-bold transition ${active
        ? "border-cyan/30 bg-cyan/10 text-cyan"
        : "border-white/10 bg-panel text-muted hover:text-ivory"
        }`}
    >
      {children}
    </button>
  );
}