
/* eslint-disable react-hooks/set-state-in-effect */
"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  LoaderCircle,
  LockKeyhole,
  ShieldCheck,
} from "lucide-react";

import { clientApi } from "@/lib/client-api";
import type { AdminAwardEdition } from "@/lib/admin-awards-types";
import type { CatalogCategory, CatalogItem } from "@/lib/types";
import type {
  AwardContestCategory,
  AwardGender,
  AwardRegistrationReopening,
} from "@/lib/award-registration-types";

type Eligibility = {
  contestCategory: AwardContestCategory;
  label: string;
  hasFinalists: boolean;
  reopeningStatus: "NONE" | "SCHEDULED" | "OPEN" | "CLOSED";
};

const categoryNames: Record<AwardContestCategory, string> = {
  BEAUTIFUL_GOAL: "Gol mais bonito",
  BEST_DRIBBLE: "Melhor drible",
  FREE_KICK_GOAL: "Gol de falta mais bonito",
  BEST_SAVE: "Melhor defesa",
};

const contests = Object.keys(categoryNames) as AwardContestCategory[];

const statusLabel: Record<AwardRegistrationReopening["status"], string> = {
  OPEN: "Aberta",
  SCHEDULED: "Agendada",
  CLOSED: "Encerrada",
};

function localInput(date: Date): string {
  const value = new Date(
    date.getTime() - date.getTimezoneOffset() * 60_000,
  );

  return value.toISOString().slice(0, 16);
}

