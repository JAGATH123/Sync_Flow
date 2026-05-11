/**
 * apiFetch — basePath-aware wrapper around the global fetch().
 *
 * Why this exists
 * ────────────────
 * SyncFlow runs under `basePath: '/syncflow'` (see next.config.ts).
 * Next.js automatically prepends that to:
 *    • <Link href="/foo">          → /syncflow/foo
 *    • router.push('/foo')         → /syncflow/foo
 *    • <Image src="/foo.png">      → /syncflow/foo.png
 *
 * BUT NOT to plain fetch() calls. So `fetch('/api/auth/lof-sso')` hits the
 * site root `/api/auth/lof-sso`, NOT `/syncflow/api/auth/lof-sso`. That
 * returns a 404 HTML page → "Unexpected token '<'…" when JSON.parsed.
 *
 * Use apiFetch() everywhere you currently use fetch('/api/...').
 * Anywhere else (absolute URLs, /static/, etc.) is left alone.
 *
 * Server-side this is a no-op.
 */
const BASE_PATH = process.env.NEXT_PUBLIC_BASE_PATH ?? '/syncflow';

/**
 * Auto-inject ?company=<slug> on every /api/ call — mirrors Horilla's
 * CompanyMiddleware which injects company_filter into every ORM queryset.
 */
function injectCompany(url: string): string {
  if (typeof window === 'undefined') return url;
  const slug = localStorage.getItem('lof_selected_company');
  if (!slug) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}company=${encodeURIComponent(slug)}`;
}

export function apiFetch(
  input: string | URL | Request,
  init?: RequestInit
): Promise<Response> {
  if (
    typeof window !== 'undefined' &&
    typeof input === 'string' &&
    input.startsWith('/api/')
  ) {
    return fetch(injectCompany(BASE_PATH + input), init);
  }
  return fetch(input as any, init);
}

/**
 * assetPath — prepends basePath to a public-folder asset path.
 * Use for raw <img src=...>, <a href=...>, background-image:url(...)
 * (Next.js's <Image> handles this automatically.)
 */
export function assetPath(path: string): string {
  if (path.startsWith('/')) return BASE_PATH + path;
  return path;
}
