import fs from "node:fs/promises";
import path from "node:path";
import zlib from "node:zlib";
import crypto from "node:crypto";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const publicRoot = path.join(root, "public");
const output = path.join(publicRoot, "team-display-manifest.json");
const runtimeOutput = path.join(
  root,
  "lib",
  "generated",
  "team-display-manifest.json",
);
const generatedAssetsRoot = path.join(publicRoot, "team-display-assets");

function normalize(value) {
  return String(value ?? "")
    .replaceAll("ª", "a")
    .replaceAll("º", "o")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "")
    .trim();
}

function decodeXml(value) {
  return String(value ?? "")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_, code) =>
      String.fromCodePoint(Number.parseInt(code, 16)),
    )
    .replace(/&amp;/g, "&");
}

function readZipEntries(buffer) {
  const eocdSignature = 0x06054b50;
  let eocd = -1;

  for (let offset = buffer.length - 22; offset >= Math.max(0, buffer.length - 65_557); offset--) {
    if (buffer.readUInt32LE(offset) === eocdSignature) {
      eocd = offset;
      break;
    }
  }

  if (eocd < 0) {
    throw new Error("Arquivo XLSX inválido: diretório ZIP não encontrado.");
  }

  const entryCount = buffer.readUInt16LE(eocd + 10);
  const centralOffset = buffer.readUInt32LE(eocd + 16);
  const entries = new Map();
  let cursor = centralOffset;

  for (let index = 0; index < entryCount; index++) {
    if (buffer.readUInt32LE(cursor) !== 0x02014b50) {
      throw new Error("Arquivo XLSX inválido: entrada ZIP inconsistente.");
    }

    const method = buffer.readUInt16LE(cursor + 10);
    const compressedSize = buffer.readUInt32LE(cursor + 20);
    const fileNameLength = buffer.readUInt16LE(cursor + 28);
    const extraLength = buffer.readUInt16LE(cursor + 30);
    const commentLength = buffer.readUInt16LE(cursor + 32);
    const localHeaderOffset = buffer.readUInt32LE(cursor + 42);
    const name = buffer
      .subarray(cursor + 46, cursor + 46 + fileNameLength)
      .toString("utf8");

    if (buffer.readUInt32LE(localHeaderOffset) !== 0x04034b50) {
      throw new Error(`Arquivo XLSX inválido: cabeçalho local ausente para ${name}.`);
    }

    const localNameLength = buffer.readUInt16LE(localHeaderOffset + 26);
    const localExtraLength = buffer.readUInt16LE(localHeaderOffset + 28);
    const dataStart = localHeaderOffset + 30 + localNameLength + localExtraLength;
    const compressed = buffer.subarray(dataStart, dataStart + compressedSize);

    let bytes;

    if (method === 0) {
      bytes = compressed;
    } else if (method === 8) {
      bytes = zlib.inflateRawSync(compressed);
    } else {
      throw new Error(`Método ZIP ${method} não suportado no XLSX (${name}).`);
    }

    entries.set(name, bytes);
    cursor += 46 + fileNameLength + extraLength + commentLength;
  }

  return entries;
}

function textNodes(xml) {
  const values = [];
  const pattern = /<t\b[^>]*>([\s\S]*?)<\/t>/g;
  let match;

  while ((match = pattern.exec(xml))) {
    values.push(decodeXml(match[1]));
  }

  return values.join("");
}

function sharedStrings(entries) {
  const bytes = entries.get("xl/sharedStrings.xml");
  if (!bytes) return [];

  const xml = bytes.toString("utf8");
  const result = [];
  const pattern = /<si\b[^>]*>([\s\S]*?)<\/si>/g;
  let match;

  while ((match = pattern.exec(xml))) {
    result.push(textNodes(match[1]));
  }

  return result;
}

function relationshipPath(sheetPath) {
  const directory = path.posix.dirname(sheetPath);
  return path.posix.join(directory, "_rels", `${path.posix.basename(sheetPath)}.rels`);
}

