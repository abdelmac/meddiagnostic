import fs from "node:fs";
import path from "node:path";
import { createHash } from "node:crypto";

// Data only: do not execute any upstream script. Each OBJ is verified by its
// original DBCLS header, archive membership and expected uncompressed length.
const repo = "olivercase/body_parts_3d_api";
const folder = path.resolve(".local/bodyparts3d-highres");
const objects = path.join(folder, "objs");
fs.mkdirSync(objects, { recursive: true });
async function get(url) {
  let last;
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(60000) });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response;
    } catch (error) {
      last = error;
    }
  }
  throw last;
}
// Pin the audited release rather than silently switching anatomy on a rerun.
const commit = { sha: "fd527e6f4daf732fd814314d9257df5877b844bc" };
if (!/^[a-f0-9]{40}$/.test(commit.sha)) throw new Error("Invalid commit");
const tree = await (
  await get(
    `https://api.github.com/repos/${repo}/git/trees/${commit.sha}?recursive=1`,
  )
).json();
const csvPath = path.join(folder, "MANIFEST.csv");
if (!fs.existsSync(csvPath))
  fs.writeFileSync(
    csvPath,
    await (
      await get(
        `https://raw.githubusercontent.com/${repo}/${commit.sha}/MANIFEST.csv`,
      )
    ).text(),
  );
const csv = fs.readFileSync(csvPath, "utf8");
const sizes = new Map(
  csv
    .trim()
    .split(/\r?\n/)
    .slice(1)
    .map((line) => {
      const parts = line.split(",");
      return [parts[0], Number(parts.at(-2))];
    }),
);
const rows = tree.tree.filter(
  (entry) =>
    /^meshes\/FJ\d+M?_BP\d+_FMA\d+_.+\.obj$/.test(entry.path) &&
    /nerve|plexus/i.test(entry.path),
);
if (rows.length < 100) throw new Error("Incomplete nerve set");
let completed = 0;
const records = [];
const queue = [...rows];
await Promise.all(
  Array.from({ length: 6 }, async () => {
    while (queue.length) {
      const entry = queue.shift();
      const match = /^meshes\/(FJ\d+M?)_(BP\d+)_(FMA\d+)_(.+)\.obj$/.exec(
        entry.path,
      );
      const [, elementId, representationId, fmaId, name] = match;
      const file = path.join(objects, `${elementId}.obj`);
      const url = `https://media.githubusercontent.com/media/${repo}/${commit.sha}/${entry.path.split("/").map(encodeURIComponent).join("/")}`;
      let buffer = fs.existsSync(file)
        ? fs.readFileSync(file)
        : Buffer.from(await (await get(url)).arrayBuffer());
      const header = buffer.subarray(0, 2000).toString("utf8");
      if (
        !header.includes("Compatibility version : 4.3") ||
        !header.includes(`File ID : ${elementId}`) ||
        !/\nv\s/.test(buffer.toString("utf8")) ||
        buffer.length !== sizes.get(elementId)
      )
        throw new Error(`Invalid mesh ${elementId}`);
      if (!fs.existsSync(file)) fs.writeFileSync(file, buffer);
      records.push({
        id: `${fmaId}_${elementId}`,
        elementId,
        fmaId,
        representationId,
        name,
        file: `${elementId}.obj`,
        bytes: buffer.length,
        sha256: createHash("sha256").update(buffer).digest("hex"),
        sourceUrl: url,
      });
      completed++;
      if (completed % 30 === 0 || completed === rows.length)
        console.log(`Verified nerve meshes ${completed}/${rows.length}`);
    }
  }),
);
records.sort((a, b) => a.id.localeCompare(b.id));
fs.writeFileSync(
  path.join(folder, "nerve-metadata.json"),
  JSON.stringify(
    {
      dataset: "BodyParts3D 4.3",
      originalSource: "https://lifesciencedb.jp/bp3d/",
      mirror: `https://github.com/${repo}`,
      commit: commit.sha,
      license: "CC-BY-SA-2.1-JP",
      licenseUrl: "https://creativecommons.org/licenses/by-sa/2.1/jp/",
      attribution:
        "BodyParts3D, Copyright 2008 Database Center for Life Science (DBCLS), licensed under CC Attribution-ShareAlike 2.1 Japan",
      meshes: records,
    },
    null,
    2,
  ) + "\n",
);
console.log(
  `Nerve source metadata saved: ${records.length} anatomical meshes; no source code executed.`,
);
