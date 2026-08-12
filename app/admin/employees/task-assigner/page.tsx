import { redirect } from 'next/navigation';

export default function AdminTaskAssignerRedirect() {
  redirect('/admin-dashboard/employees/task-assigner');
}
