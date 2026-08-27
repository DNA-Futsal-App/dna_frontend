"use client";

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { clientApi } from "@/lib/client-api";
import type { CatalogCategory, CatalogItem, Team, UserProfile } from "@/lib/types";
import { useApiData } from "@/lib/use-api-data";


type ProfileContextValue = {
  profile: UserProfile | null;
  preferenceLabel: string;
};

const ProfileContext = createContext<ProfileContextValue>({ profile: null, preferenceLabel: "Escolha seu time" });

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { data: profile } =
    useApiData<UserProfile>("/api/me");
  const [names, setNames] = useState<{ category?: string; division?: string; team?: string }>({});

  useEffect(() => {
    if (!profile) return;
    let active = true;
    async function resolvePreference() {
      const resolved: {
        category?: string;
        division?: string;
        team?: string;
      } = {};

      if (profile?.divisionId) {
        const divisions =
          await clientApi<CatalogItem[]>(
            "/api/catalog/divisions",
          );

        resolved.division =
          divisions.find(
            (item) =>
              item.id === profile.divisionId,
          )?.name;
      }

      if (
        profile?.divisionId &&
        profile.categoryId
      ) {
        const categories =
          await clientApi<CatalogCategory[]>(
            `/api/catalog/categories?divisionId=${encodeURIComponent(
              profile.divisionId,
            )}`,
          );

        resolved.category =
          categories.find(
            (item) =>
              item.id === profile.categoryId,
          )?.name;
      }

      if (
        profile?.eventId &&
        profile.teamId
      ) {
        const teams =
          await clientApi<Team[]>(
            `/api/catalog/teams?eventId=${encodeURIComponent(
              String(profile.eventId),
            )}`,
          );

        resolved.team =
          teams.find(
            (item) =>
              item.id === profile.teamId,
          )?.name;
      }

      if (active) {
        setNames(resolved);
      }
    }
    void resolvePreference().catch(() => undefined);
    return () => { active = false; };
  }, [profile]);

  const value = useMemo(() => {
    const fallback = [profile?.categoryId, profile?.divisionId, profile?.teamId]
      .filter((value): value is string => Boolean(value))
      .map(humanizeId);
    const resolved = [names.category, names.division, names.team].filter(Boolean);
    return { profile, preferenceLabel: (resolved.length ? resolved : fallback).join(" • ") || "Escolha seu time" };
  }, [names, profile]);

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  return useContext(ProfileContext);
}

function humanizeId(value: string) {
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
