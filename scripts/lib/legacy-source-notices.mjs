import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
export const distributionPolicy = JSON.parse(fs.readFileSync(path.join(root, 'config/source-distribution.json'), 'utf8'));
export const legacySourceUrl = distributionPolicy.legacyRelease.sourceUrl;
export const legacyCodeLicenceFile = path.join(root, 'licenses/legacy-2026-10-28/CC-BY-SA-4.0.txt');
export const retiredSourceArchiveUrl = 'https://medquiz-europe.medcompass-web.workers.dev/source/ippomed-source-2026-10-28.zip';

export function legacyModelNotice(text) {
  const updated = text.replaceAll(retiredSourceArchiveUrl, legacySourceUrl);
  const marker = 'Source archive withdrawal:';
  return updated.includes(marker) ? updated : updated.trimEnd() + `\n\n${marker}\nThe project-hosted complete source archive is withdrawn. The existing reader retains its previously published CC-BY-SA-4.0 source at the verified immutable public revision above. This preserves the documented source condition of the existing Z-Anatomy integration. It does not make the project private, revoke prior grants, relicense third-party assets, or grant a blanket licence for future application versions.\n`;
}

export function legacyModelManifest(manifest) {
  if (manifest.datasetId !== 'z-anatomy-neurovascular' || manifest.publicationStatus !== 'approved') throw Error('Expected the previously approved atlas');
  const copy = structuredClone(manifest);
  if (![legacySourceUrl, retiredSourceArchiveUrl].includes(copy.publicationBasis?.sourceCodeUrl)) throw Error('Unexpected historical source reference');
  copy.publicationBasis.sourceCodeUrl = legacySourceUrl;
  copy.sourceDistributionPolicy = {
    projectHostedCompleteArchive: 'withdrawn',
    legacySourceUrl,
    legacyCommit: distributionPolicy.legacyRelease.commit,
    previousValidGrantsRetained: true,
    currentViewerSource: 'previously-published-legacy-revision',
    futureApplicationLicence: 'not-granted-by-this-model-notice',
    entireProjectIsPrivate: false,
  };
  return copy;
}
