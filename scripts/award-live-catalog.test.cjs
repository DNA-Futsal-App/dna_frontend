import {assert} from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import ts from 'typescript';


function load() {
  const source = fs.readFileSync(path.join(__dirname, '../lib/award-live-catalog.ts'), 'utf8');
  const result = ts.transpileModule(source, { compilerOptions: { modules: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 }, reportDiagnostics: true });
  assert.equal(result.diagnostics.filter(d => d.category === ts.DiagnosticCategory.Error).length, 0);
  const modules = { exports: {} };
  let timer, listener, cleared = false;
  const document = {
    hidden: false,
    addEventListener(name, callback) { assert.equal(name, 'visibilitychange'); listener = callback; },
    removeEventListener(name, callback) { assert.equal(name, 'visibilitychange'); assert.equal(callback, listener); listener = undefined; },
  };
  const window = {
    setInterval(callback, delay) { timer = callback; assert.equal(delay, 10000); return 1; },
    clearInterval(id) { assert.equal(id, 1); cleared = true; timer = undefined; },
  };
  vm.runInNewContext(result.outputText, { modules, exports: modules.exports, require: () => ({}), window, document });
  return { ...modules.exports, document, tick: () => timer(), visibility: () => listener(), isStopped: () => cleared && !timer && !listener };
}

test('competition identity includes event, division and category; no guessed championship', () => {
  const { liveContextKey, championshipKey, championshipLabel } = load();
  const a = { eventId: 100, divisionId: 3, categoryId: 12 };
  const b = { ...a, eventId: 101 };
  const catalog = { [liveContextKey(a)]: { championship: 'Paulista', division: 'A1', category: 'Sub-12' }, [liveContextKey(b)]: { championship: 'Paulista Feminino', division: 'A1', category: 'Sub-12' } };
  assert.notEqual(liveContextKey(a), liveContextKey(b));
  assert.equal(championshipKey(a, catalog), 'Paulista');
  assert.equal(championshipKey(b, catalog), 'Paulista Feminino');
  assert.equal(championshipKey({ ...a, eventId: 999 }, catalog), 'event:999');
  assert.match(championshipLabel('event:999'), /não identificado/);
});

test('polls immediately and resumes on visibility; hidden tabs and unmounted views stop polling', () => {
  const api = load();
  let count = 0;
  const stop = api.startAwardPolling(async () => { count++; });
  assert.equal(count, 1);
  api.tick(); assert.equal(count, 2);
  api.document.hidden = true;
  api.tick(); api.visibility(); assert.equal(count, 2);
  api.document.hidden = false;
  api.visibility(); assert.equal(count, 3);
  stop(); assert.equal(api.isStopped(), true);
});
