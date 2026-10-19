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
  useState,
} from "react";

import { useProfile } from "@/components/profile-context";
import type { CompetitionStage, CompetitionStructure } from "@/lib/competition-structure";
import { useApiData } from "@/lib/use-api-data";
import { clientApi } from "@/lib/client-api";
import type {
  CatalogCategory,
  CatalogItem,
} from "@/lib/types";

export type BrowsedCompetition = {
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
  stage: CompetitionStage;
  selectStage: (value: CompetitionStage) => void;
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
    stage: "PAULISTA",
    selectStage: () => undefined,
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
  const [stage, setStage] = useState<CompetitionStage>("PAULISTA");

  useEffect(() => {
    const raw = window.sessionStorage.getItem("dna:competition-selection");
    const id = new URLSearchParams(window.location.search).get("eventId");
    if (raw && id) {
      try {
        const stored = JSON.parse(raw) as BrowsedCompetition;
        if (Number(id) === stored.eventId) Promise.resolve().then(() => setSelection(stored));
      } catch { /* corrupted transient selection; leave user's profile alone */ }
    }
    const saved = new URLSearchParams(window.location.search).get("stage")
      ?? window.sessionStorage.getItem("dna:competition-stage");
    if (saved === "UNIAO") Promise.resolve().then(() => setStage("UNIAO"));
  }, []);

  const selectStage = useCallback((value: CompetitionStage) => {
    setStage(value);
    window.sessionStorage.setItem("dna:competition-stage", value);
    const url = new URL(window.location.href);
    url.searchParams.set("stage", value);
    url.searchParams.delete("phase");
    url.searchParams.delete("group");
    window.history.replaceState(null, "", url.toString());
  }, []);

  const value = useMemo(
    () => ({
      selection,
      activeEventId:
        selection?.eventId ??
        profile?.eventId ??
        null,
      isExploring: selection != null,
      stage,
      selectStage,
      selectCompetition: (competition: BrowsedCompetition) => {
        setSelection(competition);
        window.sessionStorage.setItem("dna:competition-selection", JSON.stringify(competition));
        const url = new URL(window.location.href);
        url.searchParams.set("eventId", String(competition.eventId));
        url.searchParams.delete("phase");
        url.searchParams.delete("group");
        window.history.replaceState(null, "", url.toString());
      },
      clearCompetition: () => {
        setSelection(null);
        window.sessionStorage.removeItem("dna:competition-selection");
        const url = new URL(window.location.href);
        url.searchParams.delete("eventId");
        url.searchParams.delete("phase");
        url.searchParams.delete("group");
        window.history.replaceState(null, "", url.toString());
      },
    }),
    [
      profile?.eventId,
      selection,
      stage,
      selectStage,
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
    selectCompetition,
    clearCompetition,
    stage,
    selectStage,
  } = useCompetitionBrowse();

  const [divisions, setDivisions] =
    useState<CatalogItem[]>([]);
  const [categories, setCategories] =
    useState<CatalogCategory[]>([]);
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
  const [officialTitle, setOfficialTitle] = useState("Paulista");
  // The Union is usually a stage inside the Paulista event, not a separate title.
  // Do not query divisions for a title before the FPFS lists it officially.
  const { data: officialTitles } = useApiData<CatalogItem[]>(
    "/api/catalog/titles?season=2026",
  );
  const independentTitle = officialTitles?.find((item) =>
    item.name.trim().normalize("NFD").replace(/\p{M}/gu, "")
      .toLocaleLowerCase("pt-BR").replace(/\s+/g, " ") === "torneio uniao de clubes"
  );
  const { activeEventId } = useCompetitionBrowse();
  const { data: structure } = useApiData<CompetitionStructure>(
    activeEventId != null ? `/api/sports/structure?eventId=${activeEventId}` : null,
  );
  const hasUnion = structure?.stages.some((item) => item.id === "UNIAO") ?? false;

  const divisionId =
    draftDivisionId ??
    selection?.divisionId ??
    profile?.divisionId ??
    "";

  const categoryId =
    draftCategoryId ??
    selection?.categoryId ??
    profile?.categoryId ??
    "";

  useEffect(() => {
    let active = true;

    clientApi<CatalogItem[]>(
      officialTitle === "Paulista" ? "/api/catalog/divisions" :
        `/api/catalog/divisions?title=${encodeURIComponent(officialTitle)}`,
    )
      .then((result) => {
        if (active) {
          setDivisions(result);
        }
      })
      .catch(() => {
        if (active) {
          setDivisions([]);
        }
      });

    return () => {
      active = false;
    };
  }, [officialTitle]);

  useEffect(() => {
    if (!divisionId) {
      return;
    }

    let active = true;

    clientApi<CatalogCategory[]>(
      `/api/catalog/categories?divisionId=${encodeURIComponent(divisionId)}&title=${encodeURIComponent(officialTitle)}`,
    )
      .then((result) => {
        if (active) {
          setCategories(result);
        }
      })
      .catch(() => {
        if (active) {
          setCategories([]);
        }
      });

    return () => {
      active = false;
    };
  }, [divisionId, officialTitle]);

  function searchCompetition() {
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

    // A different event may not publish the same Union structure.
    selectStage(officialTitle === "Paulista" ? "PAULISTA" : "UNIAO");
    selectCompetition({
      eventId: category.eventId,
      divisionId: String(
        division.id,
      ),
      divisionName: division.name,
      categoryId: String(
        category.id,
      ),
      categoryName: category.name,
    });
  }

  function resetCompetition() {
    clearCompetition();
    selectStage("PAULISTA");
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

      <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="Etapa da competição">
        <button type="button" onClick={() => selectStage("PAULISTA")}
          className={stage === "PAULISTA" ? "btn-primary" : "btn-ghost"}>
          Campeonato Paulista
        </button>
        <button type="button" onClick={() => selectStage("UNIAO")}
          disabled={!hasUnion}
          title={!hasUnion ? "Ainda não há fases do União publicadas neste evento" : undefined}
          className={stage === "UNIAO" ? "btn-primary" : "btn-ghost"}>
          Torneio União
        </button>
      </div>
      {independentTitle ? (
        <label className="mt-4 grid max-w-sm gap-1.5 text-xs font-bold text-muted">
          Título oficial
          <select className="field" value={officialTitle} onChange={(event) => {
            setOfficialTitle(event.target.value);
            setDraftDivisionId(""); setDraftCategoryId(""); setCategories([]);
          }}>
            <option value="Paulista">Campeonato Paulista</option>
            <option value={independentTitle.name}>{independentTitle.name} (título independente)</option>
          </select>
        </label>
      ) : null}
      <div className="mt-4 grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
        <label className="grid gap-1.5 text-xs font-bold text-muted">
          Divisão
          <select
            className="field"
            value={divisionId}
            onChange={(event) => {
              setDraftDivisionId(
                event.target.value,
              );
              setDraftCategoryId("");
              setCategories([]);
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
            disabled={!divisionId}
            onChange={(event) => {
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
          onClick={searchCompetition}
          disabled={
            loading ||
            !divisionId ||
            !categoryId
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
