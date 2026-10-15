import { HacError, isHacError, type HacStage } from "./types";

/** Schema-only diagnostics. Never include issue.message, issue.input or field values. */
export function validationFields(
  issues: readonly { path: readonly PropertyKey[]; code: string }[],
) {
  const allowed = new Set([
    "mode",
    "portal",
    "studentId",
    "studentName",
    "term",
    "fetchedAt",
    "status",
    "issues",
    "courses",
    "id",
    "name",
    "teacher",
    "average",
    "averageText",
    "assignmentsAvailable",
    "assignments",
    "categories",
    "weight",
    "category",
    "due",
    "score",
    "earned",
    "possible",
    "possibleText",
    "weightText",
    "percentText",
  ]);
  return [
    ...new Set(
      issues.slice(0, 20).map(
        (issue) =>
          `${
            issue.path
              .map((p) =>
                typeof p === "number"
                  ? "[]"
                  : allowed.has(String(p))
                    ? String(p)
                    : "field",
              )
              .join(".")
              .replace(/\.\[\]/g, "[]") || "snapshot"
          }:${["too_big", "too_small", "invalid_type", "invalid_format", "custom"].includes(issue.code) ? issue.code : "invalid"}`,
      ),
    ),
  ].slice(0, 8);
}

/** Never return/log upstream messages, URLs, HTML, cookie values or schema values. */
export function connectionError(error: unknown, stage: HacStage): HacError {
  if (isHacError(error))
    return new HacError(error.code, error.message, error.status, {
      ...error.details,
      stage: error.details?.stage ?? stage,
    });
  const metadata = error as { name?: unknown; code?: unknown } | null;
  const code = typeof metadata?.code === "string" ? metadata.code : "";
  const name = typeof metadata?.name === "string" ? metadata.name : "";
  if (["ENOTFOUND", "EAI_AGAIN", "ENODATA"].includes(code))
    return new HacError(
      "DNS",
      "The district HAC address could not be found. Check the official HAC URL, then check the district connection before signing in again.",
      502,
      { stage },
    );
  if (
    ["AbortError", "TimeoutError"].includes(name) ||
    ["ETIMEDOUT", "ESOCKETTIMEDOUT"].includes(code)
  )
    return new HacError(
      "TIMEOUT",
      "HAC took too long to respond. Try again shortly.",
      504,
      { stage },
    );
  if (
    /^(?:ERR_TLS_|CERT_|DEPTH_ZERO_|UNABLE_TO_VERIFY_|SELF_SIGNED_)/.test(code)
  )
    return new HacError(
      "TLS",
      "The district’s secure connection could not be verified. Check the official HAC address.",
      502,
      { stage },
    );
  if (
    [
      "ECONNREFUSED",
      "ECONNRESET",
      "ENETUNREACH",
      "EHOSTUNREACH",
      "EPIPE",
    ].includes(code)
  )
    return new HacError(
      "NETWORK",
      "The connection to the district was interrupted. Check the district connection, then retry.",
      502,
      { stage },
    );
  if (name === "ZodError")
    return new HacError(
      "SOURCE_VALIDATION",
      "HAC returned records in an unrecognized format. Existing grades were preserved; no values were guessed.",
      422,
      { stage },
    );
  return new HacError(
    "CONNECTOR_ERROR",
    "The HAC connection stopped unexpectedly. Use the connection details below to identify the failing step. Saved grades are unchanged.",
    500,
    {
      stage,
      kind: ["TypeError", "RangeError", "SyntaxError"].includes(name)
        ? name
        : "Error",
    },
  );
}
export async function atStage<T>(
  stage: HacStage,
  action: () => Promise<T>,
): Promise<T> {
  try {
    return await action();
  } catch (error) {
    throw connectionError(error, stage);
  }
}
