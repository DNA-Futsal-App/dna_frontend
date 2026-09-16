import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const assets = path.join(root, 'public/team-logos');
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const normalize = value => String(value ?? '').replaceAll('ª', 'a').replaceAll('º', 'o')
  .normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
  .replace(/[^\p{L}\p{N}]+/gu, ' ').trim();
const logoPattern = /^\/team-logos\/[a-f0-9]{64}\.webp$/;
const check = (condition, message) => { if (!condition) throw new Error(message); };
const read = async file => JSON.parse(await fs.readFile(file, 'utf8'));
const write = async (file, value, exclusive = false) => {
  await fs.mkdir(path.dirname(file), { recursive: true });
  await fs.writeFile(file, JSON.stringify(value, null, 2) + '\n', exclusive ? { flag: 'wx' } : {});
};
const escape = value => String(value).replace(/[&<>"']/g, ch => ({
  '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
})[ch]);

async function* walk(directory) {
  for (const item of (await fs.readdir(directory, { withFileTypes: true })).sort((a, b) => a.name.localeCompare(b.name))) {
    const name = path.join(directory, item.name);
    if (item.isDirectory()) yield* walk(name);
    else if (item.isFile() && /\.(png|jpe?g|webp)$/i.test(item.name)) yield name;
  }
}

async function prepare(input, report) {
  check(input, 'Informe a pasta com os arquivos extraídos do ZIP.');
  const { default: sharp } = await import('sharp');
  const bySource = new Map();
  let originalBytes = 0;
  let count = 0;
  await fs.mkdir(assets, { recursive: true });
  for await (const name of walk(path.resolve(input))) {
    const bytes = await fs.readFile(name);
    const sourceHash = hash(bytes);
    const relative = path.relative(input, name).split(path.sep).join('/');
    originalBytes += bytes.length;
    count++;
    if (bySource.has(sourceHash)) {
      bySource.get(sourceHash).sources.push(relative);
      continue;
    }
    const output = await sharp(bytes, { limitInputPixels: 25_000_000 }).rotate()
      .resize({ width: 192, height: 192, fit: 'inside', withoutEnlargement: true })
      .webp({ lossless: true, effort: 6 }).toBuffer();
    const logoPath = `/team-logos/${hash(output)}.webp`;
    await fs.writeFile(path.join(root, 'public', logoPath.slice(1)), output);
    bySource.set(sourceHash, { sourceHash, logoPath, bytes: output.length, sources: [relative] });
  }
  check(count > 0, 'Nenhuma imagem encontrada.');
  const inventory = [...bySource.values()];
  await write(path.join(report, 'inventory.json'), inventory);
  const figures = inventory.map(item => {
    const target = path.relative(report, path.join(root, 'public', item.logoPath.slice(1))).split(path.sep).join('/');
    return `<figure><img src="${escape(target)}" width="96" height="96" loading="lazy"><figcaption>${item.sources.map(escape).join('<br>')}</figcaption><input readonly value="${escape(item.logoPath)}" aria-label="Caminho do escudo"></figure>`;
  }).join('\n');
  await fs.writeFile(path.join(report, 'gallery.html'), `<!doctype html><html lang="pt-BR"><meta charset="utf-8"><title>Revisão dos escudos</title><style>body{font:14px system-ui;background:#eee;padding:24px}main{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px}figure{margin:0;background:white;padding:16px;border-radius:12px}img{object-fit:contain;background:#eee}figcaption{margin:12px 0;overflow-wrap:anywhere}input{width:95%}</style><h1>Escudos para revisão</h1><p>Compare visualmente o clube e copie o caminho para review.json. Arquivo semelhante não comprova identidade.</p><main>${figures}</main></html>`);
  const uniqueOutputs = new Map(inventory.map(item => [item.logoPath, item.bytes]));
  console.log(JSON.stringify({ images: count, uniqueSources: inventory.length,
    uniqueOutputs: uniqueOutputs.size, originalBytes, optimizedBytes: [...uniqueOutputs.values()].reduce((a, b) => a + b, 0) }));
}

