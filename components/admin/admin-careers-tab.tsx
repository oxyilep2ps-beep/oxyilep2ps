'use client';

import { useCallback, useEffect, useState } from 'react';
import { Briefcase, ExternalLink, Loader2 } from 'lucide-react';
import { listJobApplications, type JobApplicationRow } from '@/app/actions/admin-careers';

export function AdminCareersTab() {
  const [rows, setRows] = useState<JobApplicationRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setRows(await listJobApplications());
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load applications');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="w-full min-w-0 space-y-6 overflow-x-auto">
      <div>
        <h2 className="text-xl font-black text-neutral-950 dark:text-white">Careers pipeline</h2>
        <p className="mt-1 text-sm text-neutral-600 dark:text-neutral-300">
          Incoming applications from the public careers page.
        </p>
      </div>

      {error && <p className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}

      {loading ? (
        <div className="flex justify-center py-12">
          <Loader2 className="animate-spin text-brand-500" size={28} />
        </div>
      ) : rows.length === 0 ? (
        <div className="glass-card rounded-2xl p-8 text-center">
          <Briefcase className="mx-auto text-brand-500" size={36} />
          <p className="mt-3 text-sm text-neutral-500">No applications yet.</p>
        </div>
      ) : (
        <ul className="space-y-3">
          {rows.map((row) => (
            <li key={row.id} className="glass-card rounded-2xl p-4">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-bold text-neutral-950 dark:text-white">{row.full_name}</p>
                  <p className="text-sm text-neutral-600">{row.role_applied}</p>
                  <p className="mt-1 text-xs text-neutral-500">
                    {row.email} · {row.phone}
                  </p>
                  <p className="mt-1 text-xs text-neutral-400">
                    {new Date(row.created_at).toLocaleString('en-GB')}
                  </p>
                </div>
                <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-bold text-amber-800">
                  {row.status}
                </span>
              </div>
              {row.resume_url && (
                <a
                  href={row.resume_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-3 inline-flex items-center gap-1 text-sm font-semibold text-brand-600"
                >
                  View Resume <ExternalLink size={14} />
                </a>
              )}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
