const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000";

export function resolveReceiptUrl(url: string | null | undefined): string | null {
  if (!url) return null;
  if (url.startsWith("http")) return url;
  const base = API_URL.replace(/\/$/, "");
  const path = url.startsWith("/") ? url : `/${url}`;
  return `${base}${path}`;
}
