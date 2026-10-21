export type AuthDestination = "home" | "profile" | "competition";
export const AUTH_DESTINATION_KEY = "medquiz.auth.destination";
export const AUTH_MODE_KEY = "medquiz.auth.mode";
export const AUTH_PENDING_REQUEST_KEY = "medquiz.auth.pending-request.v1";

/** Auth returns only to known screens; URL input never becomes a redirect URL. */
export function authDestination(value: unknown): AuthDestination {
  return value === "home" || value === "competition" ? value : "profile";
}

export function authDestinationURL(destination: AuthDestination) {
  return destination === "home" ? "/" : `/?screen=${destination}`;
}
