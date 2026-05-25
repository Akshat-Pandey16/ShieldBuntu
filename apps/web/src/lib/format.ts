const timestampFormatter = new Intl.DateTimeFormat(undefined, {
  year: "numeric",
  month: "short",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const timeFormatter = new Intl.DateTimeFormat(undefined, {
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
});

const relativeFormatter = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });

function parseDate(iso: string | null | undefined): Date | null {
  if (!iso) return null;
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatTimestamp(iso: string | null | undefined): string {
  const d = parseDate(iso);
  return d ? timestampFormatter.format(d) : "—";
}

export function formatTime(iso: string | null | undefined): string {
  const d = parseDate(iso);
  return d ? timeFormatter.format(d) : "—";
}

export function formatDuration(
  startIso: string | null | undefined,
  endIso: string | null | undefined,
): string {
  const start = parseDate(startIso)?.getTime();
  if (start == null) return "—";
  const end = parseDate(endIso)?.getTime() ?? Date.now();
  const ms = Math.max(0, end - start);
  if (ms < 1000) return `${ms}ms`;
  const s = Math.floor(ms / 1000);
  if (s < 60) return `${s}s`;
  const m = Math.floor(s / 60);
  const rs = s % 60;
  if (m < 60) return `${m}m ${rs}s`;
  const h = Math.floor(m / 60);
  return `${h}h ${m % 60}m`;
}

export function formatRelative(iso: string | null | undefined): string {
  const d = parseDate(iso);
  if (!d) return "—";
  const diff = (d.getTime() - Date.now()) / 1000;
  const abs = Math.abs(diff);
  if (abs < 60) return relativeFormatter.format(Math.round(diff), "second");
  if (abs < 3600) return relativeFormatter.format(Math.round(diff / 60), "minute");
  if (abs < 86400) return relativeFormatter.format(Math.round(diff / 3600), "hour");
  if (abs < 604800) return relativeFormatter.format(Math.round(diff / 86400), "day");
  return timestampFormatter.format(d);
}

export function titleCase(s: string): string {
  if (!s) return s;
  return s[0]!.toUpperCase() + s.slice(1).replace(/_/g, " ");
}

export function shortId(uuid: string | null | undefined): string {
  if (!uuid) return "";
  return uuid.split("-")[0] ?? uuid.slice(0, 8);
}
