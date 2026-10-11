import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
const file = new URL('../components/knockout-bracket.tsx', import.meta.url);
const code = ts.transpileModule(fs.readFileSync(file, 'utf8') + '\nexport { buildConnections, buildBracketPositions };', {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
}).outputText;
const loaded = { exports: {} };
vm.runInNewContext(code, {
  exports: loaded.exports,
  module: loaded,
  require: name => name === '@/components/team-mark'
    ? { TeamMark: () => null } : require(name),
});
const { buildKnockoutStages, KnockoutBracket, buildConnections, buildBracketPositions } = loaded.exports;
const team = (id, name = id) => ({ id, name });
const palmeiras = team('palmeiras', 'Palmeiras');
const saoPaulo = team('sao-paulo', 'São Paulo');
function match(id, home, away, overrides = {}) {
  return { id, eventId: 917, season: 2026, phase: 'Semifinal',
    homeTeam: home, awayTeam: away, homeScore: 3, awayScore: 1,
    scheduledDate: '2026-10-10', status: 'FINISHED', walkover: false, ...overrides };
}
const semis = () => [match('1', palmeiras, team('a')), match('2', saoPaulo, team('b'))];
const upcoming = overrides => ({ status: 'SCHEDULED', homeScore: null, awayScore: null, ...overrides });
const markup = stages => renderToStaticMarkup(React.createElement(KnockoutBracket, { stages }));
const ids = tie => Array.from(tie.teams, item => item.team.id);
const connections = stages => buildConnections(stages, buildBracketPositions(stages));

test('Palmeiras and São Paulo generate the final with no inherited score or date', () => {
  const stages = buildKnockoutStages(semis());
  assert.equal(stages.length, 2);
  assert.equal(stages[1].key, 'FINAL');
  const final = stages[1].ties[0];
  assert.deepEqual(ids(final), ['palmeiras', 'sao-paulo']);
  assert.equal(final.matches.length, 0);
  assert.ok(final.teams.every(item => item.score === null));
  assert.equal(final.complete, false);
  assert.match(markup(stages), /a definir/);
  assert.match(markup(stages), /Aguardando jogo/);
  assert.doesNotMatch(markup(stages), /Campeão/);
  assert.equal(connections(stages)[0].sources.length, 2);
});

test('one qualifier shows a definir as the other participant, with both feeder connections', () => {
  const games = semis();
  Object.assign(games[1], upcoming());
  const stages = buildKnockoutStages(games);
  const final = stages[1].ties[0];
  assert.equal(final.teams[0].team.id, 'palmeiras');
  assert.equal(final.teams[1].pending, true);
  assert.equal(final.teams[1].team.name, 'a definir');
  const links = connections(stages)[0].sources;
  assert.equal(links.length, 2);
  assert.equal(links.filter(source => source.confirmed).length, 1);
});

test('a published final replaces the projection and preserves its date, order and match', () => {
  const final = match('final', saoPaulo, palmeiras, upcoming({ phase: 'Final', scheduledDate: '2026-10-25' }));
  const stages = buildKnockoutStages([...semis(), final]);
  assert.equal(stages[1].ties.length, 1);
  assert.equal(stages[1].ties[0].matches[0], final);
  assert.deepEqual(ids(stages[1].ties[0]), ['sao-paulo', 'palmeiras']);
  assert.match(markup(stages), /25\/10/);
});

test('a scheduledAt-only final shows the date in São Paulo timezone', () => {
  const final = match('final', palmeiras, saoPaulo, upcoming({ phase: 'Final', scheduledDate: null, scheduledAt: '2026-10-26T01:00:00Z' }));
  assert.match(markup(buildKnockoutStages([...semis(), final])), /25\/10/);
});

test('live, tied and scoreless results do not produce a qualifier', () => {
  for (const change of [upcoming(), { status: 'LIVE' }, { homeScore: 2, awayScore: 2 }, { homeScore: null }]) {
    const stages = buildKnockoutStages(semis().map(game => ({ ...game, ...change })));
    assert.equal(stages.length, 1);
    assert.doesNotMatch(markup(stages), /Classificado definido/);
  }
});

