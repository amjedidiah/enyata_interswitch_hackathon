const ISO_8601_DATETIME_REGEX =
  /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/;

export function isIso8601DateTime(value: unknown): value is string {
  if (typeof value !== "string") return false;
  if (!ISO_8601_DATETIME_REGEX.test(value)) return false;
  const d = new Date(value);
  return !Number.isNaN(d.getTime());
}

export function formatIsoDateTime(value: string): string {
  if (!isIso8601DateTime(value)) return value;
  const d = new Date(value);
  return new Intl.DateTimeFormat("en-NG", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}
