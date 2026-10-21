import { test } from "node:test";
import assert from "node:assert/strict";
import {
  authFeedback,
  normalizeEmail,
  validAuthCode,
  validAuthEmail,
} from "../src/domain/auth-feedback";

test("email normalization preserves aliases and dots while removing outer whitespace/case", () => {
  assert.equal(
    normalizeEmail("  Student.Name+ANATOMY@Example.FR \n"),
    "student.name+anatomy@example.fr",
  );
  assert.equal(normalizeEmail("a..b@example.fr"), "a..b@example.fr");
  assert.equal(normalizeEmail("a b@example.fr"), "a b@example.fr");
  assert.equal(normalizeEmail(""), "");
});

test("public email validation accepts realistic aliases/subdomains without accepting malformed or header-injected addresses", () => {
  for (const email of [
    "student@example.fr",
    " STUDENT.Name+anatomy@Med.Example.eu ",
    "o'connor@example.co.uk",
    "doctor@xn--hpital-bxa.fr",
    "a@b.museum",
  ])
    assert.equal(validAuthEmail(email), true, email);
  for (const email of [
    "",
    "student",
    "student@localhost",
    "student@@example.fr",
    "a b@example.fr",
    "a@example..fr",
    ".a@example.fr",
    "a.@example.fr",
    "a..b@example.fr",
    "a@-example.fr",
    "a@example-.fr",
    "a@example_fr.eu",
    "a@127.0.0.1",
    "a@example.1",
    "a@example.f",
    "name@example.fr\r\nBcc:other@example.fr",
    "name\u0000@example.fr",
    "a@examp\u200ble.fr",
  ])
    assert.equal(validAuthEmail(email), false, JSON.stringify(email));
});

test("email validation respects local, label and total transport lengths", () => {
  assert.equal(validAuthEmail(`${"a".repeat(64)}@example.fr`), true);
  assert.equal(validAuthEmail(`${"a".repeat(65)}@example.fr`), false);
  assert.equal(validAuthEmail(`a@${"b".repeat(63)}.fr`), true);
  assert.equal(validAuthEmail(`a@${"b".repeat(64)}.fr`), false);
  const exactly254 = `${"a".repeat(64)}@${"b".repeat(63)}.${"c".repeat(63)}.${"d".repeat(61)}`;
  assert.equal(exactly254.length, 254);
  assert.equal(validAuthEmail(exactly254), true);
  assert.equal(validAuthEmail(`${exactly254}e`), false);
});

test("OTP validation keeps leading zeroes and accepts configured lengths but never signs, Unicode digits or embedded whitespace", () => {
  for (const code of ["012345", "00123456", "123456789012", " 00123456\n"])
    assert.equal(validAuthCode(code), true, code);
  for (const code of [
    "",
    "12345",
    "1234567890123",
    "1234 5678",
    "+123456",
    "123456e2",
    "１２３４５６",
    "١٢٣٤٥٦",
    "123456<script>",
  ])
    assert.equal(validAuthCode(code), false, code);
});

test("local input errors identify the correct field and do not encourage resubmission before correction", () => {
  assert.deepEqual(authFeedback({ code: "invalid_email" }, "send", "en"), {
    message: "Enter a valid email address, for example you@example.com.",
    field: "email",
    retryable: false,
  });
  const code = authFeedback({ code: "invalid_code" }, "verify", "fr");
  assert.equal(code.field, "code");
  assert.equal(code.retryable, false);
  assert.match(code.message, /6 à 12/);
  assert.equal(
    authFeedback({ code: "email_address_invalid" }, "send", "fr").field,
    "email",
  );
});

test("wrong and expired OTPs share a safe actionable message, and only verification is treated as a code error", () => {
  const expired = authFeedback(
    { code: "otp_expired", message: "Token for private@example.fr expired" },
    "verify",
    "en",
  );
  for (const code of ["otp_invalid", "invalid_otp", "invalid_credentials"])
    assert.deepEqual(authFeedback({ code }, "verify", "en"), expired);
  assert.equal(expired.field, "code");
  assert.equal(expired.retryable, true);
  assert.match(expired.message, /request a new link/);
  assert.equal(
    authFeedback({ code: "invalid_credentials" }, "send", "en").field,
    undefined,
  );
});

