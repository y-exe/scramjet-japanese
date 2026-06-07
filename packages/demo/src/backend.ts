const rawApiOrigin = import.meta.env.VITE_API_ORIGIN || "";

export const apiOrigin = rawApiOrigin.replace(/\/$/, "");

(
  globalThis as typeof globalThis & { __SCRAMJET_API_ORIGIN?: string }
).__SCRAMJET_API_ORIGIN = apiOrigin;

export function backendUrl(path: string) {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${apiOrigin}${normalizedPath}`;
}
