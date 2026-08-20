import { redirect } from 'next/navigation';

/** Alias for Epic path — canonical UI lives under /admin-dashboard/verifications. */
export default function AdminVerificationsAliasPage() {
  redirect('/admin-dashboard/verifications');
}
