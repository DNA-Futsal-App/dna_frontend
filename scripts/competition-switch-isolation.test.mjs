import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
const require = createRequire(import.meta.url);
const ts = require("typescript");
const source = readFileSync(new URL("../lib/competition-event-guard.ts", import.meta.url), "utf8");
const js = ts.transpileModule(source, { compilerOptions: {
  module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022,
}}).outputText;
const { firstVerifiedCompetition, isCompetitionEvent } = await import(
  `data:text/javascript;base64,${Buffer.from(js).toString("base64")}`,
);

const catalog = (title, id) => ({
  divisions: async () => [{id: 4, name: "A2"}],
  categories: async () => [
    {id: 21, name: "Sub-12 Feminino", eventId: 926},
    {id: 30, name: "Principal Feminino", eventId: id},
  ],
  event: async (eventId) => ({ eventId, title }),
});

test("Feminino só aceita metadados de evento feminino", () => {
  assert.equal(isCompetitionEvent("PAULISTA_FEMININO", "Campeonato Paulista Feminino"), true);
  assert.equal(isCompetitionEvent("PAULISTA_FEMININO", "Campeonato Paulista"), false);
  assert.equal(isCompetitionEvent("PAULISTA", "Campeonato Paulista Feminino"), false);
  assert.equal(isCompetitionEvent("PAULISTA", "Campeonato Paulista"), true);
});

test("Trocar para feminino ativa o eventId feminino, priorizando Principal", async () => {
  const result = await firstVerifiedCompetition(
    "PAULISTA_FEMININO", catalog("Campeonato Paulista Feminino", 932),
  );
  assert.equal(result.eventId, 932);
  assert.equal(result.competitionCode, "PAULISTA_FEMININO");
  assert.equal(result.categoryName, "Principal Feminino");
});

test("Rejeita catálogo que entrega evento masculino para seleção feminina", async () => {
  await assert.rejects(() => firstVerifiedCompetition(
    "PAULISTA_FEMININO", catalog("Campeonato Paulista", 917),
  ), /Inconsistência no catálogo/);
});

test("Não reutiliza evento anterior se o catálogo feminino estiver vazio", async () => {
  await assert.rejects(() => firstVerifiedCompetition("PAULISTA_FEMININO", {
    divisions: async () => [], categories: async () => [],
    event: async () => ({ eventId: 917, title: "Campeonato Paulista" }),
  }), /não retornou divisões/);
});

test("Rejeita metadados de um eventId diferente", async () => {
  const requests = catalog("Campeonato Paulista Feminino", 932);
  requests.event = async () => ({eventId: 917, title: "Campeonato Paulista Feminino"});
  await assert.rejects(() => firstVerifiedCompetition("PAULISTA_FEMININO", requests),
    /Inconsistência no catálogo/);
});

test("Fluxo visual bloqueia os dados da seleção anterior até validar", () => {
  const component = readFileSync(new URL("../components/competition-search.tsx", import.meta.url), "utf8");
  assert.match(component, /setSwitching\(\{ code, error: null \}\)/);
  assert.match(component, /className=\{switching \? "hidden" : "contents"\}/);
  assert.match(component, /void switchCompetition\(code\)/);
  assert.match(component, /isCompetitionEvent\(competitionCode, event.title\)/);
});
