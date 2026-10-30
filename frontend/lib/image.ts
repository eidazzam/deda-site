/**
 * Detects images we host ourselves (under /uploads/) so the storefront
 * can pass `unoptimized` to next/image and skip the /_next/image proxy.
 *
 * The proxy runs inside the web container and tries to fetch the source
 * over HTTP from its own origin — but Nginx is what actually serves
 * /uploads, and the web container can't reach Nginx from inside. Plus
 * sharp already re-encoded these as WebP server-side at upload time, so
 * the optimization step has nothing left to do.
 */
export function isLocalUpload(url: string | null | undefined): boolean {
  if (!url) return false;
  return url.startsWith('/uploads/') || url.includes('/uploads/');
}

/**
 * Resolves a possibly-relative image URL into an absolute one. Used for
 * images that come back from the API as `/uploads/...` — on the same
 * origin as the storefront (dedawomenswear.shop) Nginx serves them directly,
 * but Cloudflare Pages doesn't, so we prefix with the API base. Full
 * URLs (http/https) pass through untouched.
 */
const API_BASE =
  process.env.NEXT_PUBLIC_API_URL?.replace(/\/$/, '') ?? 'https://api.dedawomenswear.shop';

export function resolveImageUrl(url: string): string {
  if (!url) return url;
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  if (url.startsWith('/uploads/')) return `${API_BASE}${url}`;
  return url;
}
