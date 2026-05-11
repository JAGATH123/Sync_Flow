'use client';

/**
 * SyncFlow SSO callback page.
 *
 * Flow
 * â”€â”€â”€â”€
 *   1. LOF Portal redirects user here with `?lof_token=<jwt>`
 *   2. We POST that token to /api/auth/lof-sso
 *   3. The route validates the token with the platform backend
 *      (http://localhost:8000/auth/me) and returns a SyncFlow JWT + user
 *   4. We store both and redirect to /syncflow (the dashboard root)
 *
 * On any failure we bounce back to the Portal with an error flag so the
 * user gets a single consistent sign-in surface.
 */

import { useEffect, useState } from 'react';
import { Loader2, AlertCircle } from 'lucide-react';
import { apiFetch } from '@/lib/api/fetch';

const PORTAL_URL =
  process.env.NEXT_PUBLIC_PORTAL_URL ?? 'http://localhost:3001';

export default function SsoCallbackPage() {
  const [status, setStatus] = useState<'exchanging' | 'error'>('exchanging');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    void exchange();
  }, []);

  async function exchange() {
    try {
      const url = new URL(window.location.href);
      const lofToken =
        url.searchParams.get('lof_token') ||
        localStorage.getItem('lof-portal-token');

      if (!lofToken) {
        return bounceToPortal();
      }

      // Stash the LOF token for reference (debugging / cross-app)
      localStorage.setItem('lof-portal-token', lofToken);

      // Trade the LOF token for a SyncFlow JWT.
      // Use apiFetch so basePath (/syncflow) is included.
      const res = await apiFetch('/api/auth/lof-sso', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ lof_token: lofToken }),
      });

      const data = await res.json();

      if (!res.ok || !data?.success) {
        const msg =
          data?.error || `SSO exchange failed (HTTP ${res.status}).`;
        console.error('[SSO]', msg);
        setError(msg);
        setStatus('error');
        setTimeout(bounceToPortal, 2500);
        return;
      }

      // Persist the SyncFlow token + user, exactly like AuthContext expects.
      localStorage.setItem('token', data.token);
      if (data.user) {
        localStorage.setItem('user', JSON.stringify(data.user));
      }

      // Strip query params and land on the dashboard
      window.location.replace('/syncflow');
    } catch (e: any) {
      console.error('[SSO] exception', e);
      setError(e?.message ?? 'Network error during SSO');
      setStatus('error');
      setTimeout(bounceToPortal, 2500);
    }
  }

  function bounceToPortal() {
    window.location.replace(`${PORTAL_URL}?error=syncflow_sso_failed`);
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-3 max-w-sm">
        {status === 'exchanging' && (
          <>
            <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
            <p className="text-sm text-muted-foreground font-medium">
              Signing you in&hellip;
            </p>
            <p className="text-xs text-muted-foreground">
              Validating your LOF Portal session.
            </p>
          </>
        )}
        {status === 'error' && (
          <>
            <AlertCircle className="h-10 w-10 text-destructive mx-auto" />
            <p className="text-sm font-semibold">Session expired</p>
            <p className="text-xs text-muted-foreground">{error}</p>
            <p className="text-xs text-muted-foreground">
              Returning you to the LOF Portal&hellip;
            </p>
          </>
        )}
      </div>
    </div>
  );
}
