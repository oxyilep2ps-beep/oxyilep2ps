import { redirect } from 'next/navigation';

export default function InvestorDashboardRedirect() {
  redirect('/dashboard/profile');
}
