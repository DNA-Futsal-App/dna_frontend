/**
 * Corrige a interface de finalistas sem depender da posição das linhas nem
 * sobrescrever mudanças paralelas no frontend.
 * Uso: node scripts/fix-sub7-finalists-ui.mjs
 * Idempotente: execuções repetidas não alteram arquivos já corrigidos.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const changes = [
  {
    path: "components/popular-voting/vote-detail-client.tsx",
    required: true,
    edits: [
      {
        description: "título automático dos finalistas",
        from: /(<h2\b[^>]*>\s*)Os\s+(?:três|3)\s+finalistas(\s*<\/h2>)/u,
        to: "$1Os {board.finalists.length} finalistas$2",
        done: /Os\s+\{board\.finalists\.length\}\s+finalistas/u,
      },
      {
        description: "grade adaptável com quatro colunas",
        from: /className="grid gap-5(?:\s+(?:sm:|md:|lg:|xl:)grid-cols-\d+)+"(?=>\{board\.finalists\.map)/u,
        to: 'className={`grid gap-5 ${board.finalists.length === 4 ? "md:grid-cols-2 xl:grid-cols-4" : "lg:grid-cols-3"}`}',
        done: /board\.finalists\.length\s*===\s*4\s*\?\s*["']md:grid-cols-2 xl:grid-cols-4["']/u,
      },
    ],
  },
  {
    path: "app/premio/votacao/page.tsx",
    edits: [
      { description: "texto do catálogo", from: "uma página exclusiva com os três finalistas.", to: "uma página exclusiva com seus finalistas.", done: "uma página exclusiva com seus finalistas." },
      { description: "chamada do catálogo", from: "Ver horários e os três finalistas de cada modalidade", to: "Ver horários e finalistas de cada modalidade", done: "Ver horários e finalistas de cada modalidade" },
    ],
  },
  {
    path: "app/premio/votacao/[editionId]/[eventId]/[divisionId]/[categoryId]/[gender]/page.tsx",
    edits: [
      { description: "texto da categoria", from: "Cada modalidade possui os seus três finalistas e uma janela de votação própria.", to: "Cada modalidade possui seus finalistas e uma janela de votação própria.", done: "Cada modalidade possui seus finalistas e uma janela de votação própria." },
      { description: "chamada da categoria", from: "Ver os três finalistas e assistir aos vídeos quando a votação abrir.", to: "Ver os finalistas e assistir aos vídeos quando a votação abrir.", done: "Ver os finalistas e assistir aos vídeos quando a votação abrir." },
    ],
  },
  {
    path: "app/(authenticated)/app/admin/premio-dna/pre-votacao/page.tsx",
    edits: [
      { description: "confirmação administrativa", from: "Confirmar os três finalistas?", to: "Confirmar os finalistas desta disputa?", done: "Confirmar os finalistas desta disputa?" },
      { description: "aviso administrativo", from: "Os três finalistas foram confirmados", to: "Os finalistas foram confirmados", done: "Os finalistas foram confirmados" },
      { description: "explicação da pré-votação", from: "As médias determinam os três finalistas", to: "As médias determinam os finalistas", done: "As médias determinam os finalistas" },
      { description: "botão de pré-votação", from: "Confirmar os 3 finalistas", to: "Confirmar os finalistas", done: /<Trophy className="size-4"\s*\/>\s*Confirmar os finalistas\s*</u },
      { description: "orientação de publicação", from: "A publicação exige três inscritos, revisão concluída, painel completo e ausência de empate na 3ª colocação.", to: "A publicação exige vídeos suficientes, revisão concluída e painel completo. Empates no corte só são permitidos na disputa autorizada.", done: "A publicação exige vídeos suficientes, revisão concluída e painel completo. Empates no corte só são permitidos na disputa autorizada." },
    ],
  },
  {
    path: "app/(authenticated)/app/admin/premio-dna/votacao-popular/page.tsx",
    edits: [
      {
        description: "mensagens de bloqueio para a exceção",
        from: /(^\s*MENOS_DE_TRES_VIDEOS_APROVADOS:\s*[^\n]+\n)/m,
        to: '$1  MENOS_DE_QUATRO_VIDEOS_APROVADOS: "Esta disputa excepcional exige pelo menos quatro vídeos aprovados e prontos.",\n  EXCECAO_SEM_EMPATE_NO_CORTE: "A exceção de quatro finalistas exige empate entre o terceiro e o quarto colocados.",\n  EMPATE_COM_MAIS_DE_QUATRO: "Há empate também com o quinto colocado. A exceção comporta apenas quatro finalistas.",\n',
        done: /MENOS_DE_QUATRO_VIDEOS_APROVADOS:/,
      },
    ],
  },
];

let requiredProblems = 0;
const pending = [];
for (const spec of changes) {
  const path = join(root, spec.path);
  let original;
  try { original = readFileSync(path, "utf8"); }
  catch (error) { console.error(`[ERRO] Arquivo ausente: ${spec.path} (${error.code})`); requiredProblems++; continue; }
  let content = original;
  for (const edit of spec.edits) {
    if (typeof edit.done === "string" ? content.includes(edit.done) : edit.done.test(content)) {
      console.log(`[OK] ${spec.path} — ${edit.description}: já corrigido`);
      continue;
    }
    if (typeof edit.from === "string" ? !content.includes(edit.from) : !edit.from.test(content)) {
      // Nunca alterar um trecho não reconhecido — preserva outras mudanças de branch.
      console.error(`[CONFLITO] ${spec.path} — ${edit.description}: formato diferente do esperado`);
      if (spec.required) requiredProblems++;
      continue;
    }
    content = content.replace(edit.from, edit.to);
    console.log(`[ALTERAR] ${spec.path} — ${edit.description}`);
  }
  if (content !== original) pending.push({ path, content });
}
if (requiredProblems) {
  console.error("\nNada foi gravado. Revise os conflitos obrigatórios acima.");
  process.exitCode = 1;
} else {
  for (const { path, content } of pending) writeFileSync(path, content, "utf8");
  console.log(`\nConcluído: ${pending.length} arquivo(s) modificado(s).`);
  console.log("Confira o diff e execute npm run typecheck, npm run lint e npm run build.");
}
