export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly body: unknown,
  ) {
    super(`API request failed with status ${status}`);
  }
}

export async function parseResponse<T>(res: Response): Promise<T> {
  const body: unknown = res.status === 204 ? undefined : await res.json().catch(() => undefined);
  if (!res.ok) {
    throw new ApiError(res.status, body);
  }
  return body as T;
}

export type FormErrors = { fields: Record<string, string>; form?: string };

export const FALLBACK_ERROR = "Something went wrong. Please try again.";

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

export function firstMessage(value: unknown): string | undefined {
  if (typeof value === "string") return value;
  const items = Array.isArray(value) ? value : value && typeof value === "object" ? Object.values(value) : [];
  for (const item of items) {
    const message = firstMessage(item);
    if (message) return message;
  }
  return undefined;
}

export function toFormErrors(error: unknown): FormErrors {
  if (!(error instanceof ApiError) || !isRecord(error.body)) {
    return { fields: {}, form: FALLBACK_ERROR };
  }
  const fields: Record<string, string> = {};
  let form: string | undefined;
  for (const [key, value] of Object.entries(error.body)) {
    const message = firstMessage(value) ?? FALLBACK_ERROR;
    if (key === "detail" || key === "non_field_errors") {
      form = message;
    } else {
      fields[key] = message;
    }
  }
  return { fields, form };
}
