'use client';

import { ArrowLeft, Home, LayoutGrid } from 'lucide-react';
import CompanySwitcher from '@/components/layout/company-switcher';
import { SidebarTrigger } from '@/components/ui/sidebar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import Clock from '@/components/layout/clock';
import LiveUsersIndicator from '@/components/layout/live-users-indicator';
import Notifications from '@/components/layout/notifications';
import UserMenu from '@/components/layout/user-menu';
import { cn } from '@/lib/utils';

/* ──────────────────────────────────────────────────────────────────────────
   TopNavbar — shared across admin / user / client dashboards.
   Modeled on Horilla's `oh-navbar`.

   Layout:
     [☰]  [←]  [🏠]  SyncFlow › <view>          🕐  🟢👥  ⊞  🔔  👤 Name ▾

   Drop into a SidebarInset's main content, just above the page body.
   ────────────────────────────────────────────────────────────────────────── */

interface TopNavbarProps {
  /** Display label for the active view (e.g. "Overview", "Task Management"). */
  viewLabel: string;
  /** Click handler for the ← back button. */
  onBack: () => void;
  /** Disable ← when there's no history. */
  canGoBack: boolean;
  /** Click handler for the 🏠 home button (jump to overview). */
  onHome: () => void;
  /** Disable 🏠 when already on overview. */
  isOnOverview: boolean;
  /** Show the live-users dot/avatars (admin only, on overview/dashboard). */
  showLiveIndicator?: boolean;
  /** Brand text in the breadcrumb. Defaults to 'SyncFlow'. */
  brandLabel?: string;
  /** Current user role — passed to CompanySwitcher to show "All Companies" for admins only. */
  userRole?: string;
}

/** Append ?lof_token= so the destination app can SSO straight in. */
function withLofToken(base: string): string {
  if (typeof window === 'undefined') return base;
  const token =
    localStorage.getItem('lof-portal-token') ||
    localStorage.getItem('lof_token');
  if (!token) return base;
  try {
    const url = new URL(base);
    url.searchParams.set('lof_token', token);
    return url.toString();
  } catch {
    return base + (base.includes('?') ? '&' : '?') + 'lof_token=' + encodeURIComponent(token);
  }
}

export default function TopNavbar({
  viewLabel,
  onBack,
  canGoBack,
  onHome,
  isOnOverview,
  showLiveIndicator = false,
  brandLabel = 'SyncFlow',
  userRole = 'user',
}: TopNavbarProps) {
  const portalUrl    = process.env.NEXT_PUBLIC_PORTAL_URL    ?? 'http://localhost:3001';
  const feedbackUrl  = process.env.NEXT_PUBLIC_FEEDBACK_URL  ?? 'http://localhost:3002/feedback';
  const timesheetUrl = process.env.NEXT_PUBLIC_TIMESHEET_URL ?? 'http://localhost:9002/timesheet';
  const hrUrl        = process.env.NEXT_PUBLIC_HR_URL        ?? 'http://localhost:8080';

  return (
    <nav
      className={cn(
        // Match Horilla's oh-navbar: white bg, 3px grey border-bottom, h-16, sticky.
        'sticky top-0 z-30 flex h-16 items-center justify-between',
        'bg-card border-b-[3px] border-border',
        'px-4 md:px-6 gap-3'
      )}
    >
      {/* ── LEFT: hamburger + back/home + breadcrumb ── */}
      <div className="flex items-center gap-2 md:gap-3 min-w-0">
        <SidebarTrigger />

        <div className="flex items-center gap-1">
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={onBack}
            disabled={!canGoBack}
            title="Back"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="icon"
            className="h-8 w-8"
            onClick={onHome}
            disabled={isOnOverview}
            title="Overview"
          >
            <Home className="h-4 w-4" />
          </Button>
        </div>

        <div className="flex items-center gap-1.5 text-sm min-w-0 ml-1">
          <span className="font-semibold text-foreground hidden sm:inline">{brandLabel}</span>
          <span className="text-muted-foreground hidden sm:inline">›</span>
          <span className="font-medium text-foreground truncate">{viewLabel}</span>
        </div>
      </div>

      {/* ── RIGHT: clock + live + app switcher + notifications + profile ── */}
      <div className="flex items-center gap-2 md:gap-3">
        <div className="hidden lg:block">
          <Clock />
        </div>

        {showLiveIndicator && (
          <div className="hidden md:block">
            <LiveUsersIndicator />
          </div>
        )}

        {/* Company Switcher — same as Horilla's business-icon dropdown */}
        <CompanySwitcher userRole={userRole} />

        {/* LOF App Switcher */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="icon"
              className="h-9 w-9"
              title="Switch LOF App"
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44">
            <DropdownMenuLabel className="text-xs tracking-widest text-muted-foreground uppercase py-1">
              LOF Apps
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href="#" onClick={e => { e.preventDefault(); window.location.href = withLofToken(feedbackUrl); }}>Feedback</a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href="#" onClick={e => { e.preventDefault(); window.location.href = withLofToken(timesheetUrl); }}>TimeWise</a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href={hrUrl}>HR</a>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <a href={`${portalUrl}/agent-dashboard`}>Agent Dashboard</a>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <a href={portalUrl} className="font-semibold text-primary">
                &larr; Portal
              </a>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Notifications />
        <UserMenu />
      </div>
    </nav>
  );
}
