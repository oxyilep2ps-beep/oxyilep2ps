import { redirect } from 'next/navigation';

/** Legacy alias → admin-dashboard employees hub */
export default function AdminEmployeesRedirect() {
  redirect('/admin-dashboard/employees');
}
