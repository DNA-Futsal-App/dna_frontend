import { spawn } from "node:child_process";
import { watch } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicRoot = path.join(root, "public");
const logoRoot = path.join(publicRoot, "logos_times");
const nextCli = path.join(root, "node_modules", "next", "dist", "bin", "next");
const watchers = [];
const pending = { display: false, logos: false };
let timer = null;
let running = false;

function runGenerator(file) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [path.join(root, "scripts", file)], {
      cwd: root,
      stdio: "inherit",
    });
    child.on("error", reject);
    child.on("exit", (code) =>
      code === 0 ? resolve() : reject(new Error(`${file} terminou com código ${code}`)),
    );
  });
}

async function regenerate() {
  if (running) return;
  running = true;

  try {
    while (pending.display || pending.logos) {
      const display = pending.display;
      const logos = pending.logos;
      pending.display = false;
      pending.logos = false;

      try {
        if (display) await runGenerator("generate-team-display-manifest.mjs");
        if (logos) await runGenerator("generate-team-logo-manifest.mjs");
      } catch (error) {
        console.error("[team-display] Falha ao atualizar manifestos:", error);
      }
    }
  } finally {
    running = false;
    if (pending.display || pending.logos) schedule(false, false);
  }
}

function schedule(display, logos) {
  pending.display ||= display;
  pending.logos ||= logos;
  if (timer) clearTimeout(timer);
  timer = setTimeout(() => {
    timer = null;
    void regenerate();
  }, 500);
}

watchers.push(watch(publicRoot, (_event, filename) => {
  if (filename && /\.xlsx$/i.test(String(filename)) && !String(filename).startsWith("~$")) {
    schedule(true, false);
  }
}));

watchers.push(watch(logoRoot, { recursive: true }, () => schedule(true, true)));

for (const watcher of watchers) {
  watcher.on("error", (error) => console.error("[team-display] Erro ao observar arquivos:", error));
}

const next = spawn(process.execPath, [nextCli, "dev", ...process.argv.slice(2)], {
  cwd: root,
  stdio: "inherit",
});

next.on("error", (error) => {
  console.error("[team-display] Não foi possível iniciar Next.js:", error);
  for (const watcher of watchers) watcher.close();
  process.exitCode = 1;
});

next.on("exit", (code) => {
  for (const watcher of watchers) watcher.close();
  if (timer) clearTimeout(timer);
  process.exitCode = code ?? 1;
});
