import { getTeamDisplayEntry } from '@/lib/team-display';

/** Resolved at build time: no per-badge fetch, fuzzy guessing or stale manifest cache. */
export function resolveTeamLogoSources(name: string, shortName?: string | null): string[] {
  const entry = getTeamDisplayEntry(name) ?? getTeamDisplayEntry(shortName);
  if (!entry) return [];
  return entry.logoUrls?.length ? entry.logoUrls : entry.logoUrl ? [entry.logoUrl] : [];
}
