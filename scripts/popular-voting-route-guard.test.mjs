import assert from "node:assert/strict";
import test from "node:test";
import { resolvePopularVotingRoute, validPopularVotingOrigin } from "../lib/popular-voting-route-guard.ts";

const edition = "12345678-1234-1234-1234-123456789abc";
const entry = "456789ab-1234-1234-1234-123456789abc";

test("aceita POST do voto com UUID válido e barra final", () => {
  assert.equal(resolvePopularVotingRoute("POST", ["editions", edition, "vote"])?.kind, "vote");
  assert.deepEqual(resolvePopularVotingRoute("POST", ["editions", edition, "vote/", ""]),
    { suffix: `editions/${edition}/vote`, kind: "vote" });
});
test("GET público e GET autenticado continuam separados", () => {
  assert.equal(resolvePopularVotingRoute("GET", ["editions"])?.kind, "editions");
  assert.equal(resolvePopularVotingRoute("GET", ["editions", edition, "contexts"])?.kind, "contexts");
  assert.equal(resolvePopularVotingRoute("GET", ["editions", edition, "board"])?.kind, "board");
  assert.equal(resolvePopularVotingRoute("GET", ["editions", edition, "my-vote"])?.kind, "my-vote");
  assert.equal(resolvePopularVotingRoute("GET", ["editions", edition, "media", entry])?.kind, "media");
});
test("rejeita métodos e caminhos não autorizados", () => {
  assert.equal(resolvePopularVotingRoute("GET", ["editions", edition, "vote"]), null);
  assert.equal(resolvePopularVotingRoute("POST", ["editions", edition, "board"]), null);
  assert.equal(resolvePopularVotingRoute("POST", ["editions", "undefined", "vote"]), null);
  assert.equal(resolvePopularVotingRoute("POST", ["editions", edition, "vote", "unexpected"]), null);
  assert.equal(resolvePopularVotingRoute("GET", ["editions", edition, "media", "bad-id"]), null);
});
test("aceita Origin HTTPS público atrás de proxy HTTP interno", () => {
  const h = new Headers({ origin: "https://dna.example.org", host: "dna.example.org", "sec-fetch-site": "same-origin" });
  assert.equal(validPopularVotingOrigin(h, "http://frontend:3000"), true);
});
test("rejeita origem externa, ausência de Origin e Sec-Fetch-Site cross-site", () => {
  assert.equal(validPopularVotingOrigin(new Headers({ origin: "https://evil.example.org", host: "dna.example.org", "sec-fetch-site": "cross-site" }), "http://frontend:3000"), false);
  assert.equal(validPopularVotingOrigin(new Headers({ host: "dna.example.org" }), "http://frontend:3000"), false);
  assert.equal(validPopularVotingOrigin(new Headers({ origin: "https://evil.example.org", host: "dna.example.org" }), "http://frontend:3000"), false);
});
test("origem pública configurada prevalece sobre Host", () => {
  const h = new Headers({ origin: "https://dna.example.org", host: "frontend:3000", "sec-fetch-site": "same-origin" });
  assert.equal(validPopularVotingOrigin(h, "http://frontend:3000", "https://dna.example.org"), true);
  assert.equal(validPopularVotingOrigin(h, "http://frontend:3000", "https://outro.example.org"), false);
});
