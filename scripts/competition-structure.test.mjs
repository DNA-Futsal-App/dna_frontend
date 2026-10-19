import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import vm from "node:vm";
import ts from "typescript";
import { createRequire } from "node:module";

const require = createRequire(import.meta.url);
const file = new URL("../lib/competition-structure.ts", import.meta.url);
const compiled = ts.transpileModule(fs.readFileSync(file, "utf-8"), {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.CommonJS },
}).outputText;
const compiledModule = { exports: {} };
vm.runInNewContext(compiled, {
  exports: compiledModule.exports,
  module: compiledModule,
  require,
});
const { officialMatchBracket } = compiledModule.exports;

test("keeps dynamic knockout names separate", () => {
  assert.equal(officialMatchBracket("Torneio União - Quartas Ouro"), "Chave ouro");
  assert.equal(officialMatchBracket("Torneio União - Quartas de Final Chave Rubi"), "Chave rubi");
  assert.equal(officialMatchBracket("Torneio União - Quartas Jade"), "Chave jade");
  assert.equal(officialMatchBracket("Torneio União - Semifinal CHAVE A"), "Chave a");
  assert.equal(officialMatchBracket("Torneio União - Grupo 4"), null);
});
