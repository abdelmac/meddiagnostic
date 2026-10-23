import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const requested = process.argv.slice(2);
if (
  requested.length > 1 ||
  requested.some((platform) => !["android", "ios"].includes(platform))
) {
  console.error("Usage: node scripts/export-native.mjs [android|ios]");
  process.exit(1);
}
const root = fileURLToPath(new URL("../", import.meta.url));
const cli = path.join(root, "node_modules", "expo", "bin", "cli");
for (const platform of requested.length ? requested : ["android", "ios"]) {
  console.log(
    `Exporting ${platform}: bundled DOM renderer, remote anatomy assets.`,
  );
  const exitCode = await new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [
        cli,
        "export",
        "--platform",
        platform,
        "--output-dir",
        `dist-native/${platform}`,
        "--max-workers",
        "2",
      ],
      {
        cwd: root,
        env: { ...process.env, EXPO_PUBLIC_FOLDER: "public-native" },
        stdio: "inherit",
        windowsHide: true,
      },
    );
    child.once("error", reject);
    child.once("exit", (code) => resolve(code ?? 1));
  });
  if (exitCode !== 0) process.exit(Number(exitCode));
}
