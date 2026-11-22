"use client";

import { useEffect, useState } from "react";
import { clientApi } from "@/lib/client-api";
import type { CatalogCategory, CatalogItem } from "@/lib/types";

export type CoachCompetitionContext = {
  season: number;
  eventId: number;
  divisionId: number;
  categoryId: number;
  gender?: "MALE" | "FEMALE" | null;
};

function contextKey(item: CoachCompetitionContext): string {
  return `${item.season}:${item.eventId}:${item.divisionId}:${item.categoryId}:${item.gender ?? "UNKNOWN"}`;
}

function validContext(item: CoachCompetitionContext): boolean {
  return Number.isInteger(item.season) && item.season >= 2016 && item.season <= 2100
    && Number.isSafeInteger(Number(item.divisionId)) && Number(item.divisionId) > 0
    && Number.isSafeInteger(Number(item.categoryId)) && Number(item.categoryId) > 0
    && Number.isSafeInteger(Number(item.eventId)) && Number(item.eventId) > 0;
}

function sameId(left: number | string, right: number | string): boolean {
  return Number(left) === Number(right);
}

/** Resolve official division/category names, including when a title-filtered catalog is unavailable. */
export function useCoachCompetitionLabels(contexts: CoachCompetitionContext[]) {
  const identity = JSON.stringify(contexts.map((item) => ({
    season: item.season,
    eventId: item.eventId,
    divisionId: item.divisionId,
    categoryId: item.categoryId,
    gender: item.gender,
  })));
  const [labels, setLabels] = useState<Record<string, string>>({});

  useEffect(() => {
    let active = true;
    const items = JSON.parse(identity) as CoachCompetitionContext[];
    const requests = new Map<string, Promise<{
      divisions: CatalogItem[];
      categories: CatalogCategory[];
    }>>();

    function metadata(item: CoachCompetitionContext, title?: string) {
      const key = `${item.season}:${item.divisionId}:${title ?? "ALL"}`;
      const existing = requests.get(key);
      if (existing) return existing;

      const divisionsQuery = new URLSearchParams({ season: String(item.season) });
      const categoriesQuery = new URLSearchParams({
        season: String(item.season),
        divisionId: String(item.divisionId),
      });
      if (title) {
        divisionsQuery.set("title", title);
        categoriesQuery.set("title", title);
      }
      const task = Promise.all([
        clientApi<CatalogItem[]>(`/api/catalog/divisions?${divisionsQuery}`),
        clientApi<CatalogCategory[]>(`/api/catalog/categories?${categoriesQuery}`),
      ]).then(([divisions, categories]) => ({ divisions, categories }));
      requests.set(key, task);
      return task;
    }

    void Promise.all(items.map(async (item) => {
      const key = contextKey(item);
      // Spring rejects season=undefined/0 (HTTP 400). Never issue these requests.
      if (!validContext(item)) {
        return [key, "Dados da edição indisponíveis"] as const;
      }

      const titles = item.gender === "FEMALE"
        ? ["Paulista Feminino"]
        : item.gender === "MALE"
          ? ["Paulista"]
          : ["Paulista", "Paulista Feminino"];

      // Prefer the less restrictive public catalog to avoid avoidable 400s.
      // If it cannot resolve the exact event, try its official title filter.
      for (const title of [undefined, ...titles]) {
        try {
          const { divisions, categories } = await metadata(item, title);
          const division = divisions.find((entry) => sameId(entry.id, item.divisionId));
          const category = categories.find((entry) =>
            sameId(entry.id, item.categoryId) && sameId(entry.eventId, item.eventId),
          );
          if (division && category) {
            return [key, `${division.name} · ${category.name}`] as const;
          }
        } catch {
          // Try the next official catalog variant before displaying an error.
        }
      }
      return [key, "Categoria esportiva indisponível"] as const;
    })).then((entries) => {
      if (active) setLabels(Object.fromEntries(entries));
    });

    return () => { active = false; };
  }, [identity]);

  return (item: CoachCompetitionContext): string =>
    labels[contextKey(item)] ?? "Carregando categoria...";
}
