import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(fileURLToPath(new URL('..', import.meta.url)));

/** The retired download namespace is not an application or third-party asset route. */
export function isRetiredSourcePath(value) {
  let pathname = new URL(value, 'http://localhost').pathname;
  for (let count = 0; count < 2; count++) {
    try {
      const decoded = decodeURIComponent(pathname);
      if (decoded === pathname) break;
      pathname = decoded;
    } catch { break; }
  }
  return /^\/+source(?:\/|$)/i.test(pathname.replaceAll('\\', '/'));
}

/** Read-only defence against accidentally republishing complete source snapshots. */
export function sourceDistributionViolations(roots) {
  const violations = [];
  for (const root of roots) {
    if (!fs.existsSync(root)) continue;
    const resolvedRoot = path.resolve(root);
    function scan(directory) {
      for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
        const file = path.join(directory, entry.name);
        const relative = path.relative(resolvedRoot, file).split(path.sep).join('/');
        if (entry.isSymbolicLink()) { violations.push(`${file}: linked publication path`); continue; }
        if (entry.isDirectory()) { scan(file); continue; }
        if (/^source(?:\/|$)/i.test(relative)
          || /(?:^|\/)ippomed-source-[^/]*\.zip(?:\.sha256)?$/i.test(relative)
          || /(?:^|\/)SOURCE-DISTRIBUTION\.json$/i.test(relative)) {
          violations.push(file);
        }
      }
    }
    scan(resolvedRoot);
  }
  return violations;
}

export function assertNoPublicSourceDistribution(roots) {
  const violations = sourceDistributionViolations(roots);
  if (violations.length) throw Error(`Public source distribution is disabled. Remove the retired publication files before building or deploying:\n${violations.join('\n')}`);
  return { roots: roots.length, forbiddenFiles: 0 };
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const requested = process.argv.slice(2);
  if (requested.some(value => !['public', 'dist'].includes(value))) throw Error('Usage: node scripts/check-source-distribution.mjs [public] [dist]');
  const roots = (requested.length ? requested : ['public', 'dist']).map(name => path.join(projectRoot, name));
  console.log(JSON.stringify({ ...assertNoPublicSourceDistribution(roots), result: 'No public application-source archive or distribution manifest' }));
}
