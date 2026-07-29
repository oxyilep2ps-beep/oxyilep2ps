export default function HrSettingsPage() {
  return (
    <div className="glass-card cms-fade-in rounded-2xl p-6">
      <h2 className="text-xl font-black">HR Settings</h2>
      <p className="mt-2 text-sm text-neutral-600 dark:text-neutral-300">
        Staff profile, notifications, and directory sync use your Oxyile account. Currency is locked to £ GBP for
        all payroll, expenses, offers, and executive widgets.
      </p>
      <ul className="mt-4 list-disc space-y-1 pl-5 text-sm text-neutral-600 dark:text-neutral-300">
        <li>Apply migration <code>20250729120000_add_enterprise_hr_portal_suite.sql</code> on Supabase.</li>
        <li>Admin executives review headcount at <code>/admin-dashboard/hr-overview</code>.</li>
        <li>Public careers can later sync open & budget-approved jobs from ATS.</li>
      </ul>
    </div>
  );
}
