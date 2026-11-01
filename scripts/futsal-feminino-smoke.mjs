/**
 * Smoke de integração LEITURA APENAS para o catálogo FPFS e endpoints esportivos.
 * Uso: $env:DNA_SMOKE_BASE_URL="http://localhost:3000"; node scripts/futsal-feminino-smoke.mjs
 * Para testar endpoints autenticados, use uma sessão de HOMOLOGAÇÃO em DNA_SMOKE_COOKIE.
 * Nunca armazene cookies em repositórios, arquivos de saída ou logs.
 */
import assert from "node:assert/strict";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";

function positiveId(value, description) {
  const number = Number(value);
  assert.ok(Number.isSafeInteger(number) && number > 0, `${description}: ID inválido`);
  return number;
}

export function validateBaseUrl(value, allowRemote = false) {
  const base = new URL(value);
  assert.ok(["http:", "https:"].includes(base.protocol), "A URL deve usar HTTP(S)");
  assert.equal(base.username, "", "Não informe credenciais na URL");
  assert.equal(base.password, "", "Não informe credenciais na URL");
  assert.equal(base.pathname, "/", "Informe somente a origem, sem caminho");
  assert.equal(base.search, "", "Não informe query params na URL base");
  const local = ["localhost", "127.0.0.1", "[::1]"].includes(base.hostname);
  assert.ok(local || allowRemote, "Destino remoto bloqueado. Para homologação remota, configure DNA_SMOKE_ALLOW_REMOTE=1.");
  return base;
}

function catalogUrl(path, query) {
  const params = new URLSearchParams(query);
  return `${path}?${params.toString()}`;
}

