import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
function load(relativePath, imports = {}, extra = '') {
  const source = fs.readFileSync(new URL(relativePath, import.meta.url), 'utf8');
  const code = ts.transpileModule(source + extra, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(code, { module: loaded, exports: loaded.exports, require: name => imports[name] ?? require(name) });
  return loaded.exports;
}
const helpers = load('../lib/award-results-dashboard.ts');
const { buildAwardRaces, awardResultsCsv } = helpers;
const { ResultsDashboard } = load('../app/(authenticated)/app/admin/premio-dna/apuracao/page.tsx', {
  '@/lib/award-results-dashboard': helpers,
  '@/lib/client-api': { formatDate: () => '11/10/2026' },
  '@/lib/use-api-data': {},
  '@/components/team-mark': { TeamMark: () => null },
  '@/components/feedback': { EmptyState: ({ title }) => React.createElement('p', null, title) },
}, '\nexport { ResultsDashboard };');
const candidate = (id, votes, name = id) => ({ candidateId: id, candidateName: name, teamId: id, teamName: `Time ${id}`, votes, percentage: 0, rank: 0 });
const category = (id, candidates) => ({ voteCategoryId: id, code: id, label: `Prêmio ${id}`, targetType: 'ATHLETE', totalVotes: candidates.reduce((n, c) => n + c.votes, 0), candidates });
const context = (id, categories) => ({ eventId: id, divisionId: id, categoryId: 7, ballotsSubmitted: 10, categories });

test('removes candidates and entire disputes without votes, without mutating the response', () => {
  const contexts = [context(1, [category('fixo', [candidate('sem-votos', 0), candidate('votado', 4)]), category('vazio', [candidate('outro-zero', 0)])])];
  const original = JSON.stringify(contexts);
  const races = buildAwardRaces(contexts);
  assert.equal(races.length, 1);
  assert.equal(races[0].category.candidates.length, 1);
  assert.equal(races[0].category.candidates[0].candidateId, 'votado');
  assert.equal(races[0].lead, null);
  assert.equal(JSON.stringify(contexts), original);
  assert.equal(buildAwardRaces([]).length, 0);
});

test('orders by votes, keeps all joint leaders and computes shared ranks and percentages', () => {
  const [race] = buildAwardRaces([context(1, [category('ala', [candidate('C', 1), candidate('B', 4), candidate('A', 4), candidate('D', 1)])])]);
  assert.deepEqual(Array.from(race.category.candidates, c => c.candidateId), ['A', 'B', 'C', 'D']);
  assert.deepEqual(Array.from(race.category.candidates, c => c.rank), [1, 1, 3, 3]);
  assert.equal(race.leaders.length, 2);
  assert.equal(race.lead, 0);
  assert.equal(race.leaders[0].percentage, 40);
});

test('keeps divisions separate and reports the actual margin over second place', () => {
  const races = buildAwardRaces([context(1, [category('ala', [candidate('A', 8), candidate('B', 3)])]), context(2, [category('ala', [candidate('C', 2)])])]);
  assert.notEqual(races[0].key, races[1].key);
  assert.equal(races[0].lead, 5);
  assert.equal(races[1].lead, null);
});

test('CSV contains only voted candidates in the selected races and escapes spreadsheet values', () => {
  const races = buildAwardRaces([context(1, [category('ala', [candidate('zero', 0), candidate('A', 2, '=FORMULA'), candidate('B', 1, 'Nome "com aspas"')])]), context(2, [category('fixo', [candidate('fora-do-filtro', 5)])])]);
  const csv = awardResultsCsv(races.slice(0, 1));
  assert.ok(csv.startsWith('\ufeff'));
  assert.doesNotMatch(csv, /zero|fora-do-filtro/);
  assert.match(csv, /"'=FORMULA"/);
  assert.match(csv, /"Nome ""com aspas"""/);
  assert.match(csv, /66\.67/);
});

const edition = { id: 'edicao', slug: 'premio', name: 'Prêmio 2026', status: 'OPEN', season: 2026 };
function markup(contexts, integrityOk = true) {
  return renderToStaticMarkup(React.createElement(ResultsDashboard, { edition, refresh: () => {}, snapshot: {
    audit: { ballotsSubmitted: 10, voteRows: 20, completeBallots: 10, invalidBallots: 0, requiredCategories: 2, integrityOk, issues: [] },
    results: { contexts, integrityOk, voteRows: 20, ballotsSubmitted: 10 }, divisions: [], categories: {}, updatedAt: '2026-10-11T12:00:00Z',
  } }));
}

test('dashboard renders leaders, vote bars and ties, never zero-vote names', () => {
  const html = markup([context(1, [category('ala', [candidate('Candidato invisível', 0), candidate('Líder A', 4), candidate('Líder B', 4)])])]);
  assert.match(html, /Empate · 2 líderes/);
  assert.match(html, /Líder A/);
  assert.match(html, /Líder B/);
  assert.match(html, /width:50%/);
  assert.doesNotMatch(html, /Candidato invisível/);
  assert.match(html, /Resultados parciais/);
});

test('empty and blocked editions do not render misleading rankings', () => {
  const contexts = [context(1, [category('ala', [candidate('Oculto', 0)])])];
  assert.match(markup(contexts), /Aguardando os primeiros votos/);
  const blocked = markup([context(1, [category('ala', [candidate('Não publicar', 10)])])], false);
  assert.match(blocked, /Apuração bloqueada para conferência/);
  assert.doesNotMatch(blocked, /Não publicar|Exportar recorte/);
  assert.match(blocked, /<details open=""/);
});
