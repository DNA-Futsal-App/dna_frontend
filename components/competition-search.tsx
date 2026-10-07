"use client";

import {
  Compass,
  LoaderCircle,
  RotateCcw,
  Search,
} from "lucide-react";
import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

import { useProfile } from "@/components/profile-context";
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

  const value = useMemo(
    () => ({
      selection,
      activeEventId:
        selection?.eventId ??
        profile?.eventId ??
        null,
      isExploring: selection != null,
      selectCompetition: setSelection,
      clearCompetition: () =>
        setSelection(null),
    }),
    [
      profile?.eventId,
      selection,
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
      "/api/catalog/divisions",
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
  }, []);

  useEffect(() => {
    if (!divisionId) {
      return;
    }

    let active = true;

    clientApi<CatalogCategory[]>(
      `/api/catalog/categories?divisionId=${encodeURIComponent(
        divisionId,
      )}`,
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
  }, [divisionId]);

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
