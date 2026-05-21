import { redirect } from 'next/navigation';

export default function BorrowerDashboardRedirect() {
  redirect('/dashboard/profile');
}