function relationshipTargets(entries, sourcePath) {
  const relBytes = entries.get(relationshipPath(sourcePath));
  if (!relBytes) return new Map();

  const relXml = relBytes.toString("utf8");
  const result = new Map();
  const pattern = /<Relationship\b([^>]*?)\/?>(?:<\/Relationship>)?/g;
  let match;

  while ((match = pattern.exec(relXml))) {
    const attrs = match[1];
    const id = /\bId="([^"]+)"/.exec(attrs)?.[1];
    const target = /\bTarget="([^"]+)"/.exec(attrs)?.[1];
    const mode = /\bTargetMode="([^"]+)"/.exec(attrs)?.[1];
    const type = /\bType="([^"]+)"/.exec(attrs)?.[1] ?? "";

    if (!id || !target) continue;

    result.set(id, {
      path:
        mode === "External"
          ? decodeXml(target)
          : path.posix.normalize(
              path.posix.join(
                path.posix.dirname(sourcePath),
                decodeXml(target),
              ),
            ),
      external: mode === "External",
      type,
    });
  }

  return result;
}

function workbookSheets(entries) {
  const workbookPath = "xl/workbook.xml";
  const workbookXml = entries.get(workbookPath)?.toString("utf8");

  if (!workbookXml) {
    throw new Error("Arquivo XLSX inválido: xl/workbook.xml não encontrado.");
  }

  const relationships = relationshipTargets(entries, workbookPath);
  const sheets = [];
  const sheetPattern = /<sheet\b([^>]*?)\/?>(?:<\/sheet>)?/g;
  let sheetMatch;

  while ((sheetMatch = sheetPattern.exec(workbookXml))) {
    const attrs = sheetMatch[1];
    const name = decodeXml(/\bname="([^"]+)"/.exec(attrs)?.[1] ?? "");
    const relationshipId = /\br:id="([^"]+)"/.exec(attrs)?.[1];
    const state = /\bstate="([^"]+)"/.exec(attrs)?.[1] ?? "visible";
    const relationship = relationshipId
      ? relationships.get(relationshipId)
      : null;

    if (!name || !relationship || relationship.external || !relationship.path) {
      throw new Error(
        `Arquivo XLSX inválido: não foi possível localizar a aba "${name || relationshipId || "sem nome"}".`,
      );
    }

    if (!/\/worksheet$/i.test(relationship.type)) {
      continue;
    }

    sheets.push({ name, path: relationship.path, state });
  }

  if (!sheets.length) {
    throw new Error("Arquivo XLSX inválido: nenhuma aba de planilha foi encontrada.");
  }

  return sheets;
}

