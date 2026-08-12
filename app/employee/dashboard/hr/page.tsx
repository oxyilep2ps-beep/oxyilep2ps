import { EmployeeModuleGrid } from '@/components/employee/employee-module-grid';

export default function EmployeeHrPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-black text-white">HR & Leaves</h2>
      <p className="text-sm text-neutral-400">Leave, attendance, and manager approval workflows.</p>
      <EmployeeModuleGrid group="HR & Leaves" />
    </div>
  );
}
