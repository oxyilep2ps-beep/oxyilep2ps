import { EmployeeModuleGrid } from '@/components/employee/employee-module-grid';

export default function EmployeeRewardsPage() {
  return (
    <div className="space-y-4">
      <h2 className="text-lg font-black text-white">Gamification</h2>
      <p className="text-sm text-neutral-400">OxyCoins, shoutouts, badges, and leaderboard.</p>
      <EmployeeModuleGrid group="Gamification" />
    </div>
  );
}
