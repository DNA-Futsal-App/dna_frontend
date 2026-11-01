import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import vm from "node:vm";
const nodeRequire = createRequire(import.meta.url);
const ts = nodeRequire("typescript");

function route(name) {
  const source = readFileSync(
    new URL(`../app/api/catalog/${name}/route.ts`, import.meta.url),
    "utf8",
  );
  const code = ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText;
  const output = { exports: {} };
  const calls = [];
  vm.runInNewContext(code, {
    module: output,
    exports: output.exports,
    URLSearchParams,
    require: name => {
      if (name === "next/server") {
        return { NextResponse: { json: (body, config) => ({ body, status: config?.status ?? 200 }) } };
      }
      if (name === "@/lib/backend") {
        return { demoEnabled: () => false, proxyPublic: path => { calls.push(path); return path; } };
      }
      return nodeRequire(name);
    },
  });
  return { get: output.exports.GET, calls };
}

function request(path) {
  return { nextUrl: new URL(`https://example.org${path}`) };
}

test("divisions: preserves the masculine default for existing clients", async () => {
  const { get } = route("divisions");
  const response = await get(request("/api/catalog/divisions?season=2026"));
  assert.equal(response, "/api/v1/public/catalog/divisions?season=2026");
});

test("divisions: forwards female title without changing the original API", async () => {
  const { get } = route("divisions");
  const response = await get(request("/api/catalog/divisions?season=2026&title=Paulista%20Feminino"));
  const params = new URLSearchParams(response.split("?")[1]);
  assert.equal(params.get("title"), "Paulista Feminino");
  assert.equal(params.get("season"), "2026");
});

test("categories: female title and division are forwarded together", async () => {
  const { get } = route("categories");
  const response = await get(request("/api/catalog/categories?season=2026&divisionId=10&title=Paulista%20Feminino"));
  const params = new URLSearchParams(response.split("?")[1]);
  assert.equal(params.get("title"), "Paulista Feminino");
  assert.equal(params.get("divisionId"), "10");
});

test("categories: still rejects a missing division", async () => {
  const { get, calls } = route("categories");
  const response = await get(request("/api/catalog/categories?title=Paulista%20Feminino"));
  assert.equal(response.status, 400);
  assert.equal(response.body.code, "DIVISION_REQUIRED");
  assert.equal(calls.length, 0);
});

test("teams: official eventId remains the sole routing filter", async () => {
  const { get } = route("teams");
  const response = await get(request("/api/catalog/teams?eventId=927"));
  assert.equal(response, "/api/v1/public/catalog/teams?eventId=927");
});