function sheetEmbeddedImages(entries, sheetPath) {
  const sheetXml = entries.get(sheetPath)?.toString("utf8") ?? "";
  const sheetRelationships = relationshipTargets(entries, sheetPath);
  const drawingIds = [];
  const drawingPattern = /<(?:\w+:)?drawing\b[^>]*\br:id="([^"]+)"[^>]*\/?>/g;
  let drawingMatch;

  while ((drawingMatch = drawingPattern.exec(sheetXml))) {
    drawingIds.push(drawingMatch[1]);
  }

  const result = new Map();

  for (const drawingId of drawingIds) {
    const drawingRelationship = sheetRelationships.get(drawingId);

    if (
      !drawingRelationship ||
      drawingRelationship.external ||
      !drawingRelationship.path
    ) {
      continue;
    }

    const drawingPath = drawingRelationship.path;
    const drawingXml = entries.get(drawingPath)?.toString("utf8") ?? "";
    const drawingRelationships = relationshipTargets(entries, drawingPath);
    const anchorPattern =
      /<(?:\w+:)?(twoCellAnchor|oneCellAnchor)\b[^>]*>([\s\S]*?)<\/(?:\w+:)?\1>/g;
    let anchorMatch;

    while ((anchorMatch = anchorPattern.exec(drawingXml))) {
      const body = anchorMatch[2];
      const fromBody =
        /<(?:\w+:)?from\b[^>]*>([\s\S]*?)<\/(?:\w+:)?from>/.exec(body)?.[1] ??
        "";
      const column = Number.parseInt(
        /<(?:\w+:)?col\b[^>]*>(\d+)<\/(?:\w+:)?col>/.exec(fromBody)?.[1] ??
          "-1",
        10,
      );
      const row = Number.parseInt(
        /<(?:\w+:)?row\b[^>]*>(\d+)<\/(?:\w+:)?row>/.exec(fromBody)?.[1] ??
          "-1",
        10,
      );
      const imageRelationshipMatch =
        /<(?:\w+:)?blip\b[^>]*\b(?:\w+:)?(embed|link)="([^"]+)"/.exec(
          body,
        );

      const imageRelationshipId =
        imageRelationshipMatch?.[2];

      if (
        column < 0 ||
        row < 0 ||
        !imageRelationshipId
      ) {
        continue;
      }

      const imageRelationship =
        drawingRelationships.get(
          imageRelationshipId,
        );

      if (
        !imageRelationship ||
        !imageRelationship.path
      ) {
        continue;
      }

      if (
        imageRelationship.external
      ) {
        result.set(
          `${row}:${column}`,
          {
            externalUrl:
              imageRelationship.path,
          },
        );
        continue;
      }

      const bytes = entries.get(imageRelationship.path);
      const extension = path.posix.extname(imageRelationship.path).toLowerCase();

      if (!bytes || !/\.(png|jpe?g|webp|gif|avif|svg)$/i.test(extension)) {
        if (bytes) {
          console.warn(
            `[team-display] Imagem embutida não suportada: ${imageRelationship.path}.`,
          );
        }
        continue;
      }

      result.set(`${row}:${column}`, {
        bytes,
        extension: extension === ".jpeg" ? ".jpg" : extension,
        sourcePath: imageRelationship.path,
      });
    }
  }

  return result;
}

async function persistEmbeddedLogo(image, teamKey) {
  if (!image?.bytes?.length || !teamKey) return null;

  const digest = crypto
    .createHash("sha256")
    .update(image.bytes)
    .digest("hex")
    .slice(0, 12);
  const safeKey = teamKey.replace(/[^\p{L}\p{N}-]+/gu, "") || "team";
  const fileName = `${safeKey}-${digest}${image.extension}`;
  const file = path.join(generatedAssetsRoot, fileName);

  await fs.mkdir(generatedAssetsRoot, { recursive: true });
  await fs.writeFile(file, image.bytes);

  return publicUrl(file);
}

function sheetHyperlinks(entries, sheetPath, xml) {
  const relationships = relationshipTargets(entries, sheetPath);
  const result = new Map();
  const linkPattern = /<hyperlink\b([^>]*?)\/?>(?:<\/hyperlink>)?/g;
  let linkMatch;

  while ((linkMatch = linkPattern.exec(xml))) {
    const attrs = linkMatch[1];
    const ref = /\bref="([^"]+)"/.exec(attrs)?.[1];
    const relId = /\br:id="([^"]+)"/.exec(attrs)?.[1];
    const relationship = relId ? relationships.get(relId) : null;

    if (ref && relationship?.external && relationship.path) {
      result.set(ref, relationship.path);
    }
  }

  return result;
}

function columnIndex(reference) {
  const letters = /^([A-Z]+)/i.exec(reference)?.[1]?.toUpperCase();
  if (!letters) return -1;

  let result = 0;
  for (const letter of letters) {
    result = result * 26 + (letter.charCodeAt(0) - 64);
  }
  return result - 1;
}

function formulaValue(body) {
  const raw = /<f\b[^>]*>([\s\S]*?)<\/f>/.exec(body)?.[1];
  if (!raw) return "";

  const formula = decodeXml(raw);
  const match = /(?:HYPERLINK|IMAGE)\s*\(\s*"([^"]+)"/i.exec(formula);
  return match?.[1] ?? "";
}

