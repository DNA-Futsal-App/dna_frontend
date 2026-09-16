import fs from "node:fs/promises";
import path from "node:path";

const args = new Set(process.argv.slice(2));
const apply = args.has("--apply");
const skipUnmatched = args.has("--skip-unmatched");
const reviewDirectory = path.resolve(".team-logo-review");
const reviewFile = path.join(reviewDirectory, "review.json");
const inventoryFile = path.join(reviewDirectory, "inventory.json");
const reportFile = path.join(reviewDirectory, "automatch-report.json");

const normalize = (value) => String(value ?? "")
  .replaceAll("ª", "a")
  .replaceAll("º", "o")
  .normalize("NFD")
  .replace(/\p{M}/gu, "")
  .toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, " ")
  .replace(/\s+/g, " ")
  .trim();

function compactInitials(value) {
  const tokens = normalize(value).split(" ").filter(Boolean);
  const result = [];
  for (let index = 0; index < tokens.length;) {
    if (tokens[index].length === 1) {
      let compact = "";
      while (index < tokens.length && tokens[index].length === 1) {
        compact += tokens[index++];
      }
      result.push(compact);
    } else {
      result.push(tokens[index++]);
    }
  }
  return result.join(" ");
}

const noise = new Set([
  "logo", "logotipo", "escudo", "svg", "png", "jpg", "jpeg", "webp",
  "oficial", "times", "time", "2026",
]);

function sourceName(source) {
  let name = path.posix.basename(source.replaceAll("\\", "/"));
  while (/\.(png|jpe?g|webp|svg)$/i.test(name)) {
    name = name.replace(/\.(png|jpe?g|webp|svg)$/i, "");
  }
  name = name.replace(/^\s*\d+\s+/, "").replace(/\s*\(\d+\)\s*$/, "");
  const tokens = compactInitials(name).split(" ").filter(token => token && !noise.has(token));
  return tokens.join(" ");
}

function variants(value, fromSource = false) {
  const base = fromSource ? sourceName(value) : normalize(value);
  const compact = compactInitials(base);
  const withoutSpaces = compact.replaceAll(" ", "");
  return new Set([base, compact, withoutSpaces.length >= 5 ? withoutSpaces : ""].filter(Boolean));
}

function familyForCategory(category) {
  const value = normalize(category);
  const match = value.match(/\bsub\s*0?(\d{1,2})\b/);
  if (match) {
    const age = Number(match[1]);
    if (age >= 5 && age <= 10) return "iniciacao";
    if (age >= 11 && age <= 23) return "base";
  }
  if (/\b(principal|adulto|adultos)\b/.test(value)) return "base";
  return null;
}

function sourceMetadata(source) {
  const segments = source.replaceAll("\\", "/").split("/").map(normalize);
  return {
    family: segments.includes("iniciacao") ? "iniciacao"
      : segments.includes("base") ? "base" : null,
    divisions: new Set(segments.filter(segment => /^a\d+$/.test(segment))),
  };
}

function compatible(row, inventoryItem) {
  const expectedFamily = familyForCategory(row.category);
  const expectedDivision = normalize(row.division);
  return inventoryItem.sources.some((source) => {
    const metadata = sourceMetadata(source);
    const familyMatches = !expectedFamily || !metadata.family || metadata.family === expectedFamily;
    const divisionMatches = !/^a\d+$/.test(expectedDivision)
      || metadata.divisions.size === 0 || metadata.divisions.has(expectedDivision);
    return familyMatches && divisionMatches;
  });
}

function exactScore(teamName, inventoryItem) {
  const teamVariants = variants(teamName);
  let score = 0;
  for (const source of inventoryItem.sources) {
    for (const candidate of variants(source, true)) {
      if (teamVariants.has(candidate)) score = Math.max(score, 1);
      const teamTokens = compactInitials(teamName).split(" ").filter(Boolean);
      const candidateTokens = candidate.split(" ").filter(Boolean);
      const meaningful = candidateTokens.length > 0
        && candidateTokens.every(token => token.length >= 4);
      if (meaningful && candidateTokens.every(token => teamTokens.includes(token))) {
        score = Math.max(score, 0.95);
      }
    }
  }
  return score;
}

function slug(value) {
  return compactInitials(value).replaceAll(" ", "-")
    .replace(/[^a-z0-9-]/g, "").replace(/-+/g, "-").replace(/^-|-$/g, "");
}

function keyFor(row, item, conflictingBaseKeys, pathsByFamilyKey) {
  const base = slug(row.teamName) || `clube-${item.logoPath.slice(12, 22)}`;
  if (!conflictingBaseKeys.has(base)) return base;
  const familyKey = `${base}-${familyForCategory(row.category) ?? "variant"}`;
  if ((pathsByFamilyKey.get(familyKey)?.size ?? 0) <= 1) return familyKey;
  return `${familyKey}-${item.logoPath.slice(12, 20)}`;
}

const decided = row => row.approved === true || String(row.skipReason ?? "").trim().length > 0;
const identity = row => `${row.eventId}|${row.teamId}`;

