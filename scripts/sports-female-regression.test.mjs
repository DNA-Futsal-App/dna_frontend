import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";

// Uses the exact TS utility under test (available in frontend devDependencies).
const require = createRequire(import.meta.url);
const ts = require("typescript");
const source = readFileSync(new URL("../lib/sports-preference.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const { buildSportsPreference } = await import(`data:text/javascript;base64,${Buffer.from(js).toString("base64")}`);

test("Feminino sem categoria mantém competitionCode sem evento masculino", () => {
  assert.deepEqual(buildSportsPreference("PAULISTA_FEMININO", null, "", "", ""), {
    competitionCode: "PAULISTA_FEMININO", eventId: null,
    divisionId: null, categoryId: null, teamId: null,
  });
});

test("Masculino sem categoria mantém o padrão legado", () => {
  assert.equal(buildSportsPreference("PAULISTA", null, "", "", "").competitionCode, null);
});

test("Feminino com categoria preserva o eventId da FPFS", () => {
  assert.equal(buildSportsPreference("PAULISTA_FEMININO", 926, "10", "20", "11").eventId, 926);
});

test("Troca de campeonato inicia navegação imediata para o evento oficial", () => {
  const component = readFileSync(new URL("../components/competition-search.tsx", import.meta.url), "utf8");
  assert.match(component, /void switchCompetition\(code\)/);
  assert.match(component, /firstVerifiedCompetition/);
});

test("trocar a preferência salva remove uma exploração masculina anterior", () => {
  const component = readFileSync(new URL("../components/competition-search.tsx", import.meta.url), "utf8");
  assert.match(component, /lastProfilePreference/);
  assert.match(component, /previousPreference === currentPreference/);
  assert.match(component, /setSelection\(null\)/);
});
