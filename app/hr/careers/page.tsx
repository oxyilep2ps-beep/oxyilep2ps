import { listJobApplications } from '@/app/actions/admin-careers';

export default async function HrCareersPage() {
  const applications = await listJobApplications().catch(() => []);

  return (
    <div className="space-y-4">
      <h2 className="text-xl font-black text-neutral-950 dark:text-white">Career Applications</h2>
      {applications.length === 0 ? (
        <p className="text-sm text-neutral-500">No applications yet.</p>
      ) : (
        <ul className="space-y-3">
          {applications.map((app) => (
            <li key={app.id} className="glass-card rounded-2xl p-4">
              <p className="font-bold">{app.full_name}</p>
              <p className="text-sm text-neutral-500">{app.email}</p>
              <p className="text-sm">Role: {app.role_applied}</p>
              <p className="text-xs text-neutral-400">{new Date(app.created_at).toLocaleString('en-GB')}</p>
              {app.resume_url && (
                <a href={app.resume_url} target="_blank" rel="noreferrer" className="mt-2 inline-block text-sm font-semibold text-brand-600">
                  View Resume
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
