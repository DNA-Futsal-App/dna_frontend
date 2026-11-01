import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createRequire } from 'node:module';
import vm from 'node:vm';

const require = createRequire(import.meta.url);
// O projeto Next.js já possui typescript como dependência de desenvolvimento.
const ts = require('typescript');
const base = process.cwd();
function loadRoute(routeName, demoMode = false) {
  const routeFile = resolve(base, 'app', 'api', 'catalog', routeName, 'route.ts');
  const source = readFileSync(routeFile, 'utf8');
  const transpiled = ts.transpileModule(source, {
    fileName: routeFile,
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
    reportDiagnostics: true,
  });
  assert.equal(transpiled.diagnostics?.length ?? 0, 0, `Falha de sintaxe em ${routeName}/route.ts`);
  const routeModule = { exports: {} };
  const called = [];
  const json = (body, options) => ({ type: 'json', body, status: options?.status ?? 200 });
  vm.runInNewContext(transpiled.outputText, {
    module: routeModule,
    exports: routeModule.exports,
    URLSearchParams,
    Date,
    require: name => {
      if (name === 'next/server') return { NextResponse: { json } };
      if (name === '@/lib/backend') return {
        demoEnabled: () => demoMode,
        proxyPublic: path => { called.push(path); return { type: 'proxy', path }; },
      };
      throw new Error(`Import inesperado em ${routeName}: ${name}`);
    },
  }, { filename: routeFile });
  assert.equal(typeof routeModule.exports.GET, 'function');
  return { get: routeModule.exports.GET, called };
}
const request = url => ({ nextUrl: new URL(`https://teste.local${url}`) });

// Consultas de catálogo devem preservar a escolha feminina até o backend.
test('divisões femininas: season e title chegam ao backend', async () => {
  const { get } = loadRoute('divisions');
  const result = await get(request('/api/catalog/divisions?season=2026&title=Paulista%20Feminino'));
  assert.equal(result.type, 'proxy');
  const params = new URLSearchParams(result.path.split('?')[1]);
  assert.equal(params.get('title'), 'Paulista Feminino');
  assert.equal(params.get('season'), '2026');
});
test('categorias femininas: divisão e title chegam ao backend', async () => {
  const { get } = loadRoute('categories');
  const result = await get(request('/api/catalog/categories?divisionId=10&season=2026&title=Paulista%20Feminino'));
  assert.equal(result.type, 'proxy');
  const params = new URLSearchParams(result.path.split('?')[1]);
  assert.equal(params.get('title'), 'Paulista Feminino');
  assert.equal(params.get('season'), '2026');
  assert.equal(params.get('divisionId'), '10');
});
test('consulta masculina legada não recebe title por padrão', async () => {
  const { get } = loadRoute('divisions');
  const result = await get(request('/api/catalog/divisions?season=2026'));
  assert.equal(result.path, '/api/v1/public/catalog/divisions?season=2026');
});
test('modo DEMO não devolve fixture masculina em consulta feminina', async () => {
  for (const name of ['divisions', 'categories']) {
    const { get } = loadRoute(name, true);
    const path = name === 'divisions'
      ? '/api/catalog/divisions?season=2026&title=Paulista%20Feminino'
      : '/api/catalog/categories?divisionId=10&season=2026&title=Paulista%20Feminino';
    const response = await get(request(path));
    assert.equal(response.type, 'proxy', `A rota ${name} não pode devolver fixture masculina`);
  }
});
test('modo DEMO preserva fixtures antigas do masculino', async () => {
  for (const name of ['divisions', 'categories']) {
    const { get } = loadRoute(name, true);
    const path = name === 'divisions'
      ? '/api/catalog/divisions?season=2026'
      : '/api/catalog/categories?divisionId=3&season=2026';
    const response = await get(request(path));
    assert.equal(response.type, 'json');
  }
});
test('categorias sem divisão retornam 400 sem chamar o backend', async () => {
  const { get, called } = loadRoute('categories');
  const response = await get(request('/api/catalog/categories?title=Paulista%20Feminino'));
  assert.equal(response.status, 400);
  assert.equal(response.body.code, 'DIVISION_REQUIRED');
  assert.deepEqual(called, []);
});