function parseCellValue(body, type, strings) {
  if (type === "inlineStr") {
    return textNodes(body);
  }

  const rawValue = /<v\b[^>]*>([\s\S]*?)<\/v>/.exec(body)?.[1];

  if (type === "s" && rawValue != null) {
    const index = Number.parseInt(rawValue, 10);
    return Number.isInteger(index) ? strings[index] ?? "" : "";
  }

  if (rawValue != null) {
    return decodeXml(rawValue);
  }

  return formulaValue(body);
}

function parseRows(entries, sheetPath, strings) {
  const xml = entries.get(sheetPath)?.toString("utf8") ?? "";
  const hyperlinks = sheetHyperlinks(entries, sheetPath, xml);
  const rows = [];
  const rowPattern = /<row\b([^>]*)>([\s\S]*?)<\/row>/g;
  let rowMatch;

  while ((rowMatch = rowPattern.exec(xml))) {
    const rowNumber = Number.parseInt(/\br="(\d+)"/.exec(rowMatch[1])?.[1] ?? "0", 10);
    const cells = new Map();
    // Células vazias podem vir como <c r="C3"/>. Elas não podem consumir
    // a próxima célula (por exemplo D3, que contém o nome do escudo).
    const cellPattern = /<c\b([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g;
    let cellMatch;

    while ((cellMatch = cellPattern.exec(rowMatch[2]))) {
      const attrs = cellMatch[1];
      const reference = /\br="([^"]+)"/.exec(attrs)?.[1];
      if (!reference) continue;

      const type = /\bt="([^"]+)"/.exec(attrs)?.[1] ?? "";
      const body = cellMatch[2] ?? "";
      const value = parseCellValue(body, type, strings);
      const formula =
        formulaValue(
          body,
        );

      cells.set(columnIndex(reference), {
        value:
          String(
            value ?? "",
          ).trim(),
        hyperlink:
          hyperlinks.get(
            reference,
          ) ?? "",
        formula:
          String(
            formula ?? "",
          ).trim(),
      });
    }

    rows.push({ rowNumber, cells });
  }

  return rows;
}

function findHeader(rows) {
  for (const row of rows) {
    const headers = new Map();

    for (const [column, cell] of row.cells) {
      headers.set(normalize(cell.value), column);
    }

    const source = [...headers.entries()].find(([key]) =>
      key.includes("site") && (key.includes("fpfs") || key.includes("fpsf")),
    )?.[1];
    const display = [...headers.entries()].find(([key]) =>
      key.includes("nomecurto") && key.includes("app"),
    )?.[1];
    const logo = [...headers.entries()].find(([key]) =>
      key === "logo" || key.includes("escudo") || key.includes("logoapp"),
    )?.[1];

    if (source != null && display != null && logo != null) {
      return {
        rowNumber: row.rowNumber,
        sourceColumn: source,
        displayColumn: display,
        logoColumn: logo,
      };
    }
  }

  return null;
}

async function walkFiles(directory) {
  const result = [];
  const entries = await fs.readdir(directory, { withFileTypes: true });

  for (const entry of entries) {
    const full = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      result.push(...(await walkFiles(full)));
    } else if (entry.isFile()) {
      result.push(full);
    }
  }

  return result;
}

function publicUrl(file) {
  const relative = path.relative(publicRoot, file);
  return `/${relative
    .split(path.sep)
    .map((segment) => encodeURIComponent(segment))
    .join("/")}`;
}

