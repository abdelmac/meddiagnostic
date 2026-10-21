import fs from "node:fs";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const project = "wpukzqrqajcnjltnqxvh";
const url = `https://${project}.supabase.co`;
const path = ".local/competitive-fixtures.json";
const raw = JSON.parse(fs.readFileSync(".local/supabase-keys.json", "utf8"));
const keys = Array.isArray(raw)
  ? raw
  : (raw.api_keys ?? raw.apiKeys ?? raw.keys);
const key = (name) => {
  const entry = keys.find((item) => item.name === name);
  return entry?.api_key ?? entry?.key;
};
const admin = createClient(url, key("service_role"), {
  auth: { persistSession: false, autoRefreshToken: false },
});

async function main() {
  if (process.argv.includes("--smoke")) {
    const fixture = JSON.parse(fs.readFileSync(path, "utf8"));
    const client = createClient(url, key("anon"), {
      auth: { persistSession: false, autoRefreshToken: false },
      global: { headers: { Authorization: `Bearer ${fixture.users[0].session.access_token}` } },
    });
    const [profile, leaderboard] = await Promise.all([
      client.rpc("competitive", { command: "profile", payload: {} }),
      client.rpc("competitive", { command: "leaderboard", payload: { studyYear: 3 } }),
    ]);
    if (profile.error || leaderboard.error) throw profile.error ?? leaderboard.error;
    if (!Array.isArray(leaderboard.data?.players)) throw Error("Unexpected competitive response");
    console.log("Live authenticated competitive profile and leaderboard RPCs passed without consuming a session.");
    return;
  }
  if (process.argv.includes("--clean")) {
    if (!fs.existsSync(path)) return;
    for (const item of JSON.parse(fs.readFileSync(path, "utf8")).users) {
      if (
        !/^medquiz-competitive-(alice|bob)-[a-f0-9]+@example\.invalid$/.test(
          item.email,
        )
      )
        throw Error("Refusing to remove a non-fixture user");
      const { error } = await admin.auth.admin.deleteUser(item.userId);
      if (error && error.status !== 404) throw error;
    }
    fs.unlinkSync(path);
    console.log("Dedicated competitive test accounts removed.");
    return;
  }
  if (fs.existsSync(path))
    throw Error("Dedicated fixtures already exist; reuse or clean first.");
  const users = [];
  for (const name of ["alice", "bob"]) {
    const email = `medquiz-competitive-${name}-${randomBytes(6).toString("hex")}@example.invalid`;
    const password = randomBytes(32).toString("base64url");
    const created = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    });
    if (created.error) throw created.error;
    const client = createClient(url, key("anon"), {
      auth: { persistSession: false, autoRefreshToken: false },
    });
    const signed = await client.auth.signInWithPassword({ email, password });
    if (signed.error) throw signed.error;
    users.push({
      userId: created.data.user.id,
      email,
      session: signed.data.session,
    });
    // Persist after each creation so a partial run can still be cleaned safely.
    fs.writeFileSync(
      path,
      JSON.stringify({ url, storageKey: `sb-${project}-auth-token`, users }),
      { mode: 0o600 },
    );
  }
  console.log(
    "Two dedicated competitive accounts created without sending email.",
  );
}
await main();
