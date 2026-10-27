"use client";

import {
  Compass,
  LoaderCircle,
  RotateCcw,
  Search,
} from "lucide-react";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import { useProfile } from "@/components/profile-context";
import { clientApi } from "@/lib/client-api";
import {
  SPORTS_COMPETITIONS,
  categoriesCatalogUrl,
  divisionsCatalogUrl,
  type SportsCompetitionCode,
} from "@/lib/sports-preference";
import {
  firstVerifiedCompetition,
  assertCatalogEventIsolation,
} from "@/lib/competition-event-guard";
import type {
  CatalogCategory,
  CatalogItem,
} from "@/lib/types";

export type BrowsedCompetition = {
  competitionCode: SportsCompetitionCode;
  eventId: number;
  divisionId: string;
  divisionName: string;
  categoryId: string;
  categoryName: string;
};

type CompetitionBrowseContextValue = {
  selection: BrowsedCompetition | null;
  activeEventId: number | null;
  isExploring: boolean;
  switching: { code: SportsCompetitionCode; error: string | null } | null;
  switchCompetition: (code: SportsCompetitionCode) => void;
  cancelSwitch: () => void;
  selectCompetition: (
    competition: BrowsedCompetition,
  ) => void;
  clearCompetition: () => void;
};

const CompetitionBrowseContext =
  createContext<CompetitionBrowseContextValue>({
    selection: null,
    activeEventId: null,
    isExploring: false,
    switching: null,
    switchCompetition: () => undefined,
    cancelSwitch: () => undefined,
    selectCompetition: () => undefined,
    clearCompetition: () => undefined,
  });

export function CompetitionBrowseProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const { profile } = useProfile();
  const [selection, setSelection] =
    useState<BrowsedCompetition | null>(null);
  const lastProfilePreference = useRef<string | null>(null);
  const switchSequence = useRef(0);
  const [switching, setSwitching] = useState<{
    code: SportsCompetitionCode;
    error: string | null;
  } | null>(null);

  const switchCompetition = useCallback(async (code: SportsCompetitionCode) => {
    const sequence = ++switchSequence.current;
    // Invalidate the previous event before any network request: never present
    // masculine results under a feminine competition selector.
    setSwitching({ code, error: null });
    try {
      const selected = await firstVerifiedCompetition(code, {
        divisions: (selectedCode) =>
          clientApi<CatalogItem[]>(divisionsCatalogUrl(selectedCode)),
        categories: (selectedCode, divisionId) =>
          clientApi<CatalogCategory[]>(categoriesCatalogUrl(selectedCode, divisionId)),
      });
      if (sequence !== switchSequence.current) return;
      setSelection(selected);
      setSwitching(null);
    } catch (error) {
      if (sequence !== switchSequence.current) return;
      setSwitching({
        code,
        error: error instanceof Error ? error.message :
          "Não foi possível consultar o evento na FPFS.",
      });
    }
  }, []);

  const cancelSwitch = useCallback(() => {
    switchSequence.current += 1;
    setSwitching(null);
  }, []);

  // An updated saved championship or event wins over temporary exploration.
  useEffect(() => {
    if (!profile) return;
    const currentPreference = `${profile.competitionCode ?? "LEGACY"}:${profile.eventId ?? "none"}`;
    const previousPreference = lastProfilePreference.current;
    lastProfilePreference.current = currentPreference;
    if (previousPreference === null || previousPreference === currentPreference) return;

    let active = true;
    queueMicrotask(() => {
      if (active) setSelection(null);
    });
    return () => { active = false; };
  }, [profile?.competitionCode, profile?.eventId]);

  const value = useMemo(
    () => ({
      selection,
      activeEventId:
        selection?.eventId ??
        profile?.eventId ??
        null,
      isExploring: selection != null,
      switching,
      switchCompetition,
      cancelSwitch,
      selectCompetition: setSelection,
      clearCompetition: () =>
        setSelection(null),
    }),
    [
      profile?.eventId,
      selection,
      switching,
      switchCompetition,
      cancelSwitch,
    ],
  );

  return (
    <CompetitionBrowseContext.Provider
      value={value}
    >
      {children}
    </CompetitionBrowseContext.Provider>
  );
}

export function useCompetitionBrowse() {
  return useContext(
    CompetitionBrowseContext,
  );
}

