import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const logosRoot = path.join(root, "public", "logos_times");
const output = path.join(root, "public", "team-logo-manifest.json");
const imagePattern = /\.(png|jpe?g|webp|gif|avif)$/i;
const collagePattern = /^escudos?[_\s-]*dos[_\s-]*times/i;

function normalizeKey(value) {
  return String(value ?? "")
    .replaceAll("ª", "a")
    .replaceAll("º", "o")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "");
}

function publicUrl(file) {
  const relative = path.relative(path.join(root, "public"), file);
  return `/${relative
    .split(path.sep)
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}

async function* walk(directory) {
  const entries = await fs.readdir(directory, { withFileTypes: true });

  for (const entry of entries.sort((a, b) => a.name.localeCompare(b.name))) {
    const fullPath = path.join(directory, entry.name);

    if (entry.isDirectory()) {
      yield* walk(fullPath);
      continue;
    }

    if (entry.isFile() && imagePattern.test(entry.name)) {
      yield fullPath;
    }
  }
}

async function main() {
  const logos = [];

  try {
    await fs.access(logosRoot);
  } catch {
    await fs.writeFile(
      output,
      `${JSON.stringify({ version: 1, logos: [] }, null, 2)}\n`,
    );
    console.warn(
      "[team-logos] public/logos_times não existe; manifesto vazio gerado.",
    );
    return;
  }

  for await (const file of walk(logosRoot)) {
    const stem = path.basename(file, path.extname(file));

    if (collagePattern.test(stem)) continue;

    const key = normalizeKey(stem);
    if (!key) continue;

    logos.push({
      key,
      path: publicUrl(file),
    });
  }

  logos.sort(
    (left, right) =>
      left.key.localeCompare(right.key) ||
      left.path.localeCompare(right.path),
  );

  await fs.writeFile(
    output,
    `${JSON.stringify({ version: 1, logos }, null, 2)}\n`,
  );

  console.log(
    `[team-logos] ${logos.length} escudos indexados em public/team-logo-manifest.json`,
  );
}

main().catch((error) => {
  console.error("[team-logos] Falha ao gerar manifesto:", error);
  process.exitCode = 1;
});