async function createPublicAssetIndex() {
  const files = await walkFiles(publicRoot);
  const byBaseName = new Map();
  const byRelative = new Map();
  const byStem = new Map();
  const byTeamName = new Map();
  const localFiles = [];

  for (const file of files) {
    const relative = path.relative(publicRoot, file).replaceAll(path.sep, "/");
    byRelative.set(relative.toLowerCase(), file);

    if (!/\.(png|jpe?g|webp|gif|avif|svg)$/i.test(file)) continue;

    const base = path.basename(file).toLowerCase();
    const matches = byBaseName.get(base) ?? [];
    matches.push(file);
    byBaseName.set(base, matches);

    if (relative.startsWith("logos_times/")) {
      localFiles.push(file);
      const fileStem = path.basename(file, path.extname(file));
      const stem = normalize(fileStem.replace(/\s*\(\d+\)$/, ""));
      const normalizedMatches = byStem.get(stem) ?? [];
      normalizedMatches.push(file);
      byStem.set(stem, normalizedMatches);

      // Nas divisões A3 os nomes dos arquivos costumam começar com o
      // número do time no grupo, como "9 C13.png".
      const teamKey = normalize(fileStem.replace(/^\d+\s+/, ""));
      if (teamKey) {
        const teamMatches = byTeamName.get(teamKey) ?? [];
        teamMatches.push(file);
        byTeamName.set(teamKey, teamMatches);
      }
    }
  }

  return { byBaseName, byRelative, byStem, byTeamName, localFiles };
}

function isInSheet(file, sheetName) {
  const sheetMatch = /^(.*)\s+(A\d+)$/i.exec(sheetName);
  if (!sheetMatch) return false;

  const segments = path.relative(publicRoot, file).split(path.sep);
  return (
    segments[0]?.toLowerCase() === "logos_times" &&
    normalize(segments[1]) === normalize(sheetMatch[1]) &&
    segments[2]?.toLowerCase() === sheetMatch[2].toLowerCase()
  );
}

function chooseLogoFile(files, sheetName) {
  if (files.length === 1) return files[0];
  if (!files.length) return null;

  const scoped = files.filter((file) => isInSheet(file, sheetName));

  return scoped.length === 1 ? scoped[0] : null;
}

