import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const run = promisify(execFile);
const script = fileURLToPath(new URL('./team-logos.mjs', import.meta.url));
const root = path.resolve(path.dirname(script), '..');
const call = (...args) => run(process.execPath, [script, ...args]);
const read = async p => JSON.parse(await fs.readFile(p, 'utf8'));
const write = (p, value) => fs.writeFile(p, JSON.stringify(value));

test('Image preparation, catalog contract and mapping validation', async t => {
  const temp = await fs.mkdtemp(path.join(os.tmpdir(), 'dna-logos-'));
  const input = path.join(temp, 'input');
  const report = path.join(temp, 'review');
  const output = path.join(temp, 'team-logos.json');
  await fs.mkdir(input);
  const png = await sharp({ create: { width: 240, height: 120, channels: 4,
    background: { r: 12, g: 67, b: 98, alpha: 0.5 } } }).png().toBuffer();
  await fs.writeFile(path.join(input, 'logo.png'), png);
  await fs.writeFile(path.join(input, 'copy.png'), png);
  const previousAssets = new Set(await fs.readdir(path.join(root, 'public/team-logos')).catch(() => []));
  let assetFile;
  try {
    await t.test('deduplicates originals and preserves aspect ratio and alpha', async () => {
      await call('prepare', input, report);
      const inventory = await read(path.join(report, 'inventory.json'));
      assert.equal(inventory.length, 1);
      assert.equal(inventory[0].sources.length, 2);
      assetFile = path.join(root, 'public', inventory[0].logoPath.slice(1));
      const meta = await sharp(assetFile).metadata();
      assert.equal(meta.width, 192);
      assert.equal(meta.height, 96);
      assert.equal(meta.hasAlpha, true);
    });
    await t.test('uses divisionId and eventId in the existing public API', async () => {
      const server = http.createServer((req, res) => {
        const data = {
          '/api/v1/public/catalog/divisions?season=2026': [{ id: 3, name: 'A1' }],
          '/api/v1/public/catalog/categories?season=2026&divisionId=3': [{ id: 7, name: 'Sub-10', eventId: 7001 }],
          '/api/v1/public/catalog/teams?eventId=7001': [{ id: '10', name: 'Clube A' }, { id: '20', name: 'Clube B' }],
        }[req.url];
        res.writeHead(data ? 200 : 400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(data ?? {}));
      });
      await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
      try { await call('catalog', `http://127.0.0.1:${server.address().port}`, '2026', report); }
      finally { server.closeAllConnections(); await new Promise(resolve => server.close(resolve)); }
    });
    await call('review', report);
    const reviewFile = path.join(report, 'review.json');
    let rows = await read(reviewFile);
    const inventory = await read(path.join(report, 'inventory.json'));
    await t.test('does not publish pending or guessed associations', async () => {
      await assert.rejects(call('compile', report, output), /Revisão pendente/);
      await assert.rejects(call('review', report), /EEXIST/);
    });
    rows[0] = { ...rows[0], approved: true, clubKey: 'clube-a', logoPath: inventory[0].logoPath };
    rows[1].skipReason = 'Escudo ainda não identificado';
    await write(reviewFile, rows);
    await t.test('publishes only approved bindings and explicitly records omissions', async () => {
      const result = await call('compile', report, output);
      assert.equal(JSON.parse(result.stdout).coveragePercent, 50);
      assert.equal((await read(output)).bindings.length, 1);
      await call('check', output);
    });
    await t.test('rejects aliases that identify another team in the event', async () => {
      const altered = structuredClone(rows);
      altered[0].aliases.push('Clube B');
      await write(reviewFile, altered);
      await assert.rejects(call('compile', report, output), /Alias pertence/);
      await write(reviewFile, rows);
    });
    await t.test('rejects modified bytes under an immutable filename', async () => {
      const bytes = await fs.readFile(assetFile);
      await fs.writeFile(assetFile, Buffer.from('invalid'));
      try { await assert.rejects(call('check', output), /Hash incorreto/); }
      finally { await fs.writeFile(assetFile, bytes); }
    });
  } finally {
    if (assetFile && !previousAssets.has(path.basename(assetFile))) await fs.rm(assetFile, { force: true });
    await fs.rm(temp, { recursive: true, force: true });
  }
});