test("account existence, verification and banned status are never revealed in either language or any stage", () => {
  for (const language of ["fr", "en"] as const) {
    for (const stage of ["send", "verify", "google"] as const) {
      const generic = authFeedback(
        { code: "unexpected_failure" },
        stage,
        language,
      );
      for (const code of [
        "email_not_confirmed",
        "user_not_found",
        "user_already_exists",
        "email_exists",
        "identity_already_exists",
        "user_banned",
        "email_address_not_authorized",
      ])
        assert.deepEqual(
          authFeedback(
            {
              code,
              message: `Sensitive account status ${code} private@example.fr`,
            },
            stage,
            language,
          ),
          generic,
        );
      assert.doesNotMatch(
        generic.message,
        /private@example\.fr|user_not_found|already exists|banned/i,
      );
    }
  }
});

test("rate limits and disabled methods explain a useful next action without inventing a retry deadline", () => {
  const email = authFeedback(
    { code: "over_email_send_rate_limit" },
    "send",
    "en",
  );
  const requests = authFeedback(
    { code: "over_request_rate_limit" },
    "verify",
    "en",
  );
  assert.equal(email.field, "email");
  assert.match(email.message, /Wait before requesting/);
  assert.match(requests.message, /Wait before trying/);
  assert.doesNotMatch(`${email.message}${requests.message}`, /\d/);
  assert.deepEqual(
    authFeedback({ status: 429 }, "send", "en"),
    authFeedback({ code: "over_request_rate_limit" }, "send", "en"),
  );
  assert.deepEqual(
    authFeedback({ code: "signup_disabled" }, "send", "fr"),
    authFeedback({ code: "otp_disabled" }, "send", "fr"),
  );
  assert.match(
    authFeedback({ code: "signup_disabled" }, "send", "en").message,
    /Email sign-in is unavailable/,
  );
  assert.match(
    authFeedback({ code: "provider_disabled" }, "google", "en").message,
    /use an email link/,
  );
});

test("network errors are recognized by structured names/codes, never by matching raw provider text", () => {
  const expected = authFeedback({ code: "offline" }, "send", "fr");
  assert.deepEqual(
    authFeedback(
      { name: "AuthRetryableFetchError", message: "Secret server details" },
      "send",
      "fr",
    ),
    expected,
  );
  assert.deepEqual(
    authFeedback({ code: "request_timeout" }, "send", "fr"),
    expected,
  );
  assert.deepEqual(
    authFeedback(
      new TypeError(
        "Failed to fetch https://secret.example/path?token=private",
      ),
      "send",
      "fr",
    ),
    expected,
  );
  assert.notDeepEqual(
    authFeedback(new Error("offline"), "send", "fr"),
    expected,
  );
});

test("Google cancellation is neutral; unknown or malicious errors never inject content or throw", () => {
  assert.match(
    authFeedback({ code: "access_denied" }, "google", "en").message,
    /was cancelled/,
  );
  for (const issue of [
    null,
    undefined,
    42,
    "<script>secret@example.fr</script>",
    new Error("<script>token=secret</script>"),
    {
      code: "<img src=x onerror=alert(1)>",
      message: "admin service_role secret",
    },
  ]) {
    for (const language of ["fr", "en"] as const) {
      const feedback = authFeedback(issue, "google", language);
      assert.ok(feedback.message.length > 20);
      assert.doesNotMatch(
        feedback.message,
        /script|onerror|service_role|secret@example|token=/,
      );
    }
  }
  const unsafe = Object.defineProperties(
    {},
    {
      code: {
        get() {
          throw Error("untrusted accessor");
        },
      },
      name: {
        get() {
          throw Error("untrusted accessor");
        },
      },
      status: {
        get() {
          throw Error("untrusted accessor");
        },
      },
    },
  );
  assert.doesNotThrow(() => authFeedback(unsafe, "send", "en"));
});
