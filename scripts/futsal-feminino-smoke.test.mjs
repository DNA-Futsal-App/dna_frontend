import { test } from "node:test";
import assert from "node:assert/strict";
import { runFemininoSmoke, validateBaseUrl } from "./futsal-feminino-smoke.mjs";

function fixture({ wrongFemale = false, missingFemale = false, wrongHome = false } = {}) {
  const visits = [];
  const handler = async (input, init) => {
    const url = new URL(input);
    visits.push({ path: url.pathname, query: url.searchParams.toString(), cookie: init.headers.Cookie, method: init.method });
    const title = url.searchParams.get("title") ?? "Paulista";
    const female = title === "Paulista Feminino" && !wrongFemale;
    const eventId = female ? 926 : 917;
    let body;
    if (url.pathname === "/api/catalog/divisions") {
      body = [{ id: female ? 10 : 3, name: female ? "A2 Feminino" : "A1" }];
    } else if (url.pathname === "/api/catalog/categories") {
      body = female && missingFemale ? [] : [{ id: female ? 20 : 7, name: "Principal", eventId }];
    } else if (url.pathname === "/api/catalog/teams") {
      body = [{ id: "13", name: "Equipe" }];
    } else if (url.pathname === "/api/me") {
      body = { id: "user", eventId: 917, competitionCode: "PAULISTA" };
    } else if (url.pathname === "/api/dashboard") {
      body = { sports: { eventId: wrongHome ? 917 : Number(url.searchParams.get("eventId")) }, news: { content: [] } };
    } else if (url.pathname === "/api/matches") {
      body = { played: [], upcoming: [{ eventId: 926 }], pendingResults: [] };
    } else if (url.pathname === "/api/standings" || url.pathname === "/api/top-scorers") {
      body = [];
    } else if (url.pathname === "/api/my-team") {
      body = { eventId: 917, configured: true };
    } else {
      return Response.json({ detail: "Rota inesperada" }, { status: 404 });
    }
    return Response.json(body);
  };
  return { handler, visits };
}

test("catálogo feminino e masculino isolados sem alterar o padrão legado", async () => {
  const { handler, visits } = fixture();
  const result = await runFemininoSmoke({ season: 2026, request: handler });
  assert.equal(result.male.eventId, 917);
  assert.equal(result.female.eventId, 926);
  assert.equal(result.authenticated, false);
  assert.ok(visits.some((call) => call.path === "/api/catalog/categories" && call.query.includes("title=Paulista+Feminino")));
  assert.ok(visits.every((call) => !call.cookie));
});

test("bloqueia quando o título feminino retorna o evento masculino", async () => {
  await assert.rejects(runFemininoSmoke({ season: 2026, request: fixture({ wrongFemale: true }).handler }),
    /mesmo eventId/);
});

test("bloqueia catálogo feminino sem categoria para a temporada", async () => {
  await assert.rejects(runFemininoSmoke({ season: 2026, request: fixture({ missingFemale: true }).handler }),
    /nenhuma divisão possui categorias/);
});

test("verifica endpoints autenticados sem escrever dados no servidor", async () => {
  const { handler, visits } = fixture();
  const result = await runFemininoSmoke({ season: 2026, cookie: "dna_access=example", request: handler });
  assert.equal(result.authenticated, true);
  assert.ok(visits.some((call) => call.path === "/api/my-team" && call.cookie));
  assert.ok(visits.every((call) => !["POST", "PUT", "PATCH", "DELETE"].includes(call.method)));
});

test("detecta Home retornando campeonato diferente do pesquisado", async () => {
  await assert.rejects(runFemininoSmoke({ season: 2026, cookie: "test", request: fixture({ wrongHome: true }).handler }),
    /Home não respeitou o eventId/);
});

test("recusa envio acidental de sessão para destinos remotos", () => {
  assert.throws(() => validateBaseUrl("https://example.org"), /Destino remoto bloqueado/);
  assert.equal(validateBaseUrl("http://localhost:3000").port, "3000");
  assert.equal(validateBaseUrl("https://homologacao.example.org", true).hostname, "homologacao.example.org");
});
