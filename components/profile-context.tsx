"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { clientApi } from "@/lib/client-api";
import type { CatalogCategory, CatalogItem, Team, UserProfile } from "@/lib/types";
import { useApiData } from "@/lib/use-api-data";

type PreferenceNames = {
  category?: string;
  division?: string;
  team?: string;
};

type ProfileContextValue = {
  profile: UserProfile | null;
  preferenceLabel: string;
  loading: boolean;
  error: string;
  reload: () => Promise<void>;
  applyProfile: (profile: UserProfile, names?: PreferenceNames) => void;
};

const ProfileContext = createContext<ProfileContextValue>({
  profile: null,
  preferenceLabel: "Escolha sua categoria",
  loading: true,
  error: "",
  reload: async () => undefined,
  applyProfile: () => undefined,
});

export function ProfileProvider({ children }: { children: React.ReactNode }) {
  const { data: loadedProfile, loading, error, reload } =
    useApiData<UserProfile>("/api/me");
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [names, setNames] = useState<PreferenceNames>({});

  useEffect(() => {
    if (loadedProfile) {
      setProfile(loadedProfile);
    }
  }, [loadedProfile]);

  const applyProfile = useCallback(
    (nextProfile: UserProfile, resolvedNames: PreferenceNames = {}) => {
      setProfile(nextProfile);
      setNames(resolvedNames);
    },
    [],
  );

  useEffect(() => {
    if (!profile) return;
    let active = true;

    async function resolvePreference() {
      const resolved: PreferenceNames = {};

      if (profile?.divisionId) {
        const divisions = await clientApi<CatalogItem[]>("/api/catalog/divisions");
        resolved.division = divisions.find(
          (item) => String(item.id) === profile?.divisionId,
        )?.name;
      }

      if (profile?.divisionId && profile?.categoryId) {
        const categories = await clientApi<CatalogCategory[]>(
          `/api/catalog/categories?divisionId=${encodeURIComponent(profile.divisionId)}`,
        );
        resolved.category = categories.find(
          (item) => String(item.id) === profile.categoryId,
        )?.name;
      }

      if (profile?.eventId && profile?.teamId) {
        const teams = await clientApi<Team[]>(
          `/api/catalog/teams?eventId=${encodeURIComponent(String(profile?.eventId))}`,
        );
        resolved.team = teams.find((item) => item.id === profile?.teamId)?.name;
      }

      if (active) {
        setNames(resolved);
      }
    }

    void resolvePreference().catch(() => undefined);
    return () => {
      active = false;
    };
  }, [profile]);

  const value = useMemo(() => {
    const fallback = [profile?.divisionId, profile?.categoryId, profile?.teamId]
      .filter((value): value is string => Boolean(value))
      .map(humanizeId);
    const resolved = [names.division, names.category, names.team].filter(Boolean);

    return {
      profile,
      loading,
      error,
      reload,
      applyProfile,
      preferenceLabel:
        (resolved.length ? resolved : fallback).join(" • ") ||
        "Escolha sua categoria",
    };
  }, [applyProfile, error, loading, names, profile, reload]);

  return <ProfileContext.Provider value={value}>{children}</ProfileContext.Provider>;
}

export function useProfile() {
  return useContext(ProfileContext);
}

function humanizeId(value: string) {
  return value.replace(/[-_]/g, " ").replace(/\b\w/g, (letter) => letter.toUpperCase());
}
