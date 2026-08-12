import { EmployeeModuleGrid } from '@/components/employee/employee-module-grid';

export default function EmployeeCulturePage() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-black text-white">Wellbeing & Culture</h2>
      <p className="text-sm text-neutral-400">Mood, suggestions, wiki, celebrations, org chart.</p>
      <EmployeeModuleGrid group="Culture" />
    </div>
  );
}
