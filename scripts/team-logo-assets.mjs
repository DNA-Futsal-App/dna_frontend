import fs from 'node:fs/promises';
import path from 'node:path';

const imagePattern = /\.(png|jpe?g|webp|gif|avif|svg)$/i;
export const normalizeAssetName = value => String(value ?? '').normalize('NFD')
  .replace(/\p{M}/gu, '').toLowerCase().replace(/[^a-z0-9]/g, '');

export function assetStem(value) {
  return normalizeAssetName(path.posix.basename(value.replaceAll('\\', '/'))
    .replace(imagePattern, '').replace(/\.svg$/i, '')
    .replace(/^\d+\s+/, '').replace(/\s*\(\d+\)$/, '')
    .replace(/(?:^|[_\s-])(logo|logotipo|escudo)(?=[_\s.-]|$)/gi, ''));
}

export function imageUrl(value) {
  try {
    const url = new URL(value);
    if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password) return null;
    if (url.hostname === 'drive.google.com') {
      const id = url.pathname.match(/^\/file\/d\/([\w-]+)/)?.[1] ?? url.searchParams.get('id');
      if (!id || !/^[\w-]+$/.test(id)) return null;
      // A sharing page is HTML; the thumbnail endpoint returns image bytes for public files.
      const thumbnail = new URL('https://drive.google.com/thumbnail');
      thumbnail.searchParams.set('id', id);
      thumbnail.searchParams.set('sz', 'w256');
      const resourceKey = url.searchParams.get('resourcekey');
      if (resourceKey) thumbnail.searchParams.set('resourcekey', resourceKey);
      return thumbnail.href;
    }
    return url.href;
  } catch { return null; }
}

export async function createLogoAssetIndex(publicRoot) {
  const assets = [];
  async function walk(directory) {
    for (const entry of await fs.readdir(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isDirectory()) await walk(file);
      else if (entry.isFile() && imagePattern.test(entry.name)
        && !/^escudos?[_\s-]*dos[_\s-]*times/i.test(entry.name)) {
        const relative = path.relative(publicRoot, file).split(path.sep).join('/');
        assets.push({ relative, basename: entry.name, stem: assetStem(entry.name),
          url: '/' + relative.split('/').map(encodeURIComponent).join('/') });
      }
    }
  }
  await walk(publicRoot);
  return assets.sort((a, b) => a.relative.localeCompare(b.relative));
}

export function findLocalLogos(reference, assets, context = '') {
  if (!reference || /^https?:\/\//i.test(reference)) return [];
  let relative;
  try { relative = decodeURIComponent(reference); } catch { relative = reference; }
  relative = relative.replaceAll('\\', '/').replace(/^\/?public\//i, '')
    .replace(/^\.\//, '').replace(/^\//, '');
  const exact = assets.filter(asset => asset.relative.normalize('NFC').toLowerCase() === relative.normalize('NFC').toLowerCase());
  if (exact.length) return exact.map(asset => asset.url);
  // A supplied directory is authoritative. Never silently substitute another directory.
  if (relative.includes('/')) return [];
  let matches = assets.filter(asset => asset.basename.normalize('NFC').toLowerCase() === relative.normalize('NFC').toLowerCase());
  if (!matches.length) matches = assets.filter(asset => asset.stem === assetStem(relative));
  const normalizedContext = normalizeAssetName(context);
  const family = normalizedContext.includes('iniciacao') ? 'iniciacao' : normalizedContext.includes('base') ? 'base' : '';
  const division = normalizedContext.match(/a[123]/)?.[0];
  // The worksheet identifies which copy belongs to this competition. Other copies remain fallbacks.
  const score = asset => {
    const segments = asset.relative.split('/').map(normalizeAssetName);
    return (family && segments.includes(family) ? 2 : 0) + (division && segments.includes(division) ? 1 : 0);
  };
  return matches.sort((a, b) => score(b) - score(a) || a.relative.localeCompare(b.relative)).map(asset => asset.url);
}
