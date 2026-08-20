import { headers, cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { getServerProfile } from '@/lib/auth/get-server-profile';
import { isApprovedStatus } from '@/lib/auth/profile-status';
import { getAuthRedirectPath } from '@/lib/auth/routing';
import {
  ACTIVE_PORTAL_COOKIE,
  defaultPortalForRole,
  isValidPortalId,
  resolveFinancialCapabilities,
} from '@/lib/auth/financial-capabilities';
import { resolveViewAsPortal } from '@/lib/admin/view-as-portals';
import { DashboardShell } from '@/components/dashboard/dashboard-shell';
import { UniversalDashboardLayout, type PortalId } from '@/components/shared/universal-dashboard-layout';

export default async function DashboardGroupLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect('/signin');
  }

  const profile = await getServerProfile(supabase, user.id);

  // Missing profile must NEVER bounce confirmed users back to /signup.
  // Send them to pending-verification (or sign-in) so email confirm works.
  if (!profile) {
    redirect('/pending-verification?confirmed=1');
  }

  const headerStore = await headers();
  const pathname = headerStore.get('x-pathname') ?? '';
  const isPendingRoute = pathname === '/pending-verification' || pathname.startsWith('/pending-verification/');
  const isDashboardRoute =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/chats') ||
    pathname.startsWith('/chat') ||
    pathname.startsWith('/feed') ||
    pathname.startsWith('/user/') ||
    pathname.startsWith('/upgrade/');

  const email = user.email ?? profile.email ?? '';
  const caps = resolveFinancialCapabilities(profile);
  const cookieStore = await cookies();
  const cookiePortalRaw = cookieStore.get(ACTIVE_PORTAL_COOKIE)?.value ?? null;
  const cookiePortal = isValidPortalId(cookiePortalRaw) ? cookiePortalRaw : null;
  const isAdmin = String(profile.role) === 'ADMIN';

  if (isApprovedStatus(profile.status)) {
    if (isPendingRoute) {
      redirect(getAuthRedirectPath(profile, email));
    }

    // Preserve role-specific dashboards for core platform roles.
    const isRootDashboard = pathname === '/dashboard';
    if (isRootDashboard) {
      if (profile.role === 'BORROWER' || profile.role === 'INVESTOR') redirect('/chat');
      redirect('/feed');
    }

    let portal: PortalId | null = defaultPortalForRole(profile.role);
    const pathPortal = resolveViewAsPortal(pathname) as PortalId;

    if (pathname.startsWith('/upgrade/')) {
      portal = caps.is_borrower || isAdmin ? 'borrower' : portal;
    } else if (pathPortal === 'investor' && (isAdmin || caps.is_investor)) {
      portal = 'investor';
    } else if (pathPortal === 'borrower' && (isAdmin || caps.is_borrower)) {
      portal = 'borrower';
    } else if (isAdmin && pathPortal !== 'admin') {
      portal = pathPortal;
    } else if (
      cookiePortal &&
      (pathname.startsWith('/chat') || pathname.startsWith('/feed') || pathname.startsWith('/chats'))
    ) {
      if (cookiePortal === 'investor' && (isAdmin || caps.is_investor)) portal = 'investor';
      else if (cookiePortal === 'borrower' && (isAdmin || caps.is_borrower)) portal = 'borrower';
      else if (isAdmin) portal = cookiePortal;
    }

    if (portal) {
      return (
        <UniversalDashboardLayout
          portal={portal}
          isAdmin={isAdmin}
          isInvestor={caps.is_investor || isAdmin}
          isBorrower={caps.is_borrower || isAdmin}
        >
          {children}
        </UniversalDashboardLayout>
      );
    }

    return <DashboardShell>{children}</DashboardShell>;
  }

  if (isDashboardRoute && !isPendingRoute) {
    redirect('/pending-verification');
  }

  return (
    <div className="relative min-h-[calc(100dvh-4rem)] bg-transparent">
      {children}
    </div>
  );
}
