import { test } from "node:test";
import assert from "node:assert/strict";
import {
  callbackError,
  cleanAuthCallbackURL,
  nativeAuthCallback,
} from "../src/domain/auth-callback";
import { googleProviderStatus } from "../src/services/auth-providers";

test("les codes natifs ne sont échangés que sur le callback MedQuiz", () => {
  assert.deepEqual(nativeAuthCallback("medquiz://auth/callback?code=once"), {
    code: "once",
  });
  for (const url of [
    "https://attacker.example/?code=once",
    "medquiz://evil/callback?code=once",
    "medquiz://auth/other?code=once",
    "medquiz://user:pass@auth/callback?code=once",
    "malformed",
    "medquiz://auth/callback?code=",
  ])
    assert.equal(nativeAuthCallback(url), null, url);
  assert.equal(
    nativeAuthCallback(
      "medquiz://auth/callback#access_token=unbound&refresh_token=unbound",
    ),
    null,
  );
});

test("les erreurs OAuth restent des états connus et les secrets quittent l’URL", () => {
  assert.equal(
    callbackError(
      new URL(
        "https://app.example/?error=access_denied&error_description=%3Cscript%3E",
      ),
    ),
    "cancelled",
  );
  assert.equal(
    callbackError(new URL("https://app.example/#error_description=secret")),
    "failed",
  );
  assert.equal(
    cleanAuthCallbackURL(
      "https://app.example/?lang=en&code=once&invite=ABC#access_token=secret&refresh_token=secret",
    ),
    "https://app.example/?lang=en&invite=ABC",
  );
  assert.equal(
    cleanAuthCallbackURL("https://app.example/?lang=fr#help"),
    "https://app.example/?lang=fr#help",
  );
});

test("Google reste désactivé sans preuve du fournisseur serveur", async () => {
  const response = (payload: unknown, status = 200) =>
    (async () =>
      new Response(JSON.stringify(payload), { status })) as typeof fetch;
  assert.equal(
    await googleProviderStatus(
      "https://app.example",
      "public",
      response({ external: { google: true } }),
    ),
    "enabled",
  );
  assert.equal(
    await googleProviderStatus(
      "https://app.example",
      "public",
      response({ external: { google: false } }),
    ),
    "disabled",
  );
  assert.equal(
    await googleProviderStatus(
      "https://app.example",
      "public",
      response({ external: { google: "true" } }),
    ),
    "disabled",
  );
  assert.equal(
    await googleProviderStatus(
      "https://app.example",
      "public",
      response({}, 503),
    ),
    "unavailable",
  );
});
