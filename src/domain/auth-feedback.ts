/** Safe, passwordless-auth feedback. Provider messages are never user-facing. */
export type AuthStage = "send" | "verify" | "google";
export type AuthFeedback = {
  message: string;
  field?: "email" | "code";
  retryable?: boolean;
};

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

/** Practical public-email validation; the auth service remains authoritative. */
export function validAuthEmail(value: string): boolean {
  const email = normalizeEmail(value);
  if (email.length > 254 || /\s/.test(email)) return false;
  const parts = email.split("@");
  if (parts.length !== 2) return false;
  const [local = "", domain = ""] = parts;
  if (
    !local ||
    local.length > 64 ||
    !/^[a-z0-9!#$%&'*+/=?^_`{|}~.\-]+$/.test(local) ||
    local.startsWith(".") ||
    local.endsWith(".") ||
    local.includes("..")
  )
    return false;
  const labels = domain.split(".");
  if (labels.length < 2) return false;
  if (
    labels.some(
      (label) => !/^[a-z0-9](?:[a-z0-9\-]{0,61}[a-z0-9])?$/.test(label),
    )
  )
    return false;
  const suffix = labels.at(-1)!;
  return suffix.length >= 2 && /[a-z]/.test(suffix);
}

/** Preserve leading zeroes; support Supabase's configurable 6–12 digit OTPs. */
export function validAuthCode(value: string): boolean {
  return /^[0-9]{6,12}$/.test(value.trim());
}

const copy = {
  invalidEmail: [
    "Saisissez une adresse e-mail valide, par exemple vous@exemple.fr.",
    "Enter a valid email address, for example you@example.com.",
  ],
  invalidCode: [
    "Saisissez le code reçu par e-mail (6 à 12 chiffres).",
    "Enter the code from your email (6–12 digits).",
  ],
  rejectedCode: [
    "Ce code est incorrect ou a expiré. Vérifiez-le ou demandez un nouveau lien.",
    "This code is incorrect or has expired. Check it or request a new link.",
  ],
  emailLimit: [
    "L’envoi d’e-mails est momentanément limité. Patientez avant de demander un nouveau lien.",
    "Email delivery is temporarily limited. Wait before requesting another link.",
  ],
  requestLimit: [
    "Trop de tentatives pour le moment. Patientez avant de réessayer.",
    "Too many attempts right now. Wait before trying again.",
  ],
  unavailableEmail: [
    "La connexion par e-mail est indisponible pour le moment. Réessayez plus tard.",
    "Email sign-in is unavailable right now. Try again later.",
  ],
  unavailableGoogle: [
    "La connexion Google est indisponible pour le moment. Vous pouvez utiliser un lien par e-mail.",
    "Google sign-in is unavailable right now. You can use an email link instead.",
  ],
  cancelledGoogle: [
    "La connexion Google a été annulée. Vous pouvez réessayer quand vous le souhaitez.",
    "Google sign-in was cancelled. You can try again whenever you like.",
  ],
  network: [
    "Impossible de joindre le service. Vérifiez votre connexion Internet, puis réessayez.",
    "The service could not be reached. Check your internet connection, then try again.",
  ],
  send: [
    "Impossible de confirmer l’envoi du lien. Vérifiez l’adresse et réessayez plus tard.",
    "The link could not be sent or confirmed. Check the address and try again later.",
  ],
  verify: [
    "La vérification n’a pas abouti. Réessayez ou demandez un nouveau lien.",
    "Verification could not be completed. Try again or request a new link.",
  ],
  google: [
    "La connexion Google n’a pas abouti. Réessayez ou utilisez un lien par e-mail.",
    "Google sign-in could not be completed. Try again or use an email link.",
  ],
} as const;

// Only stable codes/names are examined. Never parse a provider's message, URL,
// email address, SQL details or HTML. Even unexpected getters fail closed.
function property(issue: unknown, key: string): unknown {
  if (!issue || typeof issue !== "object") return undefined;
  try {
    return (issue as Record<string, unknown>)[key];
  } catch {
    return undefined;
  }
}

/**
 * Docs: https://supabase.com/docs/guides/auth/debugging/error-codes
 * Local validation codes: invalid_email, invalid_code.
 * Account-state errors share the same generic stage feedback, so the UI never
 * confirms whether an email exists, is confirmed, or belongs to a blocked user.
 */
export function authFeedback(
  issue: unknown,
  stage: AuthStage,
  language: "fr" | "en",
): AuthFeedback {
  const rawCode = typeof issue === "string" ? issue : property(issue, "code");
  const code = typeof rawCode === "string" ? rawCode : "";
  const rawName = property(issue, "name");
  const name = typeof rawName === "string" ? rawName : "";
  const result = (
    key: keyof typeof copy,
    field?: AuthFeedback["field"],
    retryable = true,
  ): AuthFeedback => ({
    message: copy[key][language === "fr" ? 0 : 1],
    ...(field ? { field } : {}),
    retryable,
  });
  if (
    stage !== "google" &&
    ["invalid_email", "email_address_invalid"].includes(code)
  )
    return result("invalidEmail", "email", false);
  if (stage === "verify" && code === "invalid_code")
    return result("invalidCode", "code", false);
  if (
    stage === "verify" &&
    [
      "otp_expired",
      "otp_invalid",
      "invalid_otp",
      "invalid_credentials",
    ].includes(code)
  )
    return result("rejectedCode", "code");
  if (code === "over_email_send_rate_limit")
    return result("emailLimit", "email");
  if (
    code === "over_request_rate_limit" ||
    (!code && property(issue, "status") === 429)
  )
    return result("requestLimit");
  if (
    ["offline", "network_error", "request_timeout"].includes(code) ||
    [
      "AuthRetryableFetchError",
      "NetworkError",
      "FetchError",
      "TypeError",
      "AbortError",
      "TimeoutError",
    ].includes(name)
  )
    return result("network");
  if (
    stage === "google" &&
    [
      "provider_disabled",
      "oauth_provider_not_supported",
      "google_unavailable",
    ].includes(code)
  )
    return result("unavailableGoogle", undefined, false);
  if (
    stage === "google" &&
    ["access_denied", "cancelled", "user_cancelled"].includes(code)
  )
    return result("cancelledGoogle");
  if (
    stage !== "google" &&
    ["signup_disabled", "otp_disabled", "email_provider_disabled"].includes(
      code,
    )
  )
    return result("unavailableEmail");
  return result(stage);
}
