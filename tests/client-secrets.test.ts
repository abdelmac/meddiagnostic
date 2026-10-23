import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { auditClientSecrets } from "../scripts/check-client-secrets.mjs";

test("client audit scans Hermes binary string tables without printing secrets", () => {
  const directory = fs.mkdtempSync(
    path.join(os.tmpdir(), "ippomed-secret-audit-"),
  );
  const file = path.join(directory, "entry.hbc"),
    secret = "fixture-server-secret-0123456789";
  try {
    fs.writeFileSync(
      file,
      Buffer.concat([
        Buffer.from([0, 255, 0]),
        Buffer.from(secret),
        Buffer.from([0, 128]),
      ]),
    );
    assert.throws(
      () => auditClientSecrets([directory], [secret]),
      (error: Error) =>
        !error.message.includes(secret) &&
        error.message.includes("Publication blocked"),
    );
    fs.writeFileSync(file, Buffer.from(secret, "utf16le"));
    assert.throws(() => auditClientSecrets([directory], [secret]));
    fs.writeFileSync(file, Buffer.from([0, 1, 2, 255]));
    assert.deepEqual(auditClientSecrets([directory], [secret]), {
      files: 1,
      knownSecrets: 1,
    });
  } finally {
    fs.unlinkSync(file);
    fs.rmdirSync(directory);
  }
});
