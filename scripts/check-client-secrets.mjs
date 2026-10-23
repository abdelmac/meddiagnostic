import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export function knownServerSecrets() {
  const secrets = [];
  if (fs.existsSync(".local/supabase-keys.json")) {
    const raw = JSON.parse(
      fs.readFileSync(".local/supabase-keys.json", "utf8"),
    );
    const keys = Array.isArray(raw)
      ? raw
      : (raw.api_keys ?? raw.apiKeys ?? raw.keys ?? []);
    secrets.push(
      ...keys
        .filter((key) => key.name === "service_role" || key.type === "secret")
        .map((key) => key.api_key ?? key.key),
    );
  }
  if (fs.existsSync(".local/supabase-project.json"))
    secrets.push(
      JSON.parse(fs.readFileSync(".local/supabase-project.json", "utf8"))
        .databasePassword,
    );
  if (fs.existsSync(".env"))
    for (const line of fs.readFileSync(".env", "utf8").split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
      if (
        match &&
        !match[1].startsWith("EXPO_PUBLIC_") &&
        !match[1].startsWith("PUBLIC_")
      )
        secrets.push(match[2].replace(/^(['"])(.*)\1$/, "$2"));
    }
  return [
    ...new Set(
      secrets.filter(
        (value) =>
          typeof value === "string" &&
          value.length >= 12 &&
          !/^\*+$/.test(value),
      ),
    ),
  ];
}

/** Scan binary buffers too: Hermes bytecode can contain native string tables. */
export function auditClientSecrets(roots, secrets) {
  const needles = secrets.flatMap((value) => [
    Buffer.from(value, "utf8"),
    Buffer.from(value, "utf16le"),
  ]);
  let files = 0;
  function scan(directory) {
    for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
      const file = path.join(directory, entry.name);
      if (entry.isSymbolicLink())
        throw Error(
          "Symbolic link in client artifacts; audit the resolved output before publishing.",
        );
      if (entry.isDirectory()) scan(file);
      else {
        const bytes = fs.readFileSync(file);
        files++;
        if (needles.some((secret) => bytes.includes(secret)))
          throw Error(
            "A server secret was found in a client artifact. Publication blocked.",
          );
      }
    }
  }
  roots.forEach(scan);
  return { files, knownSecrets: secrets.length };
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
) {
  const roots = process.argv.length > 2 ? process.argv.slice(2) : ["dist"];
  const result = auditClientSecrets(roots, knownServerSecrets());
  console.log(
    JSON.stringify({
      ...result,
      result: "No known server secret found in client artifacts",
      roots,
    }),
  );
}