async function resolveLogo(rawValue, assetIndex, sheetName) {
  const raw = String(rawValue ?? "").trim();
  if (!raw) return null;

  if (/^https?:\/\//i.test(raw)) {
    // O hyperlink do Excel frequentemente abre uma página do Drive; a URL
    // /view não entrega bytes de imagem para uma tag <img>.
    if (/^https?:\/\/drive\.google\.com\/file\/d\/[^/]+\/view/i.test(raw)) {
      return null;
    }
    return raw;
  }

  const normalizedRelative = raw
    .replace(/^\//, "")
    .replace(/^public[\\/]/i, "")
    .replaceAll("\\", "/")
    .replace(/^\.\//, "");

  const direct = assetIndex.byRelative.get(normalizedRelative.toLowerCase());
  if (direct) {
    return publicUrl(direct);
  }

  const byName = assetIndex.byBaseName.get(path.posix.basename(normalizedRelative).toLowerCase()) ?? [];
  const exact = chooseLogoFile(byName, sheetName);
  if (exact) {
    return publicUrl(exact);
  }

  const stem = normalize(
    path.posix.basename(normalizedRelative, path.posix.extname(normalizedRelative))
      .replace(/\s*\(\d+\)$/, ""),
  );
  const byStem = assetIndex.byStem.get(stem) ?? [];
  const normalized = chooseLogoFile(byStem, sheetName);
  if (normalized) {
    return publicUrl(normalized);
  }

  if (byName.length > 1 || byStem.length > 1) {
    console.warn(
      `[team-display] Logo ambíguo "${raw}" na aba "${sheetName}"; informe o caminho relativo ao public.`,
    );
  } else {
    console.warn(`[team-display] Logo não encontrado em public: "${raw}" (aba "${sheetName}").`);
  }

  return null;
}

function resolveLogoByTeamName(sourceName, displayName, assetIndex, sheetName) {
  const names = [displayName, sourceName, ...sourceName.split("|")];

  for (const name of names) {
    const key = normalize(name);
    if (!key) continue;

    const file = chooseLogoFile(assetIndex.byTeamName.get(key) ?? [], sheetName);
    if (file) return publicUrl(file);
  }

  const generic = new Set([
    "a", "e", "b", "c", "ac", "ad", "ae", "adc", "fc", "sc", "se",
    "da", "de", "do", "das", "dos", "clube", "associacao", "atletica",
    "atletico", "esportiva", "esportivo", "desportiva", "desportivo",
    "futebol", "futsal", "sport", "sports", "liga", "instituto", "grupo",
    "logo", "escola", "sociedade",
  ]);
  const words = (value) => value
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((word) => word.length >= 3 && !generic.has(word));
  const teamWords = new Set(words(`${displayName} ${sourceName}`));
  const candidates = assetIndex.localFiles
    .filter((file) => isInSheet(file, sheetName))
    .map((file) => {
      const stem = path.basename(file, path.extname(file)).replace(/^\d+\s+/, "");
      const common = words(stem).filter((word) => teamWords.has(word));
      return {
        file,
        score: common.reduce((sum, word) => sum + word.length, 0),
      };
    })
    .filter((candidate) => candidate.score >= 3)
    .sort((left, right) => right.score - left.score);

  if (candidates.length && candidates[0].score > (candidates[1]?.score ?? 0)) {
    return publicUrl(candidates[0].file);
  }

  // Último recurso para um único erro de digitação em um nome longo,
  // sempre limitado à mesma aba para não associar clubes diferentes.
  const oneCharacterApart = (left, right) => {
    if (left.length !== right.length || left.length < 7) return false;
    let differences = 0;
    for (let index = 0; index < left.length; index++) {
      if (left[index] !== right[index] && ++differences > 1) return false;
    }
    return differences === 1;
  };
  const close = assetIndex.localFiles.filter((file) => {
    if (!isInSheet(file, sheetName)) return false;
    const stem = path.basename(file, path.extname(file)).replace(/^\d+\s+/, "");
    return words(stem).some((fileWord) =>
      [...teamWords].some((teamWord) => oneCharacterApart(fileWord, teamWord)),
    );
  });
  if (close.length === 1) return publicUrl(close[0]);

  return null;
}

async function workbookEntries(file, assetIndex) {
  const buffer = await fs.readFile(file);
  const entries = readZipEntries(buffer);
  const strings = sharedStrings(entries);
  const sheets = workbookSheets(entries);
  const result = [];
  const sheetSummary = [];

  for (const sheet of sheets) {
    const rows = parseRows(entries, sheet.path, strings);
    const header = findHeader(rows);
    if (!header) {
      sheetSummary.push({ ...sheet, rows: 0, status: "ignored" });
      console.warn(
        `[team-display] Aba "${sheet.name}" ignorada: ` +
          'as colunas "site fpsf/fpfs", "nome curto app" e "logo" não foram encontradas.',
      );
      continue;
    }

    const embeddedImages = sheetEmbeddedImages(entries, sheet.path);
    const startCount = result.length;

    for (const row of rows) {
      if (row.rowNumber <= header.rowNumber) continue;

      const sourceCell = row.cells.get(header.sourceColumn);
      const displayCell = row.cells.get(header.displayColumn);
      const logoCell = row.cells.get(header.logoColumn);
      const sourceName = sourceCell?.value?.trim() ?? "";
      const displayName = displayCell?.value?.trim() ?? "";

      const logoRaw =
        logoCell?.value ||
        logoCell?.formula ||
        logoCell?.hyperlink ||
        "";

      if (!sourceName) continue;

      const key = normalize(sourceName);
      const embeddedLogo =
        embeddedImages.get(
          `${row.rowNumber - 1}:${header.logoColumn}`,
        ) ?? null;

      const embeddedLogoUrl =
        embeddedLogo?.externalUrl
          ? embeddedLogo.externalUrl
          : embeddedLogo
            ? await persistEmbeddedLogo(
                embeddedLogo,
                key,
              )
            : null;

      const logoUrl =
        embeddedLogoUrl ??
        (await resolveLogo(
          logoRaw,
          assetIndex,
          sheet.name,
        )) ??
        resolveLogoByTeamName(sourceName, displayName, assetIndex, sheet.name);

      result.push({
        key,
        sourceName,
        displayName: displayName || sourceName,
        logoUrl,
      });
    }

    const rowCount = result.length - startCount;
    sheetSummary.push({ ...sheet, rows: rowCount, status: "indexed" });
    console.log(
      `[team-display] Aba "${sheet.name}"${sheet.state === "hidden" ? " (oculta)" : ""}: ${rowCount} time(s) indexado(s).`,
    );
  }

  return { entries: result, sheets: sheetSummary };
}

function chooseDisplayName(current, entry) {
  const currentCustom =
    current.displayName !== current.sourceName;
  const entryCustom =
    entry.displayName !== entry.sourceName;

  if (!currentCustom) {
    return entry.displayName;
  }

  if (!entryCustom) {
    return current.displayName;
  }

  if (current.displayName === entry.displayName) {
    return current.displayName;
  }

  const sourceKey = normalize(entry.sourceName);
  const currentKey = normalize(current.displayName);
  const entryKey = normalize(entry.displayName);

  /*
   * Se os dois nomes curtos normalizam para o mesmo valor, a diferença é
   * apenas editorial (acentuação, pontuação ou caixa). Mantemos o primeiro
   * valor para o resultado ser determinístico.
   */
  if (currentKey === entryKey) {
    console.warn(
      `[team-display] Variação editorial para "${entry.sourceName}": ` +
        `"${current.displayName}" x "${entry.displayName}". ` +
        `Mantendo "${current.displayName}".`,
    );

    return current.displayName;
  }

  /*
   * Prefere o nome curto que realmente aparece dentro do nome utilizado
   * pela FPFS. Exemplo:
   *
   * PROSPERE / HORTOLANDIA
   *   HORTOLÂNDIA -> hortolandia -> corresponde
   *   HORTOÂNDIA  -> hortoandia  -> não corresponde
   */
  const currentMatchesSource =
    Boolean(currentKey) &&
    sourceKey.includes(currentKey);
  const entryMatchesSource =
    Boolean(entryKey) &&
    sourceKey.includes(entryKey);

  if (currentMatchesSource !== entryMatchesSource) {
    const selected =
      currentMatchesSource
        ? current.displayName
        : entry.displayName;

    console.warn(
      `[team-display] Nomes curtos conflitantes para "${entry.sourceName}": ` +
        `"${current.displayName}" x "${entry.displayName}". ` +
        `Selecionado automaticamente "${selected}" por corresponder ao nome da FPFS.`,
    );

    return selected;
  }

  /*
   * A planilha é uma fonte editorial e um conflito nela não deve impedir
   * `npm run dev` ou o deploy. Quando não existe evidência suficiente para
   * escolher um dos valores, mantemos a primeira ocorrência de forma
   * estável e deixamos um aviso explícito para correção posterior do XLSX.
   */
  console.warn(
    `[team-display] Nomes curtos conflitantes para "${entry.sourceName}": ` +
      `"${current.displayName}" x "${entry.displayName}". ` +
      `Não foi possível decidir automaticamente; mantendo "${current.displayName}".`,
  );

  return current.displayName;
}

function mergeEntries(entries) {
  const merged = new Map();

  for (const entry of entries) {
    if (!entry.key) continue;

    const current = merged.get(entry.key);
    if (!current) {
      merged.set(entry.key, entry);
      continue;
    }

    if (current.logoUrl && entry.logoUrl && current.logoUrl !== entry.logoUrl) {
      console.warn(
        `[team-display] Mais de um logo para "${entry.sourceName}"; mantendo ${current.logoUrl}.`,
      );
    }

    merged.set(entry.key, {
      ...current,
      displayName:
        chooseDisplayName(
          current,
          entry,
        ),
      logoUrl: current.logoUrl ?? entry.logoUrl,
    });
  }

  return [...merged.values()].sort((a, b) => a.key.localeCompare(b.key));
}

async function main() {
  const publicEntries = await fs.readdir(publicRoot, { withFileTypes: true });

  const workbooks = publicEntries
    .filter(
      (entry) =>
        entry.isFile() &&
        /\.xlsx$/i.test(entry.name) &&
        !entry.name.startsWith("~$"),
    )
    .map((entry) => path.join(publicRoot, entry.name))
    .sort((a, b) => a.localeCompare(b));

  if (!workbooks.length) {
    throw new Error(
      "Nenhum arquivo .xlsx válido encontrado em public. " +
        "Arquivos temporários do Excel (~$*.xlsx) são ignorados.",
    );
  }

  await fs.rm(generatedAssetsRoot, {
    recursive: true,
    force: true,
  });

  const assetIndex = await createPublicAssetIndex();
  const collected = [];
  const usedWorkbooks = [];
  const usedSheets = [];
  const ignoredWorkbooks = [];

  for (const workbook of workbooks) {
    const workbookName =
      path.basename(workbook);

    try {
      const bytes =
        await fs.readFile(workbook);

      const looksLikeZip =
        bytes.length >= 4 &&
        bytes[0] === 0x50 &&
        bytes[1] === 0x4b;

      if (!looksLikeZip) {
        ignoredWorkbooks.push(
          `${workbookName}: não possui assinatura ZIP/XLSX`,
        );

        console.warn(
          `[team-display] Ignorando "${workbookName}": ` +
            "o arquivo não possui uma assinatura ZIP/XLSX válida.",
        );

        continue;
      }

      const workbookData =
        await workbookEntries(
          workbook,
          assetIndex,
        );

      if (!workbookData.entries.length) {
        console.warn(
          `[team-display] Ignorando "${workbookName}": ` +
            'as colunas "site fpsf/fpfs", "nome curto app" e "logo" não foram encontradas.',
        );
        continue;
      }

      usedWorkbooks.push(
        workbookName,
      );
      collected.push(
        ...workbookData.entries,
      );
      usedSheets.push(
        ...workbookData.sheets.map((sheet) => ({
          workbook: workbookName,
          name: sheet.name,
          state: sheet.state,
          rows: sheet.rows,
          status: sheet.status,
        })),
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : String(error);

      ignoredWorkbooks.push(
        `${workbookName}: ${message}`,
      );

      console.warn(
        `[team-display] Ignorando XLSX inválido "${workbookName}": ${message}`,
      );
    }
  }

  const teams = mergeEntries(collected);

  if (!teams.length) {
    const ignoredDetails =
      ignoredWorkbooks.length
        ? ` Arquivos ignorados: ${ignoredWorkbooks.join(" | ")}.`
        : "";

    throw new Error(
      'Nenhuma planilha XLSX válida em public contém as colunas ' +
        '"site fpsf/fpfs", "nome curto app" e "logo".' +
        ignoredDetails,
    );
  }

  const manifest = {
    version: 1,
    sourceFiles: usedWorkbooks,
    sourceSheets: usedSheets,
    teams,
  };

  const manifestJson =
    `${JSON.stringify(
      manifest,
      null,
      2,
    )}\n`;

  await fs.writeFile(
    output,
    manifestJson,
  );

  await fs.mkdir(
    path.dirname(
      runtimeOutput,
    ),
    {
      recursive: true,
    },
  );

  await fs.writeFile(
    runtimeOutput,
    manifestJson,
  );

  console.log(
    `[team-display] ${teams.length} times indexados a partir de ${usedWorkbooks.join(", ")}.`,
  );
  const withoutLogo = teams.filter((team) => !team.logoUrl);
  console.log(
    `[team-display] ${teams.length - withoutLogo.length} times com logo da planilha ou dos arquivos locais.`,
  );
  if (withoutLogo.length) {
    console.warn(
      `[team-display] Sem logo local (${withoutLogo.length}): ${withoutLogo.map((team) => team.displayName).join(", ")}.`,
    );
  }
}

main().catch((error) => {
  console.error("[team-display] Falha ao gerar manifesto:", error);
  process.exitCode = 1;
});
