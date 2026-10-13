import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicRoot = path.join(root, "public");
const manifest = JSON.parse(
  await fs.readFile(path.join(root, "lib", "generated", "team-display-manifest.json"), "utf8"),
);

test("todos os escudos indexados apontam para imagens locais legíveis", async () => {
  const logos = manifest.teams.map((team) => team.logoUrl).filter(Boolean);
  assert.ok(logos.length > 0, "a coluna LOGO deve produzir escudos");

  for (const url of new Set(logos)) {
    assert.ok(url.startsWith("/"), `logo não local: ${url}`);
    const segments = new URL(url, "http://localhost").pathname
      .slice(1)
      .split("/")
      .map(decodeURIComponent);
    const file = path.join(publicRoot, ...segments);
    assert.ok(path.relative(publicRoot, file) && !path.relative(publicRoot, file).startsWith(".."));
    const metadata = await sharp(file).metadata();
    assert.ok(metadata.width && metadata.height, `imagem ilegível: ${url}`);
  }
});

test("células vazias, extensões diferentes e nomes de grupos têm escudos", () => {
  const bySource = new Map(manifest.teams.map((team) => [team.sourceName, team]));
  assert.match(bySource.get("SE PALMEIRAS")?.logoUrl ?? "", /Palmeiras_logo\.svg\.png$/);
  assert.match(
    bySource.get("OLE BRASIL SOCIETY QUADRA ESPORTIVA LTDA ME - OLE BRASIL SOCIETY")?.logoUrl ?? "",
    /Pumas\.jpeg$/,
  );
  assert.match(
    bySource.get("ASSOCIAÇÃO ESPORTIVA CULTURAL VMANEGER ITAQUERA C13")?.logoUrl ?? "",
    /9%20C13\.png$/,
  );
  assert.equal(manifest.sourceSheets.length, 6);
});