async function getJson(origin, endpoint) {
  const response = await fetch(origin + endpoint, { signal: AbortSignal.timeout(30_000), redirect: 'error' });
  check(response.ok, `Catálogo: HTTP ${response.status} em ${endpoint}`);
  const value = await response.json();
  check(Array.isArray(value), `Resposta inesperada em ${endpoint}`);
  return value;
}

async function catalog(api, season, report) {
  check(api && Number.isInteger(Number(season)) && Number(season) >= 2016 && Number(season) <= 2100,
    'Uso: catalog http://localhost:8080 2026 [pasta-revisao]');
  const origin = api.replace(/\/+$/, '');
  const divisions = await getJson(origin, `/api/v1/public/catalog/divisions?season=${season}`);
  const events = new Map();
  for (const division of divisions) {
    check(Number.isSafeInteger(division.id) && division.id > 0, 'Divisão inválida');
    const categories = await getJson(origin, `/api/v1/public/catalog/categories?season=${season}&divisionId=${division.id}`);
    for (const category of categories) {
      check(Number.isSafeInteger(category.eventId) && category.eventId > 0, 'Evento inválido');
      if (events.has(category.eventId)) continue;
      const teams = await getJson(origin, `/api/v1/public/catalog/teams?eventId=${category.eventId}`);
      for (const team of teams) {
        check(typeof team.id === 'string' && /^[1-9][0-9]*$/.test(team.id) && normalize(team.name),
          `Equipe inválida no evento ${category.eventId}`);
      }
      events.set(category.eventId, { eventId: category.eventId, season: Number(season),
        division: division.name, category: category.name, teams: teams.map(({ id, name }) => ({ id, name })) });
    }
  }
  check(events.size > 0, 'Nenhum evento retornado.');
  await write(path.join(report, 'catalog.json'), [...events.values()]);
  const emptyEvents = [...events.values()].filter(event => event.teams.length === 0).length;
  console.log(`${events.size} eventos coletados; ${emptyEvents} sem equipes (fora da cobertura). Nenhum atleta coletado.`);
}

function catalogRows(events) {
  return events.flatMap(event => event.teams.map(team => ({
    eventId: event.eventId, teamId: team.id, teamName: team.name,
    division: event.division, category: event.category,
  })));
}
const identity = row => `${row.eventId}|${row.teamId}`;

async function review(report) {
  const events = await read(path.join(report, 'catalog.json'));
  await read(path.join(report, 'inventory.json'));
  const rows = catalogRows(events).map(row => {
    const peers = events.find(event => event.eventId === row.eventId).teams;
    const uniqueName = peers.filter(team => normalize(team.name) === normalize(row.teamName)).length === 1;
    return { ...row, approved: false, skipReason: '', clubKey: '', logoPath: '',
      aliases: uniqueName ? [row.teamName] : [] };
  });
  await write(path.join(report, 'review.json'), rows, true);
  console.log(`${rows.length} vínculos para revisar. Um review.json existente nunca é sobrescrito.`);
}

async function validateManifest(manifest) {
  check(manifest.version === 1 && Array.isArray(manifest.clubs) && Array.isArray(manifest.bindings), 'Manifesto inválido');
  check(manifest.bindings.length > 0, 'Manifesto sem vínculos aprovados');
  const clubs = new Map();
  const ids = new Set();
  const aliases = new Set();
  for (const club of manifest.clubs) {
    check(/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(club.key) && !clubs.has(club.key), 'Chave de clube inválida/duplicada');
    check(logoPattern.test(club.logoPath), `Caminho inválido: ${club.logoPath}`);
    const bytes = await fs.readFile(path.join(root, 'public', club.logoPath.slice(1)));
    check(path.basename(club.logoPath, '.webp') === hash(bytes), `Hash incorreto: ${club.logoPath}`);
    clubs.set(club.key, club.logoPath);
  }
  for (const binding of manifest.bindings) {
    check(Number.isSafeInteger(binding.eventId) && binding.eventId > 0 &&
      typeof binding.teamId === 'string' && /^[1-9][0-9]*$/.test(binding.teamId), 'ID inválido');
    check(!ids.has(identity(binding)), `ID duplicado: ${identity(binding)}`);
    ids.add(identity(binding));
    check(clubs.has(binding.clubKey), `Clube inexistente: ${binding.clubKey}`);
    check(Array.isArray(binding.aliases), 'Aliases devem ser um array');
    const localAliases = new Set(binding.aliases.map(normalize));
    for (const name of localAliases) {
      const key = `${binding.eventId}|${name}`;
      check(name && !aliases.has(key), `Alias vazio/ambíguo: ${key}`);
      aliases.add(key);
    }
  }
}

