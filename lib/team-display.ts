import teamDisplayManifest from "@/lib/generated/team-display-manifest.json";
import type { Team } from "@/lib/types";

type TeamDisplayEntry = {
  key: string;
  sourceName: string;
  displayName: string;
  logoUrl?: string | null;
};

type TeamDisplayManifest = {
  version: 1;
  sourceFiles: string[];
  teams: TeamDisplayEntry[];
};

const TEAM_OBJECT_KEYS = new Set([
  "team",
  "teams",
  "homeTeam",
  "awayTeam",
  "representedTeam",
]);

const manifest =
  teamDisplayManifest as TeamDisplayManifest;

const entriesByName =
  new Map(
    manifest.teams.map(
      (entry) => [
        entry.key,
        entry,
      ],
    ),
  );

function normalizeTeamName(
  value?: string | null,
) {
  return (value ?? "")
    .replaceAll("ª", "a")
    .replaceAll("º", "o")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(
      /[^\p{L}\p{N}]+/gu,
      "",
    )
    .trim();
}

function isRecord(
  value: unknown,
): value is Record<
  string,
  unknown
> {
  return (
    Boolean(value) &&
    typeof value === "object" &&
    !Array.isArray(value)
  );
}

function isPotentialTeamObject(
  value: Record<
    string,
    unknown
  >,
  parentKey?: string,
) {
  if (
    typeof value.name !==
    "string"
  ) {
    return false;
  }

  if (
    parentKey &&
    TEAM_OBJECT_KEYS.has(
      parentKey,
    )
  ) {
    return true;
  }

  /*
   * Os catálogos da FPFS nem sempre usam o mesmo shape do Team tipado.
   * Alguns retornam apenas { id, name } e o id pode ser numérico.
   * Só alteramos o objeto se o nome existir no manifesto, então aceitar
   * esse shape aqui não modifica divisões/categorias não cadastradas.
   */
  return (
    typeof value.id ===
      "string" ||
    typeof value.id ===
      "number"
  );
}

function transformValue(
  value: unknown,
  parentKey?: string,
): unknown {
  if (Array.isArray(value)) {
    return value.map(
      (item) =>
        transformValue(
          item,
          parentKey,
        ),
    );
  }

  if (!isRecord(value)) {
    return value;
  }

  const transformed:
    Record<
      string,
      unknown
    > = {};

  for (
    const [
      key,
      item,
    ] of Object.entries(
      value,
    )
  ) {
    transformed[key] =
      transformValue(
        item,
        key,
      );
  }

  if (
    isPotentialTeamObject(
      value,
      parentKey,
    )
  ) {
    const sourceName =
      typeof value.sourceName ===
      "string"
        ? value.sourceName
        : String(
            value.name,
          );

    const entry =
      entriesByName.get(
        normalizeTeamName(
          sourceName,
        ),
      );

    if (entry) {
      transformed.sourceName =
        sourceName;

      transformed.name =
        entry.displayName ||
        sourceName;

      transformed.shortName =
        entry.displayName ||
        transformed.shortName;

      if (entry.logoUrl) {
        transformed.preferredLogoUrl =
          entry.logoUrl;
      }
    }
  }

  /*
   * Alguns DTOs do prêmio usam teamName/representedTeamName em vez de
   * um objeto Team completo. Esses campos também seguem a planilha.
   */
  for (
    const [
      key,
      item,
    ] of Object.entries(
      value,
    )
  ) {
    if (
      !/teamName$/i.test(
        key,
      ) ||
      typeof item !==
        "string"
    ) {
      continue;
    }

    const entry =
      entriesByName.get(
        normalizeTeamName(
          item,
        ),
      );

    if (!entry) {
      continue;
    }

    transformed[key] =
      entry.displayName ||
      item;

    if (entry.logoUrl) {
      const logoKey =
        key.replace(
          /Name$/i,
          "LogoUrl",
        );

      transformed[logoKey] =
        entry.logoUrl;
    }
  }

  return transformed;
}

export function applyTeamDisplayOverrides<T>(
  data: T,
): T {
  return transformValue(
    data,
  ) as T;
}

export type DisplayAwareTeam =
  Team & {
    sourceName?:
      | string
      | null;
    preferredLogoUrl?:
      | string
      | null;
  };