export async function runFemininoSmoke({
  baseUrl = "http://localhost:3000",
  season = 2026,
  cookie = "",
  allowRemote = false,
  request = fetch,
  log = () => undefined,
} = {}) {
  const base = validateBaseUrl(baseUrl, allowRemote);
  assert.ok(Number.isInteger(Number(season)) && Number(season) >= 2016 && Number(season) <= 2100,
    "Temporada inválida");

  const read = async (path, authenticated = false) => {
    const url = new URL(path, base);
    assert.equal(url.origin, base.origin, "O teste não pode fazer requisições a outra origem");
    const headers = { Accept: "application/json", "Cache-Control": "no-cache" };
    if (authenticated && cookie) headers.Cookie = cookie;
    const response = await request(url.href, {
      method: "GET",
      headers,
      redirect: "error",
      cache: "no-store",
      signal: AbortSignal.timeout(75_000),
    });
    assert.ok(response.ok, `${url.pathname}: resposta HTTP ${response.status}`);
    try {
      return await response.json();
    } catch {
      throw new Error(`${url.pathname}: resposta não é JSON válido`);
    }
  };

  const loadCompetition = async (title) => {
    const divisions = await read(catalogUrl("/api/catalog/divisions", { season, title }));
    assert.ok(Array.isArray(divisions) && divisions.length > 0,
      `A FPFS não retornou divisões para ${title} em ${season}`);
    const divisionIds = new Set();
    let result = null;
    for (const division of divisions) {
      const id = positiveId(division.id, `${title} divisão`);
      assert.ok(!divisionIds.has(id), `${title}: divisão duplicada no catálogo`);
      divisionIds.add(id);
      assert.ok(typeof division.name === "string" && division.name.trim(), `${title}: nome da divisão ausente`);
      const categories = await read(catalogUrl("/api/catalog/categories", {
        season, title, divisionId: id,
      }));
      assert.ok(Array.isArray(categories), `${title}: categorias inválidas`);
      if (!result && categories.length) {
        const category = categories[0];
        positiveId(category.id, `${title} categoria`);
        assert.ok(typeof category.name === "string" && category.name.trim(), `${title}: nome de categoria ausente`);
        result = {
          title,
          divisionId: id,
          categoryId: positiveId(category.id, `${title} categoria`),
          eventId: positiveId(category.eventId, `${title} evento`),
        };
      }
    }
    assert.ok(result, `${title}: nenhuma divisão possui categorias disponíveis`);
    return result;
  };

  const male = await loadCompetition("Paulista");
  const female = await loadCompetition("Paulista Feminino");
  assert.notEqual(male.eventId, female.eventId,
    "ALERTA: masculino e feminino apontam para o mesmo eventId");

  const defaultDivisions = await read(catalogUrl("/api/catalog/divisions", { season }));
  assert.ok(Array.isArray(defaultDivisions), "Catálogo masculino padrão inválido");
  assert.deepEqual(defaultDivisions.map((item) => String(item.id)).sort(),
    (await read(catalogUrl("/api/catalog/divisions", { season, title: "Paulista" })))
      .map((item) => String(item.id)).sort(),
    "A seleção masculina padrão mudou de comportamento");

  for (const chosen of [male, female]) {
    const teams = await read(catalogUrl("/api/catalog/teams", { eventId: chosen.eventId }));
    assert.ok(Array.isArray(teams), `${chosen.title}: consulta de times inválida`);
    const ids = teams.map((team) => String(team.id));
    assert.equal(new Set(ids).size, ids.length, `${chosen.title}: IDs duplicados na lista de times`);
    log(`${chosen.title}: evento ${chosen.eventId}, divisão ${chosen.divisionId}, ${teams.length} times`);
  }

  let authenticated = false;
  if (cookie) {
    authenticated = true;
    const profile = await read("/api/me", true);
    assert.ok(profile && typeof profile === "object" && profile.id, "Perfil não encontrado");
    for (const chosen of [male, female]) {
      const dashboard = await read(catalogUrl("/api/dashboard", { eventId: chosen.eventId }), true);
      assert.equal(Number(dashboard?.sports?.eventId), chosen.eventId,
        `${chosen.title}: Home não respeitou o eventId da exploração`);
    }

    const matches = await read(catalogUrl("/api/matches", { eventId: female.eventId }), true);
    for (const group of ["played", "upcoming", "pendingResults"]) {
      assert.ok(Array.isArray(matches?.[group]), `Jogos femininos: ${group} inválido`);
      for (const match of matches[group]) {
        assert.equal(Number(match.eventId), female.eventId, "Jogo pertence a outro evento");
      }
    }
    const standings = await read(catalogUrl("/api/standings", { eventId: female.eventId }), true);
    assert.ok(Array.isArray(standings), "Classificação feminina inválida");
    const scorers = await read(catalogUrl("/api/top-scorers", {
      eventId: female.eventId, scope: "GENERAL", limit: 10,
    }), true);
    assert.ok(Array.isArray(scorers), "Artilharia feminina inválida");
    const myTeam = await read("/api/my-team", true);
    if (profile.eventId != null) {
      assert.equal(Number(myTeam.eventId), Number(profile.eventId),
        "Meu Time não corresponde à preferência salva no perfil");
    }
    log("Home, Jogos, Tabela, Artilharia e Meu Time: consultas autenticadas aprovadas");
  }
  return { season: Number(season), male, female, authenticated };
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  try {
    const result = await runFemininoSmoke({
      baseUrl: process.env.DNA_SMOKE_BASE_URL || "http://localhost:3000",
      season: Number(process.env.DNA_SMOKE_SEASON || new Date().getFullYear()),
      cookie: process.env.DNA_SMOKE_COOKIE || "",
      allowRemote: process.env.DNA_SMOKE_ALLOW_REMOTE === "1",
      log: (message) => console.log(`✔ ${message}`),
    });
    console.log(`✔ Smoke concluído: ${result.season}; endpoints autenticados ${result.authenticated ? "testados" : "não testados (sem sessão)"}`);
  } catch (error) {
    console.error(`✖ Smoke reprovado: ${error instanceof Error ? error.message : "erro inesperado"}`);
    process.exitCode = 1;
  }
}
