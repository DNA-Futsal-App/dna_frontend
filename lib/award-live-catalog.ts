"use client";

import { useEffect, useState } from "react";
import { clientApi } from "@/lib/client-api";
import type { CatalogCategory, CatalogItem } from "@/lib/types";

type Context = { eventId: number; divisionId: number; categoryId: number };
type Metadata = { championship: string; division: string; category: string };
export type AwardLiveCatalog = Record<string, Metadata>;
const TITLES = ["Paulista", "Paulista Feminino"] as const;
export const AWARD_LIVE_INTERVAL = 10_000;

export function liveContextKey(context: Context) {
  return `${context.eventId}:${context.divisionId}:${context.categoryId}`;
}

export function championshipKey(context: Context, catalog: AwardLiveCatalog) {
  return catalog[liveContextKey(context)]?.championship ?? `event:${context.eventId}`;
}

export function championshipLabel(key: string) {
  if (key === "Paulista") return "Campeonato Paulista Masculino";
  if (key === "Paulista Feminino") return "Campeonato Paulista Feminino";
  return key.startsWith("event:") ? `Evento #${key.slice(6)} (campeonato não identificado)` : key;
}

/** Poll only in the visible tab. Each caller also prevents overlapping requests. */
export function startAwardPolling(load: () => Promise<void>, delay = AWARD_LIVE_INTERVAL) {
  const tick = () => { if (!document.hidden) void load(); };
  tick();
  const timer = window.setInterval(tick, delay);
  document.addEventListener("visibilitychange", tick);
  return () => {
    window.clearInterval(timer);
    document.removeEventListener("visibilitychange", tick);
  };
}

/** Resolve championship by the full sporting context, never by age/gender alone. */
export function useAwardLiveCatalog(season: number, contexts: Context[]) {
  const identity = [...new Set(contexts.map((row) => row.divisionId))].sort((a, b) => a - b).join(",");
  const [state, setState] = useState<{ season: number; catalog: AwardLiveCatalog }>({ season, catalog: {} });
  useEffect(() => {
    if (!identity || !Number.isInteger(season) || season < 2016 || season > 2100) return;
    const controller = new AbortController();
    const options = { signal: controller.signal };
    const ids = identity.split(",").map(Number);
    async function load() {
      const results = await Promise.all(TITLES.map(async (championship) => {
        const query = new URLSearchParams({ season: String(season), title: championship });
        const divisions = await clientApi<CatalogItem[]>(`/api/catalog/divisions?${query}`, options).catch(() => []);
        return (await Promise.all(ids.filter((id) => divisions.some((row) => Number(row.id) === id)).map(async (id) => {
          const params = new URLSearchParams(query);
          params.set("divisionId", String(id));
          const categories = await clientApi<CatalogCategory[]>(`/api/catalog/categories?${params}`, options).catch(() => []);
          return categories.map((row) => [liveContextKey({ eventId: row.eventId, divisionId: id, categoryId: row.id }), {
            championship, division: divisions.find((item) => Number(item.id) === id)!.name, category: row.name,
          }] as const);
        }))).flat();
      }));
      const catalog: AwardLiveCatalog = {};
      const ambiguous = new Set<string>();
      for (const [key, value] of results.flat()) {
        if (catalog[key] && catalog[key].championship !== value.championship) ambiguous.add(key);
        catalog[key] = value;
      }
      for (const key of ambiguous) delete catalog[key];
      if (!controller.signal.aborted) setState({ season, catalog });
    }
    void load();
    return () => controller.abort();
  }, [season, identity]);
  return state.season === season ? state.catalog : {};
}
