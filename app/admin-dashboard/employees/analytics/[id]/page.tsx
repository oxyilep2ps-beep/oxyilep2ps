import { AdminEmployeeAnalytics } from '@/components/admin/admin-employee-analytics';

export default async function AdminEmployeeAnalyticsPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <AdminEmployeeAnalytics employeeId={id} />;
}
