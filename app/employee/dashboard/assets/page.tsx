import { EmployeeModuleGrid } from '@/components/employee/employee-module-grid';

export default function EmployeeAssetsPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-black text-white">Assets & IT</h2>
      <p className="text-sm text-neutral-400">Devices, licenses, tickets, and hardware health.</p>
      <EmployeeModuleGrid group="Assets & IT" />
    </div>
  );
}