async function compile(report, destination) {
  check(destination, 'Informe o caminho do team-logos.json no backend.');
  const inventory = await read(path.join(report, 'inventory.json'));
  const rows = await read(path.join(report, 'review.json'));
  const expected = catalogRows(await read(path.join(report, 'catalog.json')));
  const expectedIds = new Map(expected.map(row => [identity(row), row]));
  check(expectedIds.size === expected.length, 'Catálogo contém IDs repetidos');
  const sources = new Set(inventory.map(item => item.logoPath));
  const seen = new Set();
  const clubs = new Map();
  const bindings = [];
  let skipped = 0;
  for (const row of rows) {
    const key = identity(row);
    const current = expectedIds.get(key);
    check(current && !seen.has(key) && current.teamName === row.teamName,
      `Revisão duplicada ou desatualizada: ${key}`);
    seen.add(key);
    if (row.approved !== true) {
      check(typeof row.skipReason === 'string' && row.skipReason.trim(), `Revisão pendente: ${key} ${row.teamName}`);
      skipped++;
      continue;
    }
    check(!row.skipReason?.trim(), `Aprovado também tem skipReason: ${key}`);
    check(typeof row.clubKey === 'string' && /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(row.clubKey), `clubKey inválido: ${key}`);
    check(sources.has(row.logoPath), `Escudo fora do inventário: ${key}`);
    const previous = clubs.get(row.clubKey);
    check(!previous || previous === row.logoPath, `Duas imagens para ${row.clubKey}; escolha uma versão`);
    clubs.set(row.clubKey, row.logoPath);
    check(Array.isArray(row.aliases) && row.aliases.every(alias => typeof alias === 'string' && normalize(alias)), `Aliases inválidos: ${key}`);
    for (const alias of row.aliases) {
      const conflicts = expected.filter(other => other.eventId === row.eventId &&
        other.teamId !== row.teamId && normalize(other.teamName) === normalize(alias));
      check(!conflicts.length, `Alias pertence também a outra equipe: ${key} ${alias}`);
    }
    bindings.push({ eventId: row.eventId, teamId: row.teamId, clubKey: row.clubKey,
      aliases: [...new Map(row.aliases.map(alias => [normalize(alias), alias.trim()])).values()] });
  }
  check(seen.size === expected.length, 'Há equipes do catálogo ausentes na revisão');
  const manifest = { version: 1, clubs: [...clubs].map(([key, logoPath]) => ({ key, logoPath })), bindings };
  await validateManifest(manifest);
  const target = path.resolve(destination);
  await write(target + '.tmp', manifest);
  await fs.rename(target + '.tmp', target);
  console.log(JSON.stringify({ approved: bindings.length, skipped, catalogTeams: expected.length,
    coveragePercent: Number((100 * bindings.length / expected.length).toFixed(1)), clubs: clubs.size }));
}

async function main() {
  const [command, a, b, c] = process.argv.slice(2);
  const report = value => path.resolve(value || '.team-logo-review');
  if (command === 'prepare') await prepare(a, report(b));
  else if (command === 'catalog') await catalog(a, b, report(c));
  else if (command === 'review') await review(report(a));
  else if (command === 'compile') await compile(report(a), b);
  else if (command === 'check') { await validateManifest(await read(a)); console.log('Manifesto e hashes válidos.'); }
  else throw new Error('Comandos: prepare <pasta> [revisao] | catalog <api> <ano> [revisao] | review [revisao] | compile <revisao> <manifesto-backend> | check <manifesto-backend>');
}
main().catch(error => { console.error(error.message); process.exitCode = 1; });
