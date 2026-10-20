import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const page = readFileSync(
  new URL("../app/(authenticated)/app/premio/inscricao/page.tsx", import.meta.url),
  "utf8",
);

test("Prêmio Legacy consulta categorias apenas no catálogo filtrado por gênero", () => {
  assert.equal(
    (page.match(/\/api\/awards\/registrations\/catalog\/categories\?/g) ?? []).length,
    1,
  );
  assert.match(page, /\/api\/awards\/registrations\/catalog\/categories\?gender=\$\{encodeURIComponent\(/);
  assert.match(page, /divisionId=\$\{encodeURIComponent\(/);
  assert.doesNotMatch(page, /\/api\/catalog\/categories\?/);
});

test("times são carregados uma vez usando o evento da categoria selecionada", () => {
  assert.equal((page.match(/\/api\/catalog\/teams\?/g) ?? []).length, 1);
  assert.match(page, /const eventId = sportsCategory\?\.eventId \?\? null/);
  assert.match(page, /\/api\/catalog\/teams\?eventId=\$\{encodeURIComponent\(/);
});

test("troca de gênero limpa a seleção esportiva e as opções anteriores", () => {
  const start = page.indexOf("const nextGender =");
  const end = page.indexOf('<option value="MALE">', start);
  assert.ok(start >= 0 && end > start);
  const changeHandler = page.slice(start, end);
  for (const reset of [
    "setDivisionId(\"\")",
    "setCategoryId(\"\")",
    "setTeamId(\"\")",
    "setDivisions([])",
    "setCategories([])",
    "setTeams([])",
  ]) {
    assert.ok(changeHandler.includes(reset), `Reset ausente: ${reset}`);
  }
});
