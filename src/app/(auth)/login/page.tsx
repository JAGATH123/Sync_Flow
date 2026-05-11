'use client';

/**
 * SyncFlow login page — global SSO via the LOF Portal.
 *
 * SyncFlow does NOT have its own login form. Authentication is centralized:
 * the LOF Portal (http://localhost:3001) issues the JWT, then redirects the
 * user to /syncflow/sso?lof_token=... where we validate and start a session.
 *
 * If a user lands on /syncflow/login directly:
 *   • already signed in → bounce to /syncflow (dashboard)
 *   • not signed in     → bounce to the Portal
 */

import { useEffect } from 'react';
import { Loader2 } from 'lucide-react';

export default function LoginPage() {
  useEffect(() => {
    // If a SyncFlow JWT exists, the user is already signed in — go to dashboard.
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        window.location.replace('/syncflow');
        return;
      }
    }

    // Otherwise hand off to the LOF Portal — it's the only login surface.
    const portalUrl =
      process.env.NEXT_PUBLIC_PORTAL_URL ?? 'http://localhost:3001';
    window.location.replace(portalUrl);
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary mx-auto" />
        <p className="text-sm text-muted-foreground font-medium">
          Redirecting to LOF Portal&hellip;
        </p>
        <p className="text-xs text-muted-foreground">
          SyncFlow uses single sign-on through the LOF Internal Portal.
        </p>
      </div>
    </div>
  );
}
