import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import { createRequire } from "node:module";
import { fileURLToPath } from "node:url";
import vm from "node:vm";
import ts from "typescript";
import sharp from "sharp";
import { parseRows } from "./generate-team-display-manifest.mjs";
import { assetStem, findLocalLogos, imageUrl } from "./team-logo-assets.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicRoot = path.join(root, "public");
const manifest = JSON.parse(
  await fs.readFile(path.join(root, "lib", "generated", "team-display-manifest.json"), "utf8"),
);

const nativeRequire = createRequire(import.meta.url);
const modules = new Map();

async function loadTs(relative, dependencies = {}) {
  const file = path.join(root, relative);
  const source = await fs.readFile(file, "utf8");
  const output = ts.transpileModule(source, {
    compilerOptions: {
      target: ts.ScriptTarget.ES2022,
      module: ts.ModuleKind.CommonJS,
      jsx: ts.JsxEmit.ReactJSX,
      esModuleInterop: true,
    },
  }).outputText;

  const loaded = { exports: {} };
  vm.runInNewContext(
    output,
    {
      exports: loaded.exports,
      module: loaded,
      URL,
      require: (name) => dependencies[name] ?? modules.get(name) ?? nativeRequire(name),
    },
    { filename: file },
  );

  return loaded.exports;
}

const display = await loadTs("lib/team-display.ts", {
  "@/lib/generated/team-display-manifest.json": manifest,
});
modules.set("@/lib/team-display", display);

const resolver = await loadTs("lib/team-logo-resolver.ts");
modules.set("@/lib/team-logo-resolver", resolver);

const { TeamMark } = await loadTs("components/team-mark.tsx");
const { createElement } = nativeRequire("react");
const { renderToStaticMarkup } = nativeRequire("react-dom/server");

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

test("empty Excel cells do not consume the next cell or its shared-string type", () => {
  const xml =
    '<worksheet><sheetData><row r="3"><c r="A3" t="s"><v>0</v></c><c r="B3"/><c r="C3" s="6"/><c r="D3" t="s"><v>1</v></c><c r="E3"/></row></sheetData></worksheet>';
  const rows = parseRows(
    new Map([["xl/worksheets/sheet1.xml", Buffer.from(xml)]]),
    "xl/worksheets/sheet1.xml",
    ["SE PALMEIRAS", "Palmeiras_logo.svg.png"],
  );
  assert.equal(rows[0].cells.get(0).value, "SE PALMEIRAS");
  assert.equal(rows[0].cells.get(2).value, "");
  assert.equal(rows[0].cells.get(3).value, "Palmeiras_logo.svg.png");
  assert.equal(rows[0].cells.get(4).value, "");
});

test("asset matching handles accents, separators, numeric prefixes and extension changes without substring guessing", () => {
  const assets = [
    {
      relative: "logos_times/BASE/A2/Nando_Grana.png",
      basename: "Nando_Grana.png",
      stem: "nandograna",
      url: "/base.png",
    },
    {
      relative: "logos_times/INICIAÇÃO/A2/Nando_Grana.png",
      basename: "Nando_Grana.png",
      stem: "nandograna",
      url: "/init.png",
    },
  ];
  assert.equal(assetStem("13 F9 Taboão.jpeg"), "f9taboao");
  assert.equal(assetStem("Camisa_10 B.png"), "camisa10b");
  assert.deepEqual(findLocalLogos("Nando Grana.jpg", assets, "INICIAÇÃO A2"), ["/init.png", "/base.png"]);
  assert.deepEqual(findLocalLogos("Nando", assets), []);
  assert.deepEqual(findLocalLogos("/missing/Nando_Grana.png", assets), []);
});

test("Drive sharing pages become image URLs and unsafe schemes are rejected", () => {
  assert.equal(
    imageUrl("https://drive.google.com/file/d/abc_123/view?usp=drive_link"),
    "https://drive.google.com/thumbnail?id=abc_123&sz=w256",
  );
  assert.equal(imageUrl("javascript:alert(1)"), null);
  assert.equal(imageUrl("https://user:password@example.com/logo.png"), null);
});

test("every current spreadsheet team has a decodable local primary logo and renders it on the first render", async () => {
  const checked = new Set();
  for (const entry of manifest.teams) {
    assert.ok(entry.logoUrl?.startsWith("/"), entry.sourceName);
    assert.equal(new Set(entry.logoUrls).size, entry.logoUrls.length);
    for (const url of entry.logoUrls.filter((value) => value.startsWith("/"))) {
      if (checked.has(url)) continue;
      const file = path.join(root, "public", decodeURIComponent(url.slice(1)));
      const metadata = await sharp(await fs.readFile(file)).metadata();
      assert.ok(metadata.width > 0 && metadata.height > 0, url);
      checked.add(url);
    }
    const raw = { id: "123", name: entry.sourceName, logoUrl: "/upstream.png" };
    const transformed = display.applyTeamDisplayOverrides(raw);
    assert.equal(transformed.preferredLogoUrl, entry.logoUrl);
    assert.equal(transformed.sourceName, entry.sourceName);
    assert.equal(display.applyTeamDisplayOverrides(transformed).sourceName, entry.sourceName);
    const markup = renderToStaticMarkup(createElement(TeamMark, { team: raw }));
    assert.ok(markup.includes('src="' + entry.logoUrl + '"'), entry.sourceName + ": " + markup);
  }
});

test("flat award DTOs retain source identity after renaming and repeated transforms", () => {
  const entry = manifest.teams.find((team) => team.sourceName === "SE PALMEIRAS");
  const dto = display.applyTeamDisplayOverrides({ teamName: entry.sourceName });
  assert.equal(dto.teamSourceName, entry.sourceName);
  assert.equal(dto.teamName, entry.displayName);
  assert.equal(dto.teamLogoUrl, entry.logoUrl);
  assert.deepEqual(display.applyTeamDisplayOverrides(dto), dto);
  assert.equal(resolver.resolveTeamLogoSources(entry.displayName)[0], entry.logoUrl);
  assert.equal(resolver.resolveTeamLogoSources("Time inexistente").length, 0);
});

test("ambiguous short names cannot substitute another club, while original names remain resolvable", async () => {
  const fixture = {
    version: 1,
    sourceFiles: [],
    teams: [
      { key: "clubenorte", sourceName: "Clube Norte", displayName: "Uniao", logoUrl: "/norte.png" },
      { key: "clubesul", sourceName: "Clube Sul", displayName: "Uniao", logoUrl: "/sul.png" },
    ],
  };
  const lookup = await loadTs("lib/team-display.ts", {
    "@/lib/generated/team-display-manifest.json": fixture,
  });
  assert.equal(lookup.getTeamDisplayEntry("Uniao"), null);
  assert.equal(lookup.getTeamDisplayEntry("Clube Norte").logoUrl, "/norte.png");
  assert.equal(lookup.getTeamDisplayEntry("Clube Sul").logoUrl, "/sul.png");
});
