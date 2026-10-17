import fs from "node:fs";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
const project = "wpukzqrqajcnjltnqxvh";
const url = `https://${project}.supabase.co`;
const raw = JSON.parse(fs.readFileSync(".local/supabase-keys.json", "utf8"));
const keys = Array.isArray(raw)
  ? raw
  : (raw.api_keys ?? raw.apiKeys ?? raw.keys);
const get = (name) => {
  const k = keys.find((k) => k.name === name);
  return k?.api_key ?? k?.key;
};
const admin = createClient(url, get("service_role"), {
  auth: { persistSession: false, autoRefreshToken: false },
});
const path = ".local/account-fixtures.json";
async function main() {
  if (process.argv.includes("--refresh-code")) {
    const fixture = JSON.parse(fs.readFileSync(path, "utf8"));
    const generated = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: fixture.users[1].email,
    });
    if (generated.error) throw generated.error;
    fixture.users[1].code = generated.data.properties.email_otp;
    fs.writeFileSync(path, JSON.stringify(fixture), { mode: 0o600 });
    console.log("Verification fixture refreshed without sending email.");
    return;
  }
  if (process.argv.includes("--clean")) {
    if (fs.existsSync(path)) {
      for (const f of JSON.parse(fs.readFileSync(path, "utf8")).users) {
        if (
          !/^medquiz-test-(alice|bob)-[a-f0-9]+@example\.invalid$/.test(f.email)
        )
          throw Error("Not a test account");
        const { error } = await admin.auth.admin.deleteUser(f.userId);
        if (error && error.status !== 404) throw error;
      }
      fs.unlinkSync(path);
    }
    console.log("Test accounts removed.");
    return;
  }
  if (fs.existsSync(path))
    throw Error("Fixtures exist; reuse or clean before creating more.");
  const users = [];
  for (const name of ["alice", "bob"]) {
    const email = `medquiz-test-${name}-${randomBytes(6).toString("hex")}@example.invalid`;
    const password = randomBytes(32).toString("base64url");
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (error) throw error;
    const client = createClient(url, get("anon"), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const signed = await client.auth.signInWithPassword({ email, password });
    if (signed.error) throw signed.error;
    users.push({ userId: data.user.id, email, session: signed.data.session });
  }
  fs.writeFileSync(
    path,
    JSON.stringify({ url, storageKey: `sb-${project}-auth-token`, users }),
    { mode: 0o600 },
  );
  console.log("Two isolated test accounts created without sending email.");
}
await main();
