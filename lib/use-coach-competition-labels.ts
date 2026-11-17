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

/** Resolve official division/category names; never infer labels from numeric IDs. */
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

    function metadata(item: CoachCompetitionContext, title: string) {
      const key = `${item.season}:${item.divisionId}:${title}`;
      const existing = requests.get(key);
      if (existing) return existing;
      const query = new URLSearchParams({
        season: String(item.season),
        title,
      });
      const categoriesQuery = new URLSearchParams({
        season: String(item.season),
        title,
        divisionId: String(item.divisionId),
      });
      const task = Promise.all([
        clientApi<CatalogItem[]>(`/api/catalog/divisions?${query}`),
        clientApi<CatalogCategory[]>(`/api/catalog/categories?${categoriesQuery}`),
      ]).then(([divisions, categories]) => ({ divisions, categories }));
      requests.set(key, task);
      return task;
    }

    void Promise.all(items.map(async (item) => {
      const titles = item.gender === "FEMALE"
        ? ["Paulista Feminino"]
        : item.gender === "MALE"
          ? ["Paulista"]
          : ["Paulista", "Paulista Feminino"];
      for (const title of titles) {
        try {
          const { divisions, categories } = await metadata(item, title);
          const division = divisions.find((entry) => entry.id === item.divisionId);
          const category = categories.find((entry) =>
            entry.id === item.categoryId && entry.eventId === item.eventId,
          );
          if (division && category) {
            return [contextKey(item), `${division.name} · ${category.name}`] as const;
          }
        } catch {
          // Another official catalog (e.g. Paulista Feminino) may own this event.
        }
      }
      return [contextKey(item), "Categoria esportiva indisponível"] as const;
    })).then((entries) => {
      if (active) setLabels(Object.fromEntries(entries));
    });

    return () => { active = false; };
  }, [identity]);

  return (item: CoachCompetitionContext): string =>
    labels[contextKey(item)] ?? "Carregando categoria...";
}