test('a two-legged tie waits for both games to finish', () => {
  const games = [match('1', palmeiras, team('a')), match('2', team('a'), palmeiras, upcoming())];
  assert.equal(buildKnockoutStages(games).length, 1);
});

function quarters() {
  return [0, 1, 2, 3].map(index => match(String(index), team('winner-' + index), team('loser-' + index), { phase: 'Quartas de final' }));
}

test('a partially decided round only connects the correct feeder pair', () => {
  const games = quarters().map((game, index) => index === 2 ? game : { ...game, ...upcoming() });
  const stages = buildKnockoutStages(games);
  assert.equal(stages.length, 2);
  assert.equal(stages[1].ties.length, 1);
  assert.equal(stages[1].ties[0].teams[0].team.id, 'winner-2');
  assert.deepEqual(Array.from(connections(stages)[0].sources, source => source.position.tieIndex), [2, 3]);
});

test('existing next-round pairings take precedence over adjacent input games', () => {
  const games = quarters();
  const next = match('semi', team('winner-0'), team('winner-2'), upcoming());
  const stages = buildKnockoutStages([...games, next]);
  assert.equal(stages[1].ties.length, 2);
  const official = stages[1].ties.find(tie => tie.matches[0]?.id === 'semi');
  assert.equal(official.sourceTieKeys.length, 2);
  assert.ok(official.sourceTieKeys.includes(stages[0].ties.find(tie => ids(tie).includes('winner-0')).key));
  assert.ok(official.sourceTieKeys.includes(stages[0].ties.find(tie => ids(tie).includes('winner-2')).key));
  const pending = stages[1].ties.filter(tie => !tie.matches.length);
  assert.deepEqual(ids(pending[0]), ['winner-1', 'winner-3']);
  assert.ok(pending.every(tie => !ids(tie).includes('winner-0') && !ids(tie).includes('winner-2')));
});

test('a published semi and an unpublished semi coexist without duplicate qualified teams', () => {
  const stages = buildKnockoutStages([...quarters(), match('semi', team('winner-0'), team('winner-1'), upcoming())]);
  assert.equal(stages[1].ties.length, 2);
  assert.equal(new Set(stages[1].ties.flatMap(ids)).size, 4);
  assert.equal(connections(stages).length, 2);
});

test('published progression identifies a qualifier after a tied score', () => {
  const games = semis().map(game => ({ ...game, homeScore: 1, awayScore: 1 }));
  const stages = buildKnockoutStages([...games, match('final', palmeiras, saoPaulo, upcoming({ phase: 'Final' }))]);
  assert.equal(stages[1].ties.length, 1);
  assert.match(markup(stages), /Classificado definido/);
});

test('a published placeholder gets the qualified team while keeping the scheduled game', () => {
  const final = match('final', palmeiras, team('pending', 'a definir'), upcoming({ phase: 'Final', scheduledDate: '2026-10-25' }));
  const stages = buildKnockoutStages([...semis(), final]);
  assert.equal(stages[1].ties.length, 1);
  assert.deepEqual(ids(stages[1].ties[0]), ['palmeiras', 'sao-paulo']);
  assert.equal(stages[1].ties[0].matches[0], final);
});

test('finals never produce another round and completed finals retain the champion', () => {
  const stages = buildKnockoutStages([match('final', palmeiras, saoPaulo, { phase: 'Final' })]);
  assert.equal(stages.length, 1);
  assert.match(markup(stages), /Campeão/);
});

test('a dated final with two placeholders is reused for the qualifiers', () => {
  const final = match('final', team('pending-1', 'a definir'), team('pending-2', 'a definir'), upcoming({ phase: 'Final', scheduledDate: '2026-10-25' }));
  const stages = buildKnockoutStages([...semis(), final]);
  assert.equal(stages[1].ties.length, 1);
  assert.deepEqual(ids(stages[1].ties[0]), ['palmeiras', 'sao-paulo']);
  assert.equal(stages[1].ties[0].matches[0], final);
  assert.match(markup(stages), /25\/10/);
});
