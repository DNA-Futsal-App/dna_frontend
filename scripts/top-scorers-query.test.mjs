import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import ts from 'typescript';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

const require = createRequire(import.meta.url);
function load(path, imports = {}, extra = '') {
  const code = ts.transpileModule(fs.readFileSync(new URL(path, import.meta.url), 'utf8') + extra, {
    compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX },
  }).outputText;
  const loaded = { exports: {} };
  vm.runInNewContext(code, { module: loaded, exports: loaded.exports, URLSearchParams, require: name => imports[name] ?? require(name) });
  return loaded.exports;
}
const helpers = load('../lib/top-scorers-query.ts');
const { topScorersUrl, hasKnockoutScorers } = helpers;

test('general always sends an explicit phase, including when using the profile event', () => {
  const url = new URL(topScorersUrl(null, 'general', 10), 'http://localhost');
  assert.equal(url.searchParams.get('phase'), 'Geral');
  assert.equal(url.searchParams.get('limit'), '10');
  assert.equal(url.searchParams.has('eventId'), false);
});

test('pagination keeps the same event and phase in both views', () => {
  for (const scope of ['general', 'knockout']) {
    for (const limit of [10, 20, 30, 500]) {
      const url = new URL(topScorersUrl(917, scope, limit), 'http://localhost');
      assert.equal(url.searchParams.get('eventId'), '917');
      assert.equal(url.searchParams.get('phase'), scope === 'general' ? 'Geral' : 'mata');
      assert.equal(url.searchParams.get('limit'), String(limit));
    }
  }
});

test('availability requires real knockout rows, not just games or a generic response', () => {
  assert.equal(hasKnockoutScorers(null), false);
  assert.equal(hasKnockoutScorers([]), false);
  assert.equal(hasKnockoutScorers([{ phase: 'Geral' }]), false);
  assert.equal(hasKnockoutScorers([{ phase: null }]), false);
  for (const phase of ['Mata-mata', 'MATA MATA', 'Mata–mata']) {
    assert.equal(hasKnockoutScorers([{ phase }]), true);
  }
});

function pageWithRows(rows) {
  const { default: Page, ScorerRanking } = load('../app/(authenticated)/app/artilharia/page.tsx', {
    '@/lib/top-scorers-query': helpers,
    '@/lib/client-api': {},
    '@/lib/use-api-data': { useApiData: url => ({ data: url.includes('limit=1&') ? rows : [], loading: false, error: '', reload() {} }) },
    '@/components/competition-search': { useCompetitionBrowse: () => ({ activeEventId: 917 }), CompetitionSearch: () => null },
    '@/components/page-intro': { PageIntro: () => null },
    '@/components/athlete-avatar': { AthleteAvatar: () => null },
    '@/components/team-mark': { TeamMark: () => null },
    '@/components/top-scorer-list': { TopScorerList: () => null },
    '@/components/feedback': { EmptyState: ({ title }) => React.createElement('p', null, title) },
  }, '\nexport { ScorerRanking };');
  return { Page, ScorerRanking };
}

test('the selector is hidden without a knockout ranking and starts in Geral when available', () => {
  for (const rows of [[], [{ phase: 'Geral' }]]) {
    const { Page } = pageWithRows(rows);
    assert.doesNotMatch(renderToStaticMarkup(React.createElement(Page)), /Recorte da artilharia/);
  }
  const { Page } = pageWithRows([{ phase: 'Mata-Mata' }]);
  const html = renderToStaticMarkup(React.createElement(Page));
  assert.match(html, /Recorte da artilharia/);
  assert.match(html, /aria-pressed="true"[^>]*>Geral</);
  assert.match(html, /aria-pressed="false"[^>]*>Mata-mata</);
});

test('an empty knockout response is identified correctly instead of falling back to general goals', () => {
  const { ScorerRanking } = pageWithRows([]);
  const html = renderToStaticMarkup(React.createElement(ScorerRanking, { eventId: 917, scope: 'knockout' }));
  assert.match(html, /Artilharia do mata-mata ainda vazia/);
  assert.doesNotMatch(html, /Líder da artilharia geral/);
});
