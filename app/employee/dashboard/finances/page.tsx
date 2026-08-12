import { EmployeeModuleGrid } from '@/components/employee/employee-module-grid';

export default function EmployeeFinancesPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-black text-white">Finances</h2>
      <p className="text-sm text-neutral-400">Payslips, tax, expenses, CTC, and ESOP.</p>
      <EmployeeModuleGrid group="Finances" />
    </div>
  );
}
