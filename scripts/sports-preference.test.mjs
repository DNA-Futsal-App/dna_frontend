import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import ts from "typescript";

const source = readFileSync(new URL("../lib/sports-preference.ts", import.meta.url), "utf8");
const compiled = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 },
}).outputText;
const {
  divisionsCatalogUrl, categoriesCatalogUrl, buildSportsPreference, savedSportsPreference,
} = await import(`data:text/javascript;base64,${Buffer.from(compiled).toString("base64")}`);

test("keeps the legacy masculine catalog URLs unchanged", () => {
  assert.equal(divisionsCatalogUrl("PAULISTA"), "/api/catalog/divisions");
  assert.equal(divisionsCatalogUrl("LEGACY"), "/api/catalog/divisions");
  assert.equal(categoriesCatalogUrl("PAULISTA", "3"), "/api/catalog/categories?divisionId=3");
});

test("selects the female FPFS catalog using its official title", () => {
  assert.equal(divisionsCatalogUrl("PAULISTA_FEMININO"),
    "/api/catalog/divisions?title=Paulista%20Feminino");
  assert.equal(categoriesCatalogUrl("PAULISTA_FEMININO", "10"),
    "/api/catalog/categories?divisionId=10&title=Paulista%20Feminino");
});

test("sends a complete female preference with the official eventId", () => {
  assert.deepEqual(buildSportsPreference("PAULISTA_FEMININO", 926, "10", "20", "11"), {
    competitionCode: "PAULISTA_FEMININO", eventId: 926,
    divisionId: "10", categoryId: "20", teamId: "11",
  });
});

test("allows choosing the sports preference later", () => {
  assert.deepEqual(buildSportsPreference("PAULISTA", null, "", "", ""), {
    competitionCode: null, eventId: null, divisionId: null, categoryId: null, teamId: null,
  });
});

test("rejects partial selections and accidental legacy reassignment", () => {
  assert.throws(() => buildSportsPreference("PAULISTA_FEMININO", null, "10", "", ""));
  assert.throws(() => buildSportsPreference("LEGACY", 927, "10", "21", "11"));
  assert.throws(() => buildSportsPreference("PAULISTA", 927, "10", "", "11"));
});

test("keeps old Union preferences unchanged when only editing personal data", () => {
  assert.deepEqual(savedSportsPreference({
    competitionCode: null, eventId: 123456, divisionId: "3", categoryId: "7", teamId: "11",
  }), {
    competitionCode: null, eventId: 123456, divisionId: "3", categoryId: "7", teamId: "11",
  });
});
