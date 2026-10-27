#!/usr/bin/env node
/**
 * DNA Futsal - reparo v2 do código gerado pelos patches entregues (somente Node.js >= 20).
 * Uso: node dna_futsal_reparo_feminino_NODE.mjs --check | --apply
 * Não usa Python, npx, npm install nem bibliotecas externas.
 * Nunca altera node_modules. Pré-valida todos os arquivos antes da primeira gravação.
 */
import { readFileSync, writeFileSync, mkdirSync, copyFileSync, renameSync, rmSync, statSync, existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const mode = process.argv.includes('--apply') ? 'apply' : process.argv.includes('--check') ? 'check' : null;
if (!mode || (process.argv.includes('--apply') && process.argv.includes('--check'))) {
  console.error('Uso: node dna_futsal_reparo_feminino_NODE.mjs --check OU --apply');
  process.exit(2);
}
const rootFlag = process.argv.indexOf('--root');
const root = path.resolve(rootFlag >= 0 ? process.argv[rootFlag + 1] || '.' : '.');
const files = [
  'components/competition-search.tsx',
  'app/(authenticated)/app/perfil/page.tsx',
  'lib/competition-event-guard.ts',
  'app/api/catalog/divisions/route.ts',
  'app/api/catalog/categories/route.ts',
];
class Abort extends Error {}
function must(cond, msg) { if (!cond) throw new Abort(msg); }
function info(msg) { process.stdout.write(msg + '\n'); }
function normalizeEol(s) { return s.replace(/\r\n/g, '\n'); }
function editor(rel) {
  const absolute = path.join(root, rel);
  must(existsSync(absolute) && statSync(absolute).isFile(), `Arquivo não encontrado: ${rel}`);
  const bytes = readFileSync(absolute);
  const original = bytes.toString('utf8');
  must(!original.includes('\uFFFD'), `Codificação não suportada: ${rel}`);
  return {
    rel, absolute, original, text: normalizeEol(original),
    eol: original.includes('\r\n') ? '\r\n' : '\n', changes: [],
    replace(old, replacement, label) {
      const count = this.text.split(old).length - 1;
      must(count === 1, `${rel}: ${label}: esperava 1 trecho, encontrei ${count}. ABORTADO antes de alterar qualquer arquivo.`);
      this.text = this.text.replace(old, replacement);
      this.changes.push(label);
    },
    finalize() { return this.eol === '\r\n' ? this.text.replace(/\n/g, '\r\n') : this.text; },
  };
}
try {
  const [comp, profile, guard, divs, cats] = files.map(editor);

  // 1. Desativar o overlay global introduzido no patch automático v1.
  const start = '      <div className={switching ? "hidden" : "contents"}>{children}</div>\n      {switching ? (';
  const tail = '      ) : null}\n    </CompetitionBrowseContext.Provider>';
  const i = comp.text.indexOf(start);
  const j = i >= 0 ? comp.text.indexOf(tail, i) : -1;
  must(i >= 0 && j > i, 'competition-search.tsx: não encontrei exatamente o bloqueio global do patch v1.');
  comp.replace(comp.text.slice(i, j + tail.length),
    '      {children}\n    </CompetitionBrowseContext.Provider>', 'remover bloqueio global');

  comp.replace('    isExploring,\n    switchCompetition,\n    selectCompetition,',
    '    isExploring,\n    switching,\n    switchCompetition,\n    cancelSwitch,\n    selectCompetition,', 'mostrar estado de erro no seletor');
  comp.replace('      <p className="mt-3 text-xs text-muted">\n        Trocar o campeonato',
`      {switching ? (
        <div role={switching.error ? "alert" : "status"}
          className="mt-3 rounded-lg border border-amber/30 bg-amber/10 p-3 text-sm text-ivory">
          <p>{switching.error
            ? \`Não foi possível trocar o campeonato: \${switching.error}\`
            : "Carregando a nova competição. A seleção anterior continua ativa até a confirmação."}</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {switching.error ? (
              <button type="button" className="btn-ghost"
                onClick={() => void switchCompetition(switching.code)}>Tentar novamente</button>
            ) : null}
            <button type="button" className="btn-ghost" onClick={cancelSwitch}>Cancelar</button>
          </div>
        </div>
      ) : null}
      <p className="mt-3 text-xs text-muted">
        Trocar o campeonato`, 'erro local sem travar telas');

  // 2. Remover dependência adicional do /api/catalog/event introduzida no patch anterior.
  comp.replace('  isCompetitionEvent,\n  type OfficialCompetitionEvent,\n',
    '  assertCatalogEventIsolation,\n', 'usar isolamento entre catálogos');
  comp.replace(`        event: (eventId) =>
          clientApi<OfficialCompetitionEvent>(
            \`/api/catalog/event?eventId=\${encodeURIComponent(String(eventId))}\`,
          ),
`, '', 'remover proxy extra da troca automática');
  comp.replace(`      const event = await clientApi<OfficialCompetitionEvent>(
        \`/api/catalog/event?eventId=\${encodeURIComponent(String(category.eventId))}\`,
      );
      if (sequence !== searchSequence.current) return;
      if (event.eventId !== category.eventId || !isCompetitionEvent(competitionCode, event.title)) {
        setFormError("O evento retornado não pertence ao campeonato selecionado. Confira as rotas do catálogo e do scraper.");
        return;
      }
`, `      if (competitionCode === "PAULISTA_FEMININO") {
        await assertCatalogEventIsolation(
          competitionCode,
          String(division.id),
          category.eventId,
          {
            divisions: (code) => clientApi<CatalogItem[]>(divisionsCatalogUrl(code)),
            categories: (code, id) => clientApi<CatalogCategory[]>(categoriesCatalogUrl(code, id)),
          },
        );
      }
      if (sequence !== searchSequence.current) return;
`, 'verificar ID do evento sem proxy adicional');

  // 3. Guarda: impedir que os dois catálogos compartilhem o mesmo eventId.
  must(guard.text.includes('firstVerifiedCompetition') && guard.text.includes('isCompetitionEvent'),
    'competition-event-guard.ts: o código não é o original do patch v1; nada será alterado.');
  const oldGuard = guard.text;
  // Substituir desde os imports pertencentes à implementação da v1, preservando
  // quaisquer comentários anteriores. Este arquivo foi criado integralmente pela v1.
  const importAnchor = 'import type { CatalogCategory, CatalogItem } from "@/lib/types";';
  const startGuard = guard.text.indexOf(importAnchor);
  must(startGuard >= 0, 'competition-event-guard.ts: imports inesperados.');
  const newGuard = `import type { CatalogCategory, CatalogItem } from "@/lib/types";
import type { BrowsedCompetition } from "@/components/competition-search";
import type { SportsCompetitionCode } from "@/lib/sports-preference";

type Requests = {
  divisions: (code: SportsCompetitionCode) => Promise<CatalogItem[]>;
  categories: (code: SportsCompetitionCode, divisionId: string) => Promise<CatalogCategory[]>;
};

/** Impede que um ID do catálogo masculino seja tratado como feminino. */
export async function assertCatalogEventIsolation(
  code: SportsCompetitionCode,
  divisionId: string,
  candidateEventId: number,
  requests: Requests,
): Promise<void> {
  if (!Number.isSafeInteger(candidateEventId) || candidateEventId <= 0) {
    throw new Error("O catálogo retornou um eventId inválido.");
  }
  if (code !== "PAULISTA_FEMININO") return;
  const maleDivisions = await requests.divisions("PAULISTA");
  if (!maleDivisions.some((item) => String(item.id) === divisionId)) return;
  const maleCategories = await requests.categories("PAULISTA", divisionId);
  if (maleCategories.some((item) => item.eventId === candidateEventId)) {
    throw new Error("O catálogo feminino retornou um evento masculino. Verifique o encaminhamento de title no frontend/backend/scraper.");
  }
}

/** Seleção inicial a partir do catálogo específico do campeonato. */
export async function firstVerifiedCompetition(
  code: SportsCompetitionCode,
  requests: Requests,
): Promise<BrowsedCompetition> {
  const divisions = await requests.divisions(code);
  if (!divisions.length) {
    throw new Error("O catálogo não retornou divisões para este campeonato.");
  }
  for (const division of divisions) {
    const categories = await requests.categories(code, String(division.id));
    const candidates = [...categories].sort((a, b) =>
      Number(b.name.toLowerCase().includes("principal")) -
      Number(a.name.toLowerCase().includes("principal")),
    );
    for (const category of candidates) {
      if (!Number.isSafeInteger(category.eventId) || category.eventId <= 0) continue;
      await assertCatalogEventIsolation(code, String(division.id), category.eventId, requests);
      return {
        competitionCode: code,
        eventId: category.eventId,
        divisionId: String(division.id),
        divisionName: division.name,
        categoryId: String(category.id),
        categoryName: category.name,
      };
    }
  }
  throw new Error("O catálogo não retornou uma categoria válida para este campeonato.");
}
`;
  guard.replace(oldGuard, guard.text.slice(0, startGuard) + newGuard, 'substituir validação por isolamento de catálogos');

  // 4. Perfil: invalidar listas de seleção antigas de modo síncrono à troca de campeonato.
  profile.replace('import { useProfile } from "@/components/profile-context";',
    'import { useProfile } from "@/components/profile-context";\nimport { assertCatalogEventIsolation } from "@/lib/competition-event-guard";',
    'importar verificação de isolamento no perfil');
  profile.replace('  const [categories, setCategories] = useState<CatalogCategory[]>([]);',
`  const [categories, setCategories] = useState<CatalogCategory[]>([]);
  const [divisionScope, setDivisionScope] = useState<CompetitionSelection | null>(null);
  const [categoryScope, setCategoryScope] = useState<{
    competition: CompetitionSelection;
    divisionId: string;
  } | null>(null);`, 'escopo dos catálogos do perfil');
  profile.replace('  const selectedTeamId = teamId ?? (competitionCode === null ? profile?.teamId : "") ?? "";',
`  const selectedTeamId = teamId ?? (competitionCode === null ? profile?.teamId : "") ?? "";
  const visibleDivisions = divisionScope === selectedCompetitionCode ? divisions : [];
  const visibleCategories = categoryScope?.competition === selectedCompetitionCode &&
    categoryScope.divisionId === selectedDivisionId ? categories : [];`, 'somente listas do campeonato selecionado');
  profile.replace('  const selectedCategory = categories.find(\n',
    '  const selectedCategory = visibleCategories.find(\n', 'usar categoria confirmada');
  profile.replace(`    clientApi<CatalogItem[]>(divisionsCatalogUrl(selectedCompetitionCode))
      .then((result) => { if (active) setDivisions(result); })
      .catch(() => { if (active) setDivisions([]); });`,
`    clientApi<CatalogItem[]>(divisionsCatalogUrl(selectedCompetitionCode))
      .then((result) => {
        if (active) { setDivisions(result); setDivisionScope(selectedCompetitionCode); }
      })
      .catch(() => {
        if (active) { setDivisions([]); setDivisionScope(null); }
      });`, 'identificar resultado de divisões');
  profile.replace('        if (active) {\n          setCategories(result);\n        }\n',
`        if (active) {
          setCategories(result);
          setCategoryScope({ competition: selectedCompetitionCode, divisionId: selectedDivisionId });
        }
`, 'identificar resultado de categorias');
  profile.replace('        if (active) {\n          setCategories([]);\n        }\n',
`        if (active) {
          setCategories([]);
          setCategoryScope(null);
        }
`, 'invalidar categorias em erro');
  profile.replace(`      sports = unchanged && profile
        ? savedSportsPreference(profile)
        : buildSportsPreference(
            selectedCompetitionCode, selectedEventId, selectedDivisionId,
            selectedCategoryId, selectedTeamId,
          );
`,
`      sports = unchanged && profile
        ? savedSportsPreference(profile)
        : buildSportsPreference(
            selectedCompetitionCode, selectedEventId, selectedDivisionId,
            selectedCategoryId, selectedTeamId,
          );
      if (!unchanged && selectedCompetitionCode === "PAULISTA_FEMININO" && sports.eventId == null) {
        throw new Error("Para acompanhar o Paulista Feminino, selecione divisão e categoria antes de salvar.");
      }
`, 'não salvar feminino sem evento');
  profile.replace('    setSaving(true);\n    try {\n      const updatedProfile = await clientApi<UserProfile>("/api/me", {',
`    setSaving(true);
    try {
      if (selectedCompetitionCode === "PAULISTA_FEMININO" && sports.eventId != null && sports.divisionId != null) {
        await assertCatalogEventIsolation("PAULISTA_FEMININO", sports.divisionId, sports.eventId, {
          divisions: (code) => clientApi<CatalogItem[]>(divisionsCatalogUrl(code)),
          categories: (code, id) => clientApi<CatalogCategory[]>(categoriesCatalogUrl(code, id)),
        });
      }
      const updatedProfile = await clientApi<UserProfile>("/api/me", {`,
    'rejeitar evento masculino antes de salvar o perfil feminino');
  profile.replace('                  {divisions.map((item) => (',
    '                  {visibleDivisions.map((item) => (', 'divisões exclusivas');
  profile.replace('                  {selectedDivisionId && !divisions.some((item) => String(item.id) === selectedDivisionId) ? (',
    '                  {selectedDivisionId && !visibleDivisions.some((item) => String(item.id) === selectedDivisionId) ? (', 'fallback de divisão');
  profile.replace('                  {categories.map((item) => (',
    '                  {visibleCategories.map((item) => (', 'categorias exclusivas');
  profile.replace('                  {selectedCategoryId && !categories.some((item) => String(item.id) === selectedCategoryId) ? (',
    '                  {selectedCategoryId && !visibleCategories.some((item) => String(item.id) === selectedCategoryId) ? (', 'fallback de categoria');

  // 5. Encaminhar title nos dois proxies do catálogo. Alguns ambientes
  // tiveram as fases 3/4 aplicadas sem a etapa Fase 1 v3. Fazemos a correção
  // aqui de forma pré-validada e no MESMO backup/transação dos cinco arquivos.
  // Se o conteúdo diferir do contrato esperado, não gravamos nenhum arquivo.
  if (!divs.text.includes('const title =')) {
    divs.replace(
      '    String(new Date().getFullYear());\n\n  if (demoEnabled()) {',
      '    String(new Date().getFullYear());\n  const title = request.nextUrl.searchParams.get("title")?.trim();\n\n  if (demoEnabled()) {',
      'encaminhar title em divisões');
    divs.replace(
      '  return proxyPublic(\n    `/api/v1/public/catalog/divisions?season=${encodeURIComponent(\n      season,\n    )}`,\n  );',
      '  const query = new URLSearchParams({ season });\n  if (title) query.set("title", title);\n\n  return proxyPublic(\n    `/api/v1/public/catalog/divisions?${query.toString()}`,\n  );',
      'manter title no proxy de divisões');
  }
  if (!cats.text.includes('const title =')) {
    cats.replace(
      '    String(new Date().getFullYear());\n\n  const divisionId =',
      '    String(new Date().getFullYear());\n  const title = params.get("title")?.trim();\n\n  const divisionId =',
      'encaminhar title em categorias');
    cats.replace(
      '    season,\n    divisionId,\n  });',
      '    season,\n    divisionId,\n  });\n  if (title) query.set("title", title);',
      'manter title no proxy de categorias');
  }
  for (const route of [divs, cats]) {
    must(route.text.includes('const title =') &&
      route.text.includes('if (title) query.set("title", title);'),
      `${route.rel}: encaminhamento title ausente ou diferente. ABORTADO antes de alterar arquivos.`);
    route.replace('  if (demoEnabled()) {',
      '  if (demoEnabled() && !title) {', 'não reutilizar fixture masculina');
  }

  // Checks de integridade antes de escrita.
  must(!comp.text.includes('/api/catalog/event?'), 'Referência à rota /api/catalog/event ainda presente.');
  must(!comp.text.includes('className={switching ? "hidden"'), 'Bloqueio global ainda presente.');
  for (const e of [comp, profile, guard, divs, cats]) {
    must(e.finalize() !== e.original, `Nenhuma mudança em ${e.rel}`);
    info(`${e.rel}: ${e.changes.length} modificações pré-validadas`);
  }
  if (mode === 'check') {
    info('\nCHECK OK: nenhum arquivo foi alterado. Para aplicar: node dna_futsal_reparo_feminino_NODE_v2.mjs --apply');
    process.exit(0);
  }

  const stamp = new Date().toISOString().replace(/[-:]/g, '').replace(/\..*/, 'Z');
  const backupBase = path.join(root, existsSync(path.join(root, '.git')) && statSync(path.join(root, '.git')).isDirectory() ? '.git/dna-feminino-backup' : '.dna-feminino-backup', stamp);
  const editors = [comp, profile, guard, divs, cats];
  for (const e of editors) {
    const dest = path.join(backupBase, e.rel);
    mkdirSync(path.dirname(dest), { recursive: true });
    copyFileSync(e.absolute, dest);
  }
  const completed = [];
  try {
    for (const e of editors) {
      const temp = `${e.absolute}.dna-feminino.tmp`;
      try {
        writeFileSync(temp, e.finalize(), { encoding: 'utf8', flag: 'wx' });
        renameSync(temp, e.absolute);
        completed.push(e);
      } catch (error) {
        if (existsSync(temp)) rmSync(temp);
        throw error;
      }
    }
  } catch (error) {
    for (const e of completed) copyFileSync(path.join(backupBase, e.rel), e.absolute);
    throw error;
  }
  info(`\nREPARO APLICADO. Backups: ${backupBase}`);
  info('Agora rode: node --test dna_futsal_regressao_feminino_local.mjs && npm run typecheck && npm run build');
} catch (err) {
  console.error(`ABORTADO SEM NOVAS ALTERAÇÕES: ${err instanceof Error ? err.message : String(err)}`);
  process.exitCode = 1;
}