export function CompetitionSearch({
  loading = false,
}: {
  loading?: boolean;
}) {
  const { profile } = useProfile();
  const {
    selection,
    isExploring,
    switching,
    switchCompetition,
    cancelSwitch,
    selectCompetition,
    clearCompetition,
  } = useCompetitionBrowse();

  // Keep the catalog associated with the competition that produced it.
  // A late response from the other championship cannot populate these selects.
  const [divisionCatalog, setDivisionCatalog] = useState<{
    code: SportsCompetitionCode;
    items: CatalogItem[];
  } | null>(null);
  const [categoryCatalog, setCategoryCatalog] = useState<{
    code: SportsCompetitionCode;
    divisionId: string;
    items: CatalogCategory[];
  } | null>(null);
  const [draftCompetitionCode, setDraftCompetitionCode] =
    useState<SportsCompetitionCode | null>(null);
  const [
    draftDivisionId,
    setDraftDivisionId,
  ] = useState<string | null>(null);
  const [
    draftCategoryId,
    setDraftCategoryId,
  ] = useState<string | null>(null);
  const [formError, setFormError] =
    useState("");

  const competitionCode =
    draftCompetitionCode ??
    selection?.competitionCode ??
    profile?.competitionCode ??
    "PAULISTA";

  // Legacy (including Torneio União) preferences are not silently treated
  // as Paulista. Browsing starts at Paulista, without changing the profile.
  const canPrefill = draftCompetitionCode === null &&
    (selection?.competitionCode === competitionCode ||
      (!selection && profile?.competitionCode === competitionCode));

  const divisionId = draftDivisionId ??
    (canPrefill ? (selection?.divisionId ?? profile?.divisionId) : null) ?? "";
  const categoryId = draftCategoryId ??
    (canPrefill ? (selection?.categoryId ?? profile?.categoryId) : null) ?? "";

  const divisions = divisionCatalog?.code === competitionCode
    ? divisionCatalog.items : [];
  const categories = categoryCatalog?.code === competitionCode &&
    categoryCatalog.divisionId === divisionId
    ? categoryCatalog.items : [];

  useEffect(() => {
    let active = true;

    clientApi<CatalogItem[]>(divisionsCatalogUrl(competitionCode))
      .then((result) => {
        if (active) setDivisionCatalog({ code: competitionCode, items: result });
      })
      .catch(() => {
        if (active) setDivisionCatalog({ code: competitionCode, items: [] });
      });

    return () => {
      active = false;
    };
  }, [competitionCode]);

  useEffect(() => {
    if (!divisionId) {
      return;
    }

    let active = true;

    clientApi<CatalogCategory[]>(categoriesCatalogUrl(competitionCode, divisionId))
      .then((result) => {
        if (active) setCategoryCatalog({ code: competitionCode, divisionId, items: result });
      })
      .catch(() => {
        if (active) setCategoryCatalog({ code: competitionCode, divisionId, items: [] });
      });

    return () => {
      active = false;
    };
  }, [competitionCode, divisionId]);

  const searchSequence = useRef(0);
  const [searching, setSearching] = useState(false);

  async function searchCompetition() {
    const sequence = ++searchSequence.current;
    const division =
      divisions.find(
        (item) =>
          String(item.id) ===
          divisionId,
      );

    const category =
      categories.find(
        (item) =>
          String(item.id) ===
          categoryId,
      );

    if (!division || !category) {
      setFormError(
        "Escolha uma divisão e uma categoria válidas.",
      );
      return;
    }

    setFormError("");
    setSearching(true);
    try {
      if (competitionCode === "PAULISTA_FEMININO") {
        await assertCatalogEventIsolation(
          competitionCode,
          String(division.id),
          category.eventId,
          {
            divisions: (code) => clientApi<CatalogItem[]>(divisionsCatalogUrl(code)),
            categories: (code, id) => clientApi<CatalogCategory[]>(categoriesCatalogUrl(code, id)),
          },
        );
      }
      if (sequence !== searchSequence.current) return;
      selectCompetition({
        competitionCode,
        eventId: category.eventId,
        divisionId: String(division.id),
        divisionName: division.name,
        categoryId: String(category.id),
        categoryName: category.name,
      });
    } catch (error) {
      if (sequence === searchSequence.current) {
        setFormError(error instanceof Error ? error.message : "Não foi possível validar o evento.");
      }
    } finally {
      if (sequence === searchSequence.current) setSearching(false);
    }
  }

  function resetCompetition() {
    searchSequence.current += 1;
    clearCompetition();
    setDraftCompetitionCode(null);
    setDraftDivisionId(null);
    setDraftCategoryId(null);
    setFormError("");
  }

  return (
    <section className="mb-6 rounded-2xl border border-cyan/15 bg-panel/70 p-4 sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="flex items-center gap-2 text-xs font-black uppercase tracking-[0.14em] text-cyan">
            <Compass className="size-4" />
            Explorar competição
          </p>

          <p className="mt-1 text-sm text-muted">
            Consulte outra divisão e categoria sem alterar suas preferências.
          </p>
        </div>

        {isExploring ? (
          <button
            type="button"
            onClick={resetCompetition}
            className="btn-ghost min-h-10! px-3! py-2! text-xs"
          >
            <RotateCcw className="size-4" />
            Minha categoria
          </button>
        ) : null}
      </div>

      {switching ? (
        <div role={switching.error ? "alert" : "status"}
          className="mt-3 rounded-lg border border-amber/30 bg-amber/10 p-3 text-sm text-ivory">
          <p>{switching.error
            ? `Não foi possível trocar o campeonato: ${switching.error}`
            : "Carregando a nova competição. A seleção anterior continua ativa até a confirmação."}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {switching.error ? (
              <button type="button" className="btn-ghost"
                onClick={() => void switchCompetition(switching.code)}>Tentar novamente</button>
            ) : null}
            <button type="button" className="btn-ghost" onClick={cancelSwitch}>Cancelar</button>
          </div>
        </div>
      ) : null}
      <p className="mt-3 text-xs text-muted">
        Trocar o campeonato carrega automaticamente uma categoria oficial. Para consultar outra,
        escolha divisão e categoria e clique em Pesquisar.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-[1.2fr_1fr_1fr_auto]">
        <label className="grid gap-1.5 text-xs font-bold text-muted">
          Campeonato
          <select
            className="field"
            aria-label="Campeonato para explorar"
            value={competitionCode}
            onChange={(event) => {
              const code = event.target.value as SportsCompetitionCode;
              searchSequence.current += 1;
              setDraftCompetitionCode(null);
              setDraftDivisionId(null);
              setDraftCategoryId(null);
              setDivisionCatalog(null);
              setCategoryCatalog(null);
              setFormError("");
              setSearching(false);
              void switchCompetition(code);
            }}
          >
            {SPORTS_COMPETITIONS.map((item) => (
              <option key={item.code} value={item.code}>{item.label}</option>
            ))}
          </select>
        </label>

        <label className="grid gap-1.5 text-xs font-bold text-muted">
          Divisão
          <select
            className="field"
            value={divisionId}
            onChange={(event) => {
              searchSequence.current += 1;
              setDraftDivisionId(
                event.target.value,
              );
              setDraftCategoryId("");
              setCategoryCatalog(null);
              setFormError("");
            }}
          >
            <option value="">
              Escolha a divisão
            </option>

            {divisions.map(
              (division) => (
                <option
                  key={division.id}
                  value={String(
                    division.id,
                  )}
                >
                  {division.name}
                </option>
              ),
            )}
          </select>
        </label>

        <label className="grid gap-1.5 text-xs font-bold text-muted">
          Categoria
          <select
            className="field"
            value={categoryId}
            disabled={!divisionId || !divisions.some((item) => String(item.id) === divisionId)}
            onChange={(event) => {
              searchSequence.current += 1;
              setDraftCategoryId(
                event.target.value,
              );
              setFormError("");
            }}
          >
            <option value="">
              Escolha a categoria
            </option>

            {categories.map(
              (category) => (
                <option
                  key={category.id}
                  value={String(
                    category.id,
                  )}
                >
                  {category.name}
                </option>
              ),
            )}
          </select>
        </label>

        <button
          type="button"
          onClick={() => void searchCompetition()}
          disabled={
            loading || searching ||
            !divisions.some((item) => String(item.id) === divisionId) ||
            !categories.some((item) => String(item.id) === categoryId)
          }
          aria-busy={loading}
          className="btn-primary self-end"
        >
          {loading ? (
            <>
              <LoaderCircle
                className="size-4 animate-spin"
                aria-hidden="true"
              />
              Carregando...
            </>
          ) : (
            <>
              <Search
                className="size-4"
                aria-hidden="true"
              />
              Pesquisar
            </>
          )}
        </button>
      </div>

      {formError ? (
        <p className="mt-3 text-xs font-bold text-coral">
          {formError}
        </p>
      ) : null}

      {selection ? (
        <div className="mt-4 rounded-xl border border-cyan/15 bg-cyan/6 px-3 py-2.5 text-xs text-muted">
          Visualizando temporariamente{" "}
          <strong className="text-cyan">
            {SPORTS_COMPETITIONS.find((item) => item.code === selection.competitionCode)?.label}
            {" • "}
            {selection.divisionName}
            {" • "}
            {selection.categoryName}
          </strong>
          . Seu perfil continua inalterado.
        </div>
      ) : null}
    </section>
  );
}