async function main() {
  const [review, inventory] = await Promise.all([
    fs.readFile(reviewFile, "utf8").then(JSON.parse),
    fs.readFile(inventoryFile, "utf8").then(JSON.parse),
  ]);
  if (!Array.isArray(review) || !Array.isArray(inventory)) {
    throw new Error("review.json ou inventory.json inválido.");
  }

  const invalidApproved = review.filter(row => row.approved === true && (
    !/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(String(row.clubKey ?? ""))
    || !/^\/team-logos\/[a-f0-9]{64}\.webp$/.test(String(row.logoPath ?? ""))
  ));
  if (invalidApproved.length) {
    throw new Error(`Há decisões aprovadas inválidas: ${invalidApproved.map(identity).join(", ")}`);
  }

  const tentative = [];
  const unmatched = [];
  for (const row of review) {
    if (decided(row)) continue;
    const matches = inventory
      .filter(item => compatible(row, item))
      .map(item => ({ item, score: exactScore(row.teamName, item) }))
      .filter(match => match.score >= 0.95);
    const distinct = [...new Map(matches.map(match => [match.item.logoPath, match.item])).values()];
    if (distinct.length === 1) tentative.push({ row, item: distinct[0] });
    else unmatched.push({
      eventId: row.eventId, teamId: row.teamId, teamName: row.teamName,
      category: row.category, division: row.division,
      reason: distinct.length === 0 ? "no-exact-match" : "ambiguous-exact-match",
      candidates: distinct.map(item => ({ logoPath: item.logoPath, sources: item.sources })),
    });
  }

  const collisionKeys = new Set();
  const byEventLogo = new Map();
  for (const match of tentative) {
    const key = `${match.row.eventId}|${match.item.logoPath}`;
    const names = byEventLogo.get(key) ?? new Set();
    names.add(`${match.row.teamId}|${normalize(match.row.teamName)}`);
    byEventLogo.set(key, names);
  }
  for (const [key, names] of byEventLogo) {
    if (names.size > 1) collisionKeys.add(key);
  }

  const safeMatches = [];
  for (const match of tentative) {
    const collision = `${match.row.eventId}|${match.item.logoPath}`;
    if (collisionKeys.has(collision)) {
      unmatched.push({
        eventId: match.row.eventId, teamId: match.row.teamId, teamName: match.row.teamName,
        category: match.row.category, division: match.row.division,
        reason: "same-logo-matches-multiple-teams-in-event",
        candidates: [{ logoPath: match.item.logoPath, sources: match.item.sources }],
      });
    } else safeMatches.push(match);
  }

  const pathsByBaseKey = new Map();
  for (const { row, item } of safeMatches) {
    const base = slug(row.teamName) || `clube-${item.logoPath.slice(12, 22)}`;
    const paths = pathsByBaseKey.get(base) ?? new Set();
    paths.add(item.logoPath);
    pathsByBaseKey.set(base, paths);
  }
  const conflictingBaseKeys = new Set([...pathsByBaseKey]
    .filter(([, paths]) => paths.size > 1).map(([key]) => key));

  const pathsByFamilyKey = new Map();
  for (const { row, item } of safeMatches) {
    const base = slug(row.teamName) || `clube-${item.logoPath.slice(12, 22)}`;
    const familyKey = `${base}-${familyForCategory(row.category) ?? "variant"}`;
    const paths = pathsByFamilyKey.get(familyKey) ?? new Set();
    paths.add(item.logoPath);
    pathsByFamilyKey.set(familyKey, paths);
  }

  const changes = safeMatches.map(({ row, item }) => ({
    eventId: row.eventId, teamId: row.teamId, teamName: row.teamName,
    clubKey: keyFor(row, item, conflictingBaseKeys, pathsByFamilyKey), logoPath: item.logoPath,
    source: item.sources,
  }));

  const report = {
    generatedAt: new Date().toISOString(), mode: apply ? "apply" : "dry-run",
    matched: changes.length, unresolved: unmatched.length,
    preservedDecisions: review.filter(decided).length,
    matches: changes, unresolvedItems: unmatched,
  };
  await fs.writeFile(reportFile, JSON.stringify(report, null, 2) + "\n");

  if (apply) {
    const byIdentity = new Map(changes.map(change => [`${change.eventId}|${change.teamId}`, change]));
    for (const row of review) {
      const change = byIdentity.get(identity(row));
      if (!change || decided(row)) continue;
      row.approved = true;
      row.skipReason = "";
      row.clubKey = change.clubKey;
      row.logoPath = change.logoPath;
      row.aliases = [...new Set([...(Array.isArray(row.aliases) ? row.aliases : []), row.teamName])];
    }
    if (skipUnmatched) {
      const unresolvedIds = new Set(unmatched.map(identity));
      for (const row of review) {
        if (!decided(row) && unresolvedIds.has(identity(row))) {
          row.approved = false;
          row.skipReason = "Sem correspondência automática de alta confiança";
          row.clubKey = "";
          row.logoPath = "";
        }
      }
    }
    await fs.copyFile(reviewFile, `${reviewFile}.bak`);
    await fs.writeFile(reviewFile, JSON.stringify(review, null, 2) + "\n");
  }

  console.log(JSON.stringify({
    mode: report.mode, matched: report.matched, unresolved: report.unresolved,
    preservedDecisions: report.preservedDecisions,
    report: path.relative(process.cwd(), reportFile),
    reviewUpdated: apply,
  }, null, 2));
}

main().catch(error => {
  console.error(error.message);
  process.exitCode = 1;
});
