'use client';

/**
 * CompanySwitcher — SyncFlow equivalent of Horilla's company_selection.html
 *
 * Horilla:  request.session["selected_company"] → CompanyMiddleware injects
 *           company_filter Q object into every ORM queryset.
 *
 * SyncFlow: localStorage["lof_selected_company"] → apiFetch auto-appends
 *           ?company=<slug> to every /api/ call → each route applies filter.
 *
 * Same UX: business icon in navbar, dropdown with all companies,
 * checkmark on active, "All Companies" option for admins.
 */

import { useEffect, useRef, useState } from 'react';
import { Building2, Check, ChevronDown } from 'lucide-react';
import { getSelectedCompany, setSelectedCompany } from '@/lib/company-filter';

interface Company {
  id:        string;
  name:      string;
  slug:      string;
  parent_id: string | null;
}

const LOF_API = process.env.NEXT_PUBLIC_LOF_API_URL ?? 'http://localhost:8000';

interface Props {
  userRole: string;
}

export default function CompanySwitcher({ userRole }: Props) {
  const [companies, setCompanies]     = useState<Company[]>([]);
  const [selected,  setSelected]      = useState<string | null>(getSelectedCompany);
  const [open,      setOpen]          = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Fetch companies from LOF Platform API (same source as Portal)
  useEffect(() => {
    const token = localStorage.getItem('lof-portal-token');
    if (!token) return;
    fetch(`${LOF_API}/companies?flat=true`, {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then(r => r.json())
      .then(d => setCompanies(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, []);

  // Close on outside click (Horilla uses @click.outside via Alpine.js)
  useEffect(() => {
    function handler(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  if (companies.length === 0) return null;

  function handleSwitch(slug: string | null) {
    setSelectedCompany(slug);
    setSelected(slug);
    setOpen(false);
    // Reload like Horilla redirects after session update
    window.location.reload();
  }

  const activeCompany = companies.find(c => c.slug === selected);
  const isAdmin = userRole === 'admin';

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* Trigger — matches Horilla's oh-navbar__action-icons */}
      <button
        onClick={() => setOpen(o => !o)}
        title="Switch Company"
        style={{
          display:        'flex',
          alignItems:     'center',
          gap:            6,
          padding:        '6px 12px',
          border:         '1.5px solid hsl(var(--border))',
          borderRadius:   6,
          background:     selected ? 'hsl(var(--accent))' : 'transparent',
          color:          'hsl(var(--foreground))',
          fontSize:       '0.72rem',
          fontWeight:     700,
          letterSpacing:  '0.08em',
          textTransform:  'uppercase',
          cursor:         'pointer',
          whiteSpace:     'nowrap',
        }}
      >
        <Building2 size={14} />
        {activeCompany ? activeCompany.name : 'All Companies'}
        <ChevronDown size={12} />
      </button>

      {/* Dropdown — same structure as Horilla's oh-dropdown__menu */}
      {open && (
        <div
          style={{
            position:     'absolute',
            top:          'calc(100% + 6px)',
            right:        0,
            minWidth:     180,
            background:   'hsl(var(--card))',
            border:       '1.5px solid hsl(var(--border))',
            borderRadius: 8,
            boxShadow:    '0 8px 24px rgba(0,0,0,0.14)',
            zIndex:       200,
            overflow:     'hidden',
          }}
        >
          {/* Label */}
          <div style={{
            padding:       '8px 14px 6px',
            fontSize:      '0.6rem',
            fontWeight:    700,
            letterSpacing: '0.2em',
            textTransform: 'uppercase',
            color:         'hsl(var(--muted-foreground))',
            borderBottom:  '1px solid hsl(var(--border))',
          }}>
            Companies
          </div>

          {/* "All Companies" — admin only, same as Horilla's "All Company" option */}
          {isAdmin && (
            <button
              onClick={() => handleSwitch(null)}
              style={{
                width:         '100%',
                textAlign:     'left',
                padding:       '9px 14px',
                fontSize:      '0.78rem',
                fontWeight:    !selected ? 700 : 400,
                color:         !selected ? 'hsl(var(--primary))' : 'hsl(var(--foreground))',
                background:    !selected ? 'hsl(var(--accent))' : 'transparent',
                border:        'none',
                borderBottom:  '1px solid hsl(var(--border))',
                cursor:        'pointer',
                display:       'flex',
                alignItems:    'center',
                gap:           8,
              }}
            >
              {!selected && <Check size={13} color="#059669" />}
              {selected && <span style={{ width: 13, display: 'inline-block' }} />}
              All Companies
            </button>
          )}

          {/* Company list */}
          {companies.map(c => (
            <button
              key={c.id}
              onClick={() => handleSwitch(c.slug)}
              style={{
                width:        '100%',
                textAlign:    'left',
                padding:      '9px 14px',
                fontSize:     '0.78rem',
                fontWeight:   selected === c.slug ? 700 : 400,
                color:        selected === c.slug ? 'hsl(var(--primary))' : 'hsl(var(--foreground))',
                background:   selected === c.slug ? 'hsl(var(--accent))' : 'transparent',
                border:       'none',
                borderBottom: '1px solid hsl(var(--border))',
                cursor:       'pointer',
                display:      'flex',
                alignItems:   'center',
                gap:          8,
              }}
            >
              {selected === c.slug
                ? <Check size={13} color="#059669" />
                : <span style={{ width: 13, display: 'inline-block' }} />
              }
              {c.parent_id && (
                <span style={{ color: 'hsl(var(--muted-foreground))', fontSize: '0.65rem' }}>└</span>
              )}
              {c.name}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