export default function SelectiveReopeningAdminPage() {
  const [editions, setEditions] = useState<AdminAwardEdition[]>([]);
  const [editionId, setEditionId] = useState("");

  const [gender, setGender] = useState<AwardGender | "">("");
  const [divisionId, setDivisionId] = useState("");
  const [categoryId, setCategoryId] = useState("");

  const [divisions, setDivisions] = useState<CatalogItem[]>([]);
  const [categories, setCategories] = useState<CatalogCategory[]>([]);

  const [eligibility, setEligibility] = useState<Eligibility[]>([]);
  const [windows, setWindows] = useState<AwardRegistrationReopening[]>([]);
  const [selected, setSelected] = useState<AwardContestCategory[]>([]);

  // As datas são inicializadas após a montagem do componente.
  // Isso evita chamar Date.now() durante a renderização.
  const [opensAt, setOpensAt] = useState("");
  const [closesAt, setClosesAt] = useState("");

  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const edition = editions.find((item) => item.id === editionId);
  const season = edition?.season;

  const title = gender === "FEMALE"
    ? "Paulista Feminino"
    : "Paulista";

  const selectedCategory = categories.find(
    (item) => String(item.id) === categoryId,
  );

  const eventId = selectedCategory?.eventId;

  useEffect(() => {
    const now = new Date();

    setOpensAt(localInput(now));

    setClosesAt(
      localInput(
        new Date(now.getTime() + 24 * 60 * 60_000),
      ),
    );
  }, []);

  useEffect(() => {
    clientApi<AdminAwardEdition[]>("/api/admin/awards/editions")
      .then((values) => {
        setEditions(values);
        setEditionId(values[0]?.id ?? "");
      })
      .catch((err: unknown) => {
        setError(
          err instanceof Error
            ? err.message
            : "Falha ao carregar edições.",
        );
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!editionId) return;

    let active = true;

    clientApi<AwardRegistrationReopening[]>(
      `/api/admin/awards/editions/${editionId}/registration-reopenings`,
    )
      .then((rows) => {
        if (active) setWindows(rows);
      })
      .catch((err: unknown) => {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Falha ao carregar reaberturas.",
          );
        }
      });

    return () => {
      active = false;
    };
  }, [editionId]);

  useEffect(() => {
    setDivisionId("");
    setCategoryId("");
    setDivisions([]);
    setCategories([]);
    setEligibility([]);
    setSelected([]);

    if (!season || !gender) return;

    let active = true;

    clientApi<CatalogItem[]>(
      `/api/catalog/divisions?season=${season}&title=${encodeURIComponent(title)}`,
    )
      .then((rows) => {
        if (active) setDivisions(rows);
      })
      .catch(() => {
        if (active) {
          setError("Não foi possível obter as divisões.");
        }
      });

    return () => {
      active = false;
    };
  }, [season, gender, title]);

  useEffect(() => {
    setCategoryId("");
    setCategories([]);
    setEligibility([]);
    setSelected([]);

    if (!season || !gender || !divisionId) return;

    let active = true;

    clientApi<CatalogCategory[]>(
      `/api/catalog/categories?season=${season}&title=${encodeURIComponent(title)}&divisionId=${encodeURIComponent(divisionId)}`,
    )
      .then((rows) => {
        if (active) setCategories(rows);
      })
      .catch(() => {
        if (active) {
          setError("Não foi possível obter as categorias.");
        }
      });

    return () => {
      active = false;
    };
  }, [season, gender, divisionId, title]);

  useEffect(() => {
    setEligibility([]);
    setSelected([]);

    if (
      !editionId ||
      !gender ||
      !divisionId ||
      !categoryId ||
      !eventId
    ) {
      return;
    }

    let active = true;

    const params = new URLSearchParams({
      gender,
      divisionId,
      categoryId,
      eventId: String(eventId),
    });

    clientApi<Eligibility[]>(
      `/api/admin/awards/editions/${editionId}/registration-reopenings/eligibility?${params}`,
    )
      .then((rows) => {
        if (active) setEligibility(rows);
      })
      .catch((err: unknown) => {
        if (active) {
          setError(
            err instanceof Error
              ? err.message
              : "Erro na consulta de finalistas.",
          );
        }
      });

    return () => {
      active = false;
    };
  }, [editionId, gender, divisionId, categoryId, eventId]);

  async function refresh() {
    if (!editionId) return;

    const rows = await clientApi<AwardRegistrationReopening[]>(
      `/api/admin/awards/editions/${editionId}/registration-reopenings`,
    );

    setWindows(rows);

    if (gender && divisionId && categoryId && eventId) {
      const query = new URLSearchParams({
        gender,
        divisionId,
        categoryId,
        eventId: String(eventId),
      });

      const updatedEligibility = await clientApi<Eligibility[]>(
        `/api/admin/awards/editions/${editionId}/registration-reopenings/eligibility?${query}`,
      );

      setEligibility(updatedEligibility);
    }
  }

  async function activate() {
    if (
      !selected.length ||
      !editionId ||
      !eventId ||
      !gender ||
      !divisionId ||
      !categoryId
    ) {
      return;
    }

    const confirmed = window.confirm(
      `Autorizar ${selected.length} modalidade(s) selecionada(s)? Não libera as demais.`,
    );

    if (!confirmed) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      const items = selected.map((contestCategory) => ({
        eventId,
        divisionId: Number(divisionId),
        categoryId: Number(categoryId),
        gender,
        contestCategory,
        opensAt: new Date(opensAt).toISOString(),
        closesAt: new Date(closesAt).toISOString(),
      }));

      await clientApi(
        `/api/admin/awards/editions/${editionId}/registration-reopenings/batch`,
        {
          method: "POST",
          body: JSON.stringify({ items }),
        },
      );

      await refresh();
      setSelected([]);

      setNotice(
        "Reabertura autorizada somente para as modalidades selecionadas.",
      );
    } catch (err) {
      await refresh().catch(() => {});

      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível concluir a reabertura.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function closeWindow(id: string) {
    if (!editionId) return;

    const confirmed = window.confirm(
      "Encerrar imediatamente esta reabertura?",
    );

    if (!confirmed) return;

    setBusy(true);
    setError("");
    setNotice("");

    try {
      await clientApi(
        `/api/admin/awards/editions/${editionId}/registration-reopenings/${id}/close`,
        { method: "POST" },
      );

      await refresh();
      setNotice("Reabertura encerrada.");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Não foi possível encerrar a reabertura.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-5xl space-y-6 pb-16">
      <Link
        href="/app/admin/premio-dna"
        className="inline-flex items-center gap-2 text-sm font-bold text-muted hover:text-cyan"
      >
        <ArrowLeft className="size-4" />
        Voltar à administração
      </Link>

      <header>
        <p className="eyebrow">
          <ShieldCheck className="size-4" />
          Prêmio Legacy · Controle de inscrições
        </p>

        <h1 className="display-title mt-3 text-3xl font-black sm:text-4xl">
          Reabertura seletiva
        </h1>

        <p className="mt-3 text-sm text-muted">
          Somente modalidades sem finalistas podem ser reabertas.
          As inscrições e demais candidaturas permanecem protegidas.
        </p>
      </header>

      {error && (
        <p
          role="alert"
          className="rounded-xl border border-coral/30 p-4 text-sm text-coral"
        >
          {error}
        </p>
      )}

      {notice && (
        <p
          role="status"
          className="rounded-xl border border-cyan/30 p-4 text-sm text-cyan"
        >
          {notice}
        </p>
      )}

      {loading ? (
        <LoaderCircle className="size-7 animate-spin" />
      ) : (
        <section className="surface space-y-5 rounded-3xl p-5 sm:p-7">
          <h2 className="text-xl font-black">
            1. Selecione a disputa prejudicada
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold">
              Edição

              <select
                className="field"
                value={editionId}
                onChange={(e) => {
                  setEditionId(e.target.value);
                  setGender("");
                }}
              >
                {editions.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-bold">
              Gênero

              <select
                className="field"
                value={gender}
                onChange={(e) =>
                  setGender(e.target.value as AwardGender | "")
                }
              >
                <option value="">Selecione</option>
                <option value="MALE">Masculino</option>
                <option value="FEMALE">Feminino</option>
              </select>
            </label>

            <label className="grid gap-2 text-sm font-bold">
              Divisão

              <select
                className="field"
                disabled={!gender}
                value={divisionId}
                onChange={(e) => setDivisionId(e.target.value)}
              >
                <option value="">Selecione</option>

                {divisions.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </select>
            </label>

            <label className="grid gap-2 text-sm font-bold">
              Categoria esportiva

              <select
                className="field"
                disabled={!divisionId}
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value)}
              >
                <option value="">Selecione</option>

                {categories.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name} · Campeonato #{row.eventId}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <h2 className="text-xl font-black">
            2. Modalidades elegíveis
          </h2>

          {!eligibility.length ? (
            <p className="text-sm text-muted">
              Selecione a categoria para consultar as modalidades.
            </p>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {contests.map((code) => {
                const row = eligibility.find(
                  (item) => item.contestCategory === code,
                );

                const blocked =
                  !row ||
                  row.hasFinalists ||
                  row.reopeningStatus === "OPEN" ||
                  row.reopeningStatus === "SCHEDULED";

                return (
                  <label
                    key={code}
                    className={`flex items-start gap-3 rounded-2xl border p-4 ${
                      blocked
                        ? "border-white/10 opacity-55"
                        : selected.includes(code)
                          ? "border-cyan/60 bg-cyan/10"
                          : "border-white/15"
                    }`}
                  >
                    <input
                      className="mt-1 accent-cyan"
                      type="checkbox"
                      disabled={blocked}
                      checked={selected.includes(code)}
                      onChange={(e) =>
                        setSelected((old) =>
                          e.target.checked
                            ? [...old, code]
                            : old.filter((item) => item !== code),
                        )
                      }
                    />

                    <span className="min-w-0">
                      <strong className="block text-sm">
                        {categoryNames[code]}
                      </strong>

                      <small className="mt-1 inline-flex items-center gap-1 text-xs text-muted">
                        {row?.hasFinalists ? (
                          <>
                            <LockKeyhole className="size-3" />
                            Finalistas confirmados · bloqueada
                          </>
                        ) : row?.reopeningStatus === "OPEN" ? (
                          "Já reaberta"
                        ) : row?.reopeningStatus === "SCHEDULED" ? (
                          "Já agendada"
                        ) : (
                          "Sem finalistas · elegível"
                        )}
                      </small>
                    </span>
                  </label>
                );
              })}
            </div>
          )}

          <h2 className="text-xl font-black">
            3. Defina o prazo
          </h2>

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="grid gap-2 text-sm font-bold">
              Início

              <input
                className="field"
                type="datetime-local"
                value={opensAt}
                onChange={(e) => setOpensAt(e.target.value)}
              />
            </label>

            <label className="grid gap-2 text-sm font-bold">
              Encerramento

              <input
                className="field"
                type="datetime-local"
                value={closesAt}
                onChange={(e) => setClosesAt(e.target.value)}
              />
            </label>
          </div>

          {edition?.registrationsOpen && (
            <p className="flex items-center gap-2 text-sm text-amber">
              <AlertTriangle className="size-4" />
              Encerre o período geral de inscrições antes de autorizar uma
              exceção.
            </p>
          )}

          <button
            type="button"
            className="btn-primary min-h-12 w-full justify-center"
            disabled={
              busy ||
              !selected.length ||
              edition?.registrationsOpen ||
              !opensAt ||
              !closesAt
            }
            onClick={() => void activate()}
          >
            {busy ? (
              <LoaderCircle className="size-4 animate-spin" />
            ) : (
              <CheckCircle2 className="size-4" />
            )}
            Autorizar {selected.length} modalidade(s)
          </button>
        </section>
      )}

      <section className="surface space-y-4 rounded-3xl p-5 sm:p-7">
        <h2 className="text-xl font-black">
          Reaberturas desta edição
        </h2>

        {!windows.length ? (
          <p className="text-sm text-muted">
            Nenhuma reabertura configurada.
          </p>
        ) : (
          <div className="space-y-3">
            {windows.map((row) => (
              <div
                key={row.id}
                className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 p-4"
              >
                <div>
                  <strong className="block text-sm">
                    {row.gender === "FEMALE"
                      ? "Feminino"
                      : "Masculino"}{" "}
                    · {categoryNames[row.contestCategory]}
                  </strong>

                  <p className="mt-1 text-xs text-muted">
                    Campeonato #{row.eventId} · Divisão #
                    {row.divisionId} · Categoria #{row.categoryId}
                  </p>

                  <p className="mt-1 text-xs text-muted">
                    {new Date(row.opensAt).toLocaleString("pt-BR")}
                    {" até "}
                    {new Date(row.closesAt).toLocaleString("pt-BR")}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold text-cyan">
                    {statusLabel[row.status]}
                  </span>

                  {row.status !== "CLOSED" && (
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() => void closeWindow(row.id)}
                      className="btn-ghost border-coral/30 text-xs text-coral"
                    >
                      Encerrar
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
