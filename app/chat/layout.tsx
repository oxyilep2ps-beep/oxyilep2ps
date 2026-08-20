import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { UniversalDashboardLayout, type PortalId } from '@/components/shared/universal-dashboard-layout';
import {
  ACTIVE_PORTAL_COOKIE,
  defaultPortalForRole,
  isValidPortalId,
  resolveFinancialCapabilities,
} from '@/lib/auth/financial-capabilities';

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect('/signin?redirect=/chat');

  const { data: profile } = await supabase
    .from('profiles')
    .select('role, is_investor, is_borrower')
    .eq('id', user.id)
    .maybeSingle();

  const role = String(profile?.role ?? '');
  const isAdmin = role === 'ADMIN';
  const caps = resolveFinancialCapabilities(profile);
  const cookieStore = await cookies();
  const cookiePortalRaw = cookieStore.get(ACTIVE_PORTAL_COOKIE)?.value ?? null;
  const cookiePortal = isValidPortalId(cookiePortalRaw) ? cookiePortalRaw : null;

  let portal: PortalId = defaultPortalForRole(role);
  if (cookiePortal === 'investor' && (isAdmin || caps.is_investor)) portal = 'investor';
  else if (cookiePortal === 'borrower' && (isAdmin || caps.is_borrower)) portal = 'borrower';
  else if (cookiePortal && isAdmin) portal = cookiePortal;

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
