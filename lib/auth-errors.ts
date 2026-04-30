import type { AuthError } from "@supabase/supabase-js";

export type AuthErrorKey =
  | "errors.emailAlreadyUsed"
  | "errors.invalidEmail"
  | "errors.passwordTooShort"
  | "errors.rateLimited"
  | "errors.emailNotConfirmed"
  | "errors.invalidCredentials"
  | "errors.network"
  | "errors.serviceUnavailable"
  | "errors.tokenExpired"
  | "errors.unknown";

export function mapAuthError(err: AuthError): AuthErrorKey {
  const code = err.code ?? "";
  const msg = err.message.toLowerCase();
  const status = err.status ?? 0;

  if (status === 429 || code === "over_request_rate_limit" || msg.includes("rate limit")) {
    return "errors.rateLimited";
  }
  if (
    code === "user_already_exists" ||
    msg.includes("already registered") ||
    msg.includes("user already exists")
  ) {
    return "errors.emailAlreadyUsed";
  }
  if (
    code === "invalid_email" ||
    msg.includes("invalid email") ||
    msg.includes("unable to validate email")
  ) {
    return "errors.invalidEmail";
  }
  if (code === "email_not_confirmed" || msg.includes("email not confirmed")) {
    return "errors.emailNotConfirmed";
  }
  if (
    code === "invalid_credentials" ||
    (msg.includes("invalid") && (msg.includes("credentials") || msg.includes("login")))
  ) {
    return "errors.invalidCredentials";
  }
  if (code === "weak_password" || msg.includes("should be at least")) {
    return "errors.passwordTooShort";
  }
  if (
    code === "session_not_found" ||
    code === "otp_expired" ||
    msg.includes("expired") ||
    msg.includes("session not found")
  ) {
    return "errors.tokenExpired";
  }
  if (status >= 500) {
    return "errors.serviceUnavailable";
  }

  return "errors.unknown";
}

export function devLog(context: string, err: unknown) {
  if (process.env.NODE_ENV !== "production") {
    console.error(`[Auth:${context}]`, err);
  }
}
