/**
 * Company filter helpers — SyncFlow equivalent of Horilla's CompanyMiddleware.
 *
 * Horilla injects a company_filter Q object into every ORM manager via
 * Django session. Here we do the same via localStorage → query param →
 * API route filter.
 *
 * Storage key: localStorage['lof_selected_company'] = slug | null
 * Query param:  ?company=<slug>   (or omitted / "all" = no filter)
 */

const COMPANY_KEY = 'lof_selected_company';

/**
 * Vertex values each company slug maps to in Task / Project / Broadcast.
 *
 * Hierarchy rule (mirrors Horilla's parent-company include):
 *   Selecting a PARENT includes all its children's data.
 *   Selecting a CHILD shows only that child's data.
 *
 *   TRG (parent)
 *    └── LOF (child of TRG)
 *
 * Data created under LOF stays tagged 'LOF' — the vertex never changes.
 * The filter simply widens the IN clause when the parent is selected.
 */
const SLUG_TO_VERTEX: Record<string, string[]> = {
  trg:  ['TRG', 'LOF', 'LOF Curriculum'],  // TRG parent → includes LOF children
  lof:  ['LOF', 'LOF Curriculum'],          // LOF only
  cmis: ['CMIS'],
  tri:  ['TRI'],
};

// ── Client-side helpers ────────────────────────────────────────────────────────

export function getSelectedCompany(): string | null {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem(COMPANY_KEY);
}

export function setSelectedCompany(slug: string | null): void {
  if (typeof window === 'undefined') return;
  if (slug && slug !== 'all') {
    localStorage.setItem(COMPANY_KEY, slug);
  } else {
    localStorage.removeItem(COMPANY_KEY);
  }
}

// ── Server-side Prisma where-clause builders ───────────────────────────────────

/**
 * Returns a Prisma `where` fragment for User / User-scoped models.
 * Filters by companyId if a specific company is selected.
 */
export function userCompanyWhere(slug: string | null | undefined): Record<string, unknown> {
  if (!slug || slug === 'all') return {};
  return { companyId: slug };
}

/**
 * Returns a Prisma `where` fragment for Task / Project / Broadcast.
 * Maps the company slug to one or more vertex strings.
 * Matches Horilla's approach: Q(company_id=company_id) | Q(company_id__isnull=True).
 * We include null/empty vertex records so globally-shared records stay visible.
 */
export function vertexCompanyWhere(slug: string | null | undefined): Record<string, unknown> {
  if (!slug || slug === 'all') return {};
  const vertices = SLUG_TO_VERTEX[slug.toLowerCase()];
  if (!vertices || vertices.length === 0) return {};
  // Tasks/Projects with a matching vertex OR no vertex (shared/unassigned)
  return {
    OR: [
      { vertex: { in: vertices } },
      { vertex: null },
      { vertex: '' },
    ],
  };
}

/**
 * Given a URL string, append ?company=<slug> if a company is selected.
 * Used by apiFetch to auto-inject the filter on every API call.
 */
export function withCompanyParam(url: string): string {
  const slug = getSelectedCompany();
  if (!slug) return url;
  const sep = url.includes('?') ? '&' : '?';
  return `${url}${sep}company=${encodeURIComponent(slug)}`;
}
