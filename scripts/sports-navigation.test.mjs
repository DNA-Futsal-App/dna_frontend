import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(new URL("../lib/sports-navigation.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { dashboardUrl, sportsHomePath } = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);
const fromSource = (path) => readFileSync(new URL(path, import.meta.url), "utf8");

test("Home without a profile or an exploration preserves the existing default", () => {
  assert.equal(dashboardUrl(null), "/api/dashboard");
  assert.equal(sportsHomePath(new URLSearchParams()), "/api/v1/home");
});

test("Home browsing passes the official eventId through the API proxy", () => {
  assert.equal(dashboardUrl(926), "/api/dashboard?eventId=926");
  assert.equal(sportsHomePath(new URLSearchParams("eventId=926")), "/api/v1/home?eventId=926");
});

test("Home proxy ignores unrelated user-supplied filters", () => {
  assert.equal(sportsHomePath(new URLSearchParams("title=Paulista%20Feminino&eventId=927&teamId=123")),
    "/api/v1/home?eventId=927");
});

test("CompetitionSearch fetches titles independently and resets dependent IDs", () => {
  const component = fromSource("../components/competition-search.tsx");
  assert.match(component, /divisionsCatalogUrl\(competitionCode\)/);
  assert.match(component, /categoriesCatalogUrl\(competitionCode, divisionId\)/);
  assert.match(component, /setDraftDivisionId\(""\)/);
  assert.match(component, /setDraftCategoryId\(""\)/);
  assert.match(component, /competitionCode,\s*eventId: category\.eventId/);
});

test("Jogos, Tabela and Artilharia consume a shared, unsaved eventId", () => {
  for (const name of ["jogos", "tabela", "artilharia"]) {
    const page = fromSource(`../app/(authenticated)/app/${name}/page.tsx`);
    assert.match(page, /useCompetitionBrowse/);
    assert.match(page, /activeEventId/);
  }
  const ownTeam = fromSource("../app/(authenticated)/app/meu-time/page.tsx");
  assert.match(ownTeam, /"\/api\/my-team"/);
});
