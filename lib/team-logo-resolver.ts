type TeamLogoEntry = {
  key: string;
  path: string;
};

type TeamLogoManifest = {
  version: 1;
  logos: TeamLogoEntry[];
};

const GENERIC_WORDS = new Set([
  "a",
  "aa",
  "ac",
  "ad",
  "adc",
  "ae",
  "associacao",
  "atletica",
  "atletico",
  "ca",
  "ce",
  "clube",
  "da",
  "das",
  "de",
  "desportiva",
  "desportivo",
  "do",
  "dos",
  "ec",
  "esporte",
  "esportiva",
  "esportivo",
  "fc",
  "futebol",
  "futsal",
  "gr",
  "gremio",
  "paulista",
  "sc",
  "se",
  "sociedade",
  "sport",
]);

let manifestPromise: Promise<TeamLogoManifest> | null = null;

function normalizeWords(value?: string | null) {
  return (value ?? "")
    .replaceAll("ª", "a")
    .replaceAll("º", "o")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}


function candidateKeys(name: string, shortName?: string | null) {
  const result = new Set<string>();

  for (const value of [name, shortName]) {
    const words = normalizeWords(value).split(" ").filter(Boolean);
    const full = words.join("");

    if (full) result.add(full);

    const significant = words.filter(
      (word) => !GENERIC_WORDS.has(word) && word.length >= 3,
    );

    if (significant.length) {
      result.add(significant.join(""));
      for (const word of significant) result.add(word);
    }

    if (words.length >= 2) {
      const acronym = words.map((word) => word[0]).join("");
      if (acronym.length >= 3) result.add(acronym);
    }
  }

  return [...result];
}

function scoreLogoKey(logoKey: string, candidates: string[]) {
  if (!logoKey) return -1;

  for (const candidate of candidates) {
    if (logoKey === candidate) {
      return 10_000 + logoKey.length;
    }
  }

  if (logoKey.length < 4) return -1;

  let best = -1;

  for (const candidate of candidates) {
    if (candidate.length < 4) continue;

    if (candidate.includes(logoKey)) {
      const ratio = logoKey.length / candidate.length;
      if (ratio >= 0.45) {
        best = Math.max(best, 5_000 + logoKey.length * 10 + Math.round(ratio * 100));
      }
    }

    if (logoKey.includes(candidate)) {
      const ratio = candidate.length / logoKey.length;
      if (ratio >= 0.6) {
        best = Math.max(best, 4_000 + candidate.length * 10 + Math.round(ratio * 100));
      }
    }
  }

  return best;
}

async function loadManifest(): Promise<TeamLogoManifest> {
  if (!manifestPromise) {
    manifestPromise = fetch("/team-logo-manifest.json", {
      cache: "force-cache",
    }).then(async (response) => {
      if (!response.ok) {
        throw new Error(
          `Manifesto de escudos indisponível: HTTP ${response.status}`,
        );
      }

      const manifest = (await response.json()) as TeamLogoManifest;

      if (manifest.version !== 1 || !Array.isArray(manifest.logos)) {
        throw new Error("Manifesto de escudos inválido.");
      }

      return manifest;
    });
  }

  return manifestPromise;
}

export async function resolveLocalTeamLogo(
  name: string,
  shortName?: string | null,
): Promise<string | null> {
  const candidates = candidateKeys(name, shortName);

  if (!candidates.length) return null;

  const manifest = await loadManifest();
  const matches = manifest.logos
    .map((logo) => ({
      ...logo,
      score: scoreLogoKey(logo.key, candidates),
    }))
    .filter((logo) => logo.score >= 0)
    .sort(
      (left, right) =>
        right.score - left.score ||
        right.key.length - left.key.length ||
        left.path.localeCompare(right.path),
    );

  if (!matches.length) return null;

  const best = matches[0];
  const second = matches[1];

  // Empate entre chaves diferentes é ambíguo: melhor não mostrar
  // um escudo do clube errado.
  if (
    second &&
    second.score === best.score &&
    second.key !== best.key
  ) {
    return null;
  }

  return best.path;
}
