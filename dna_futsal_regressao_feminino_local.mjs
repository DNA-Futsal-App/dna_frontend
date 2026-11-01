import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const ts = require('typescript');
const file = './lib/competition-event-guard.ts';
const source = readFileSync(file, 'utf8');
const parsed = ts.createSourceFile(file, source, ts.ScriptTarget.ES2022, true, ts.ScriptKind.TS);
assert.equal(parsed.parseDiagnostics.length, 0, 'guard TypeScript deve estar sintaticamente válido');
const js = ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const {firstVerifiedCompetition, assertCatalogEventIsolation} = await import(`data:text/javascript;base64,${Buffer.from(js).toString('base64')}`);
const requests = {
  divisions: async () => [{id: 3,name:'A1'}],
  categories: async code => code === 'PAULISTA'
    ? [{id:7,name:'Principal',eventId:917}]
    : [{id:20,name:'Principal Feminino',eventId:932}],
};
test('feminino carrega evento 932, não 917',async()=>{
  const selected=await firstVerifiedCompetition('PAULISTA_FEMININO',requests);
  assert.equal(selected.eventId,932);
  assert.equal(selected.competitionCode,'PAULISTA_FEMININO');
});
test('masculino preserva evento masculino',async()=>{
  assert.equal((await firstVerifiedCompetition('PAULISTA',requests)).eventId,917);
});
test('evento masculino indevido é rejeitado para feminino',async()=>{
  await assert.rejects(firstVerifiedCompetition('PAULISTA_FEMININO',{
    ...requests,
    categories:async()=>[{id:7,name:'Principal',eventId:917}],
  }),/evento masculino/);
});
test('catálogo vazio não faz fallback',async()=>{
  await assert.rejects(firstVerifiedCompetition('PAULISTA_FEMININO',{
    ...requests,divisions:async()=>[],
  }),/não retornou divisões/);
});
test('divisão exclusiva do feminino pode ser consultada',async()=>{
  await assertCatalogEventIsolation('PAULISTA_FEMININO','10',932,{
    ...requests,divisions:async()=>[{id:3,name:'A1'}],
  });
});
test('a troca não oculta o aplicativo inteiro ou depende de /api/catalog/event',()=>{
  const source=readFileSync('./components/competition-search.tsx','utf8');
  assert.doesNotMatch(source,/className=\{switching \? "hidden"/);
  assert.doesNotMatch(source,/\/api\/catalog\/event\?/);
  assert.match(source,/Não foi possível trocar o campeonato/);
});
test('perfil evita reutilizar categorias antigas',()=>{
  const source=readFileSync('./app/(authenticated)/app/perfil/page.tsx','utf8');
  assert.match(source,/categoryScope/);
  assert.match(source,/visibleCategories/);
  assert.match(source,/visibleDivisions/);
  assert.match(source,/selecione divisão e categoria antes de salvar/);
});
test('rotas do catálogo não emitem fixtures masculinas em título feminino',()=>{
  for(const p of ['divisions','categories']){
    const source=readFileSync(`./app/api/catalog/${p}/route.ts`,'utf8');
    assert.match(source,/demoEnabled\(\) && !title/);
  }
});

test('perfil compara o eventId feminino com o catálogo masculino antes do PUT',()=>{
  const source = readFileSync('./app/(authenticated)/app/perfil/page.tsx','utf8');
  assert.ok(source.includes('await assertCatalogEventIsolation("PAULISTA_FEMININO", sports.divisionId, sports.eventId'));
});
